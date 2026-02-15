import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CategoriaFinanceira {
  id: string;
  user_id: string;
  nome: string;
  tipo: string | null;
  tipo_id: string | null;
  parent_id: string | null;
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
    mutationFn: async (categoria: { nome: string; tipo_id: string | null; limite_mensal: number; ativa: boolean; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .insert({ 
          nome: categoria.nome,
          tipo: 'essencial' as const,
          tipo_id: categoria.tipo_id,
          limite_mensal: categoria.limite_mensal,
          ativa: categoria.ativa,
          parent_id: categoria.parent_id || null,
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
      toast({ title: 'Subcategoria criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar subcategoria', description: error.message, variant: 'destructive' });
    },
  });

  const updateCategoria = useMutation({
    mutationFn: async ({ id, nome, tipo_id, limite_mensal, ativa, parent_id }: { id: string; nome?: string; tipo_id?: string | null; limite_mensal?: number; ativa?: boolean; parent_id?: string | null }) => {
      const updates: Record<string, unknown> = {};
      if (nome !== undefined) updates.nome = nome;
      if (tipo_id !== undefined) updates.tipo_id = tipo_id;
      if (limite_mensal !== undefined) updates.limite_mensal = limite_mensal;
      if (ativa !== undefined) updates.ativa = ativa;
      if (parent_id !== undefined) updates.parent_id = parent_id;
      
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
      toast({ title: 'Subcategoria atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar subcategoria', description: error.message, variant: 'destructive' });
    },
  });

  const checkGastosVinculados = async (categoriaId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('financeiro_gastos')
      .select('*', { count: 'exact', head: true })
      .eq('categoria_id', categoriaId);
    if (error) throw error;
    return count || 0;
  };

  const deleteCategoria = useMutation({
    mutationFn: async (id: string) => {
      // Nullify linked gastos first (move to "direto")
      const { error: updateError } = await supabase
        .from('financeiro_gastos')
        .update({ categoria_id: null })
        .eq('categoria_id', id);
      if (updateError) throw updateError;

      const { error } = await supabase
        .from('categorias_financeiras')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-gastos'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-tipo'] });
      toast({ title: 'Subcategoria excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir subcategoria', description: error.message, variant: 'destructive' });
    },
  });

  // Derived data - filter by tipo_id
  const categoriasAtivas = categorias?.filter(c => c.ativa) || [];
  
  const getSubcategoriasByTipo = (tipoId: string) => {
    return categorias?.filter(c => c.tipo_id === tipoId && c.ativa) || [];
  };

  const getSubcategorias = (parentId: string) => {
    return categorias?.filter(c => c.parent_id === parentId) || [];
  };

  const getSubcategoriasAtivas = (parentId: string) => {
    return categorias?.filter(c => c.parent_id === parentId && c.ativa) || [];
  };

  return {
    categorias,
    categoriasAtivas,
    getSubcategoriasByTipo,
    getSubcategorias,
    getSubcategoriasAtivas,
    isLoading,
    createCategoria: createCategoria.mutate,
    updateCategoria: updateCategoria.mutate,
    deleteCategoria: deleteCategoria.mutate,
    checkGastosVinculados,
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
