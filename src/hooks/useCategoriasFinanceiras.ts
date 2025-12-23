import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type TipoCategoriaFinanceira = 'essencial' | 'nao_essencial' | 'lazer';

export interface CategoriaFinanceira {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoCategoriaFinanceira;
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
  categoria_tipo: TipoCategoriaFinanceira;
  limite_mensal: number;
  total_gasto: number;
  saldo_categoria: number;
}

export interface GastoPorTipo {
  user_id: string;
  financeiro_mensal_id: string;
  ano: number;
  mes: number;
  categoria_tipo: TipoCategoriaFinanceira;
  total_gasto: number;
}

export const TIPOS_CATEGORIA: Record<TipoCategoriaFinanceira, { label: string; color: string }> = {
  essencial: { label: 'Essencial', color: 'hsl(var(--chart-1))' },
  nao_essencial: { label: 'Não Essencial', color: 'hsl(var(--chart-3))' },
  lazer: { label: 'Lazer', color: 'hsl(var(--chart-4))' },
};

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
    mutationFn: async (categoria: Omit<CategoriaFinanceira, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .insert({ ...categoria, user_id: user!.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    },
  });

  const updateCategoria = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategoriaFinanceira> & { id: string }) => {
      const { error } = await supabase
        .from('categorias_financeiras')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
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
