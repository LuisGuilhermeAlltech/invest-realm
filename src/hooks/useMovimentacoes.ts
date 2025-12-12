import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Movimentacao, TipoMovimentacao, Moeda } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useMovimentacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['movimentacoes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          ativos (ticker, nome, classe),
          plataformas (nome)
        `)
        .eq('user_id', user!.id)
        .order('data', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      data: string;
      ativo_id: string;
      plataforma_id?: string;
      tipo: TipoMovimentacao;
      quantidade: number;
      preco_unitario: number;
      moeda: Moeda;
      taxas?: number;
      observacao?: string;
    }) => {
      const { error } = await supabase.from('movimentacoes').insert({
        user_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['carteira'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Movimentação criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar movimentação', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      data: string;
      ativo_id: string;
      plataforma_id?: string;
      tipo: TipoMovimentacao;
      quantidade: number;
      preco_unitario: number;
      moeda: Moeda;
      taxas?: number;
      observacao?: string;
    }) => {
      const { error } = await supabase
        .from('movimentacoes')
        .update({
          data: data.data,
          ativo_id: data.ativo_id,
          plataforma_id: data.plataforma_id || null,
          tipo: data.tipo,
          quantidade: data.quantidade,
          preco_unitario: data.preco_unitario,
          moeda: data.moeda,
          taxas: data.taxas || 0,
          observacao: data.observacao || null,
        })
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['carteira'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Movimentação atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar movimentação', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('movimentacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['carteira'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Movimentação excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir movimentação', description: error.message, variant: 'destructive' });
    },
  });

  return {
    movimentacoes: query.data ?? [],
    isLoading: query.isLoading,
    createMovimentacao: createMutation.mutate,
    updateMovimentacao: updateMutation.mutate,
    deleteMovimentacao: deleteMutation.mutate,
  };
}
