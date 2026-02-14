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
    mutationFn: async (categoria: { nome: string; tipo_id: string | null; limite_mensal: number; ativa: boolean; parent_id?: string | null }) => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .insert({ 
          nome: categoria.nome,
          tipo: 'essencial' as const, // Required by DB but deprecated
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
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
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

      // Check for subcategory gastos
      const { count: subCount, error: subError } = await supabase
        .from('financeiro_gastos')
        .select('*', { count: 'exact', head: true })
        .eq('subcategoria_id', id);
      
      if (subError) throw subError;
      if (subCount && subCount > 0) {
        throw new Error('Não é possível excluir categoria com gastos vinculados via subcategoria');
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

  // Derived data
  const categoriasRaiz = categorias?.filter(c => !c.parent_id) || [];
  const categoriasAtivas = categorias?.filter(c => c.ativa) || [];
  const categoriasRaizAtivas = categorias?.filter(c => c.ativa && !c.parent_id) || [];

  const getSubcategorias = (parentId: string) => {
    return categorias?.filter(c => c.parent_id === parentId) || [];
  };

  const getSubcategoriasAtivas = (parentId: string) => {
    return categorias?.filter(c => c.parent_id === parentId && c.ativa) || [];
  };

  return {
    categorias,
    categoriasRaiz,
    categoriasAtivas,
    categoriasRaizAtivas,
    getSubcategorias,
    getSubcategoriasAtivas,
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

// Fetch gastos filtered by categoria (and optionally subcategoria) for a given month
export function useGastosPorMesCategoria(financeiroMensalId: string | null, categoriaId: string | null, subcategoriaId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gastos-mes-categoria', financeiroMensalId, categoriaId, subcategoriaId],
    queryFn: async () => {
      let query = supabase
        .from('financeiro_gastos')
        .select('*')
        .eq('financeiro_mensal_id', financeiroMensalId!);

      if (subcategoriaId) {
        // Filter by specific subcategoria
        query = query.eq('subcategoria_id', subcategoriaId);
      } else if (categoriaId) {
        // Filter by root categoria (own gastos + subcategoria gastos)
        query = query.eq('categoria_id', categoriaId);
      }
      
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!financeiroMensalId && !!categoriaId,
  });
}
