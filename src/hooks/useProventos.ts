import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TipoProvento, Moeda } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useProventos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['proventos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proventos')
        .select(`
          *,
          ativos (ticker, nome, classe),
          plataformas (nome),
          conta_destino:accounts!proventos_conta_destino_id_fkey(id, nome, moeda)
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
      tipo: TipoProvento;
      valor: number;
      moeda: Moeda;
      conta_destino_id?: string;
      observacao?: string;
    }) => {
      const { error } = await supabase.from('proventos').insert({
        user_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proventos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      toast({ title: 'Provento criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar provento', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      data?: string;
      ativo_id?: string;
      plataforma_id?: string;
      tipo?: TipoProvento;
      valor?: number;
      moeda?: Moeda;
      conta_destino_id?: string;
      observacao?: string;
    }) => {
      const { error } = await supabase.from('proventos').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proventos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      toast({ title: 'Provento atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar provento', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proventos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proventos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Provento excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir provento', description: error.message, variant: 'destructive' });
    },
  });

  return {
    proventos: query.data ?? [],
    isLoading: query.isLoading,
    createProvento: createMutation.mutate,
    updateProvento: updateMutation.mutate,
    deleteProvento: deleteMutation.mutate,
  };
}
