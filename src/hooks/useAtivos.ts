import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Ativo, ClasseAtivo, Moeda } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useAtivos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['ativos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ativos')
        .select('*')
        .eq('user_id', user!.id)
        .order('ticker');
      
      if (error) throw error;
      return data as Ativo[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { ticker: string; nome?: string; classe: ClasseAtivo; moeda_base: Moeda }) => {
      const { error } = await supabase.from('ativos').insert({
        user_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      toast({ title: 'Ativo criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar ativo', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Ativo> & { id: string }) => {
      const { error } = await supabase.from('ativos').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      toast({ title: 'Ativo atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar ativo', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ativos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      toast({ title: 'Ativo excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir ativo', description: error.message, variant: 'destructive' });
    },
  });

  return {
    ativos: query.data ?? [],
    isLoading: query.isLoading,
    createAtivo: createMutation.mutate,
    updateAtivo: updateMutation.mutate,
    deleteAtivo: deleteMutation.mutate,
  };
}
