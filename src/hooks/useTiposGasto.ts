import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TipoGasto {
  id: string;
  user_id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export function useTiposGasto() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tipos, isLoading } = useQuery({
    queryKey: ['tipos-gasto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_gasto')
        .select('*')
        .order('ordem')
        .order('nome');
      
      if (error) throw error;
      return data as TipoGasto[];
    },
    enabled: !!user,
  });

  const createTipo = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('tipos_gasto')
        .insert({ nome, user_id: user!.id })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um tipo com este nome');
        }
        throw error;
      }
      return data as TipoGasto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-gasto'] });
      toast({ title: 'Tipo criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar tipo', description: error.message, variant: 'destructive' });
    },
  });

  const updateTipo = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TipoGasto> & { id: string }) => {
      const { error } = await supabase
        .from('tipos_gasto')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um tipo com este nome');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-gasto'] });
      queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-tipo'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria'] });
      toast({ title: 'Tipo atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar tipo', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTipo = useMutation({
    mutationFn: async (id: string) => {
      // Check if there are linked categorias
      const { count, error: countError } = await supabase
        .from('categorias_financeiras')
        .select('*', { count: 'exact', head: true })
        .eq('tipo_id', id);
      
      if (countError) throw countError;
      if (count && count > 0) {
        throw new Error('Não é possível excluir tipo com categorias vinculadas');
      }

      const { error } = await supabase
        .from('tipos_gasto')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-gasto'] });
      toast({ title: 'Tipo excluído!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir tipo', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tipos,
    tiposAtivos: tipos?.filter(t => t.ativo) || [],
    isLoading,
    createTipo: createTipo.mutateAsync,
    updateTipo: updateTipo.mutate,
    deleteTipo: deleteTipo.mutate,
  };
}
