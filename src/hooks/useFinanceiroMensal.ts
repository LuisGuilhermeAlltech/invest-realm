import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FinanceiroMensal {
  id: string;
  user_id: string;
  ano: number;
  mes: number;
  observacao: string | null;
  total_receitas: number;
  total_gastos: number;
  saldo_mes: number;
  saldo_acumulado: number;
}

export interface Receita {
  id: string;
  financeiro_mensal_id: string;
  user_id: string;
  descricao: string;
  valor: number;
}

export interface Gasto {
  id: string;
  financeiro_mensal_id: string;
  user_id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  subcategoria_id: string | null;
}

export function useFinanceiroMensal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: meses, isLoading } = useQuery({
    queryKey: ['financeiro-mensal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_financeiro_mensal_acumulado')
        .select('*')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });
      
      if (error) throw error;
      return data as FinanceiroMensal[];
    },
    enabled: !!user,
  });

  const createMes = useMutation({
    mutationFn: async ({ ano, mes, observacao }: { ano: number; mes: number; observacao?: string }) => {
      const { data, error } = await supabase
        .from('financeiro_mensal')
        .insert({ user_id: user!.id, ano, mes, observacao })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      toast({ title: 'Mês criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar mês', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMes = useMutation({
    mutationFn: async (id: string) => {
      const mesAtual = meses?.find(m => m.id === id);
      if (!mesAtual) throw new Error('Mês não encontrado');
      
      const mesPosterior = meses?.find(
        m => (m.ano > mesAtual.ano) || (m.ano === mesAtual.ano && m.mes > mesAtual.mes)
      );
      
      if (mesPosterior) {
        throw new Error('Só é possível excluir o último mês cadastrado para proteger o saldo acumulado');
      }

      const { error } = await supabase
        .from('financeiro_mensal')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      toast({ title: 'Mês excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir mês', description: error.message, variant: 'destructive' });
    },
  });

  const canDeleteMes = (id: string) => {
    const mesAtual = meses?.find(m => m.id === id);
    if (!mesAtual) return false;
    const mesPosterior = meses?.find(
      m => (m.ano > mesAtual.ano) || (m.ano === mesAtual.ano && m.mes > mesAtual.mes)
    );
    return !mesPosterior;
  };

  return {
    meses,
    isLoading,
    createMes: createMes.mutate,
    deleteMes: deleteMes.mutate,
    canDeleteMes,
  };
}

export function useFinanceiroDetalhe(financeiroMensalId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: receitas, isLoading: loadingReceitas } = useQuery({
    queryKey: ['financeiro-receitas', financeiroMensalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_receitas')
        .select('*')
        .eq('financeiro_mensal_id', financeiroMensalId!)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Receita[];
    },
    enabled: !!user && !!financeiroMensalId,
  });

  const { data: gastos, isLoading: loadingGastos } = useQuery({
    queryKey: ['financeiro-gastos', financeiroMensalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_gastos')
        .select('*')
        .eq('financeiro_mensal_id', financeiroMensalId!)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Gasto[];
    },
    enabled: !!user && !!financeiroMensalId,
  });

  const addReceita = useMutation({
    mutationFn: async ({ descricao, valor }: { descricao: string; valor: number }) => {
      const { error } = await supabase
        .from('financeiro_receitas')
        .insert({ 
          user_id: user!.id, 
          financeiro_mensal_id: financeiroMensalId!, 
          descricao, 
          valor 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-receitas', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      toast({ title: 'Receita adicionada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar receita', description: error.message, variant: 'destructive' });
    },
  });

  const addGasto = useMutation({
    mutationFn: async ({ descricao, valor, categoria_id, subcategoria_id }: { descricao: string; valor: number; categoria_id: string; subcategoria_id?: string | null }) => {
      const { error } = await supabase
        .from('financeiro_gastos')
        .insert({ 
          user_id: user!.id, 
          financeiro_mensal_id: financeiroMensalId!, 
          descricao, 
          valor,
          categoria_id,
          subcategoria_id: subcategoria_id || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-gastos', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-tipo', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mes-categoria'] });
      toast({ title: 'Gasto adicionado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar gasto', description: error.message, variant: 'destructive' });
    },
  });

  const updateReceita = useMutation({
    mutationFn: async ({ id, descricao, valor }: { id: string; descricao: string; valor: number }) => {
      const { error } = await supabase
        .from('financeiro_receitas')
        .update({ descricao, valor })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-receitas', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar receita', description: error.message, variant: 'destructive' });
    },
  });

  const updateGasto = useMutation({
    mutationFn: async ({ id, descricao, valor, categoria_id, subcategoria_id }: { id: string; descricao: string; valor: number; categoria_id: string; subcategoria_id?: string | null }) => {
      const { error } = await supabase
        .from('financeiro_gastos')
        .update({ descricao, valor, categoria_id, subcategoria_id: subcategoria_id || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-gastos', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-tipo', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mes-categoria'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar gasto', description: error.message, variant: 'destructive' });
    },
  });

  const deleteReceita = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financeiro_receitas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-receitas', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      toast({ title: 'Receita excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir receita', description: error.message, variant: 'destructive' });
    },
  });

  const deleteGasto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financeiro_gastos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-gastos', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-tipo', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mes-categoria'] });
      toast({ title: 'Gasto excluído!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir gasto', description: error.message, variant: 'destructive' });
    },
  });

  return {
    receitas,
    gastos,
    isLoading: loadingReceitas || loadingGastos,
    addReceita: addReceita.mutate,
    addGasto: addGasto.mutate,
    updateReceita: updateReceita.mutate,
    updateGasto: updateGasto.mutate,
    deleteReceita: deleteReceita.mutate,
    deleteGasto: deleteGasto.mutate,
  };
}
