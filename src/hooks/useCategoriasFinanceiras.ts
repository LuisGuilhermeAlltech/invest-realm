import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CategoriaFinanceira {
  id: string;
  user_id: string;
  nome: string;
  tipo: string | null; // Kept for backwards compatibility
  tipo_id: string | null;
  limite_mensal: number;
  ativa: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface GastoPorCategoria {
  user_id: string;
  financeiro_mensal_id: string;
  ano: number;
  mes: number;
  categoria_id: string;
  categoria_nome: string;
  categoria_tipo: string | null;
  tipo_id: string | null;
  tipo_nome: string | null;
  limite_mensal: number;
  total_gasto: number;
  saldo_categoria: number;
}

export interface GastoPorTipo {
  user_id: string;
  financeiro_mensal_id: string;
  ano: number;
  mes: number;
  tipo_id: string | null;
  tipo_nome: string | null;
  categoria_tipo: string | null;
  total_gasto: number;
}

export function useCategoriasFinanceiras() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['categorias-financeiras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as CategoriaFinanceira[];
    },
    enabled: !!user,
  });

  const createCategoria = useMutation({
    mutationFn: async (categoria: { nome: string; tipo_id: string | null; limite_mensal: number; ativa: boolean }) => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .insert({ 
          nome: categoria.nome,
          tipo: 'essencial' as const, // Required by DB but deprecated
          tipo_id: categoria.tipo_id,
          limite_mensal: categoria.limite_mensal,
          ativa: categoria.ativa,
          user_id: user!.id 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria'] });
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    },
  });

  const updateCategoria = useMutation({
    mutationFn: async ({ id, nome, tipo_id, limite_mensal, ativa }: { id: string; nome?: string; tipo_id?: string | null; limite_mensal?: number; ativa?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (nome !== undefined) updates.nome = nome;
      if (tipo_id !== undefined) updates.tipo_id = tipo_id;
      if (limite_mensal !== undefined) updates.limite_mensal = limite_mensal;
      if (ativa !== undefined) updates.ativa = ativa;
      
      const { error } = await supabase
        .from('categorias_financeiras')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-tipo'] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar categoria', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCategoria = useMutation({
    mutationFn: async (id: string) => {
      // Check if there are linked gastos
      const { count, error: countError } = await supabase
        .from('financeiro_gastos')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', id);
      
      if (countError) throw countError;
      if (count && count > 0) {
        throw new Error('Não é possível excluir categoria com gastos vinculados');
      }

      const { error } = await supabase
        .from('categorias_financeiras')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      toast({ title: 'Categoria excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir categoria', description: error.message, variant: 'destructive' });
    },
  });

  return {
    categorias,
    categoriasAtivas: categorias?.filter(c => c.ativa) || [],
    isLoading,
    createCategoria: createCategoria.mutate,
    updateCategoria: updateCategoria.mutate,
    deleteCategoria: deleteCategoria.mutate,
  };
}

export function useGastosPorCategoria(financeiroMensalId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gastos-por-categoria', financeiroMensalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_gastos_por_categoria')
        .select('*')
        .eq('financeiro_mensal_id', financeiroMensalId!);
      
      if (error) throw error;
      return data as GastoPorCategoria[];
    },
    enabled: !!user && !!financeiroMensalId,
  });
}

export function useGastosPorTipo(financeiroMensalId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gastos-por-tipo', financeiroMensalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_gastos_por_tipo')
        .select('*')
        .eq('financeiro_mensal_id', financeiroMensalId!);
      
      if (error) throw error;
      return data as GastoPorTipo[];
    },
    enabled: !!user && !!financeiroMensalId,
  });
}
