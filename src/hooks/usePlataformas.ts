import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plataforma } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function usePlataformas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['plataformas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plataformas')
        .select('*')
        .eq('user_id', user!.id)
        .order('nome');
      
      if (error) throw error;
      return data as Plataforma[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from('plataformas').insert({
        user_id: user!.id,
        nome,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plataformas'] });
      toast({ title: 'Plataforma criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar plataforma', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from('plataformas').update({ nome }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plataformas'] });
      toast({ title: 'Plataforma atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar plataforma', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plataformas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plataformas'] });
      toast({ title: 'Plataforma excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir plataforma', description: error.message, variant: 'destructive' });
    },
  });

  return {
    plataformas: query.data ?? [],
    isLoading: query.isLoading,
    createPlataforma: createMutation.mutate,
    updatePlataforma: updateMutation.mutate,
    deletePlataforma: deleteMutation.mutate,
  };
}
