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
}

export function useFinanceiroMensal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar resumo mensal com saldo acumulado
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

  // Criar novo mês
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

  // Deletar mês
  const deleteMes = useMutation({
    mutationFn: async (id: string) => {
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

  return {
    meses,
    isLoading,
    createMes: createMes.mutate,
    deleteMes: deleteMes.mutate,
  };
}

export function useFinanceiroDetalhe(financeiroMensalId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar receitas do mês
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

  // Buscar gastos do mês
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

  // Adicionar receita
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

  // Adicionar gasto
  const addGasto = useMutation({
    mutationFn: async ({ descricao, valor }: { descricao: string; valor: number }) => {
      const { error } = await supabase
        .from('financeiro_gastos')
        .insert({ 
          user_id: user!.id, 
          financeiro_mensal_id: financeiroMensalId!, 
          descricao, 
          valor 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-gastos', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      toast({ title: 'Gasto adicionado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar gasto', description: error.message, variant: 'destructive' });
    },
  });

  // Atualizar receita
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

  // Atualizar gasto
  const updateGasto = useMutation({
    mutationFn: async ({ id, descricao, valor }: { id: string; descricao: string; valor: number }) => {
      const { error } = await supabase
        .from('financeiro_gastos')
        .update({ descricao, valor })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-gastos', financeiroMensalId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar gasto', description: error.message, variant: 'destructive' });
    },
  });

  // Deletar receita
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

  // Deletar gasto
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
