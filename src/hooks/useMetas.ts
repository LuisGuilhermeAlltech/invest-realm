import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MetaAlocacao, ClasseAtivo, Rebalanceamento } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useMetas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const metasQuery = useQuery({
    queryKey: ['metas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas_alocacao')
        .select('*')
        .eq('user_id', user!.id)
        .eq('ativo', true)
        .order('classe');
      
      if (error) throw error;
      return data as MetaAlocacao[];
    },
    enabled: !!user,
  });

  const rebalanceamentoQuery = useQuery({
    queryKey: ['rebalanceamento', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_rebalanceamento')
        .select('*')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data as Rebalanceamento[];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (metas: { classe: ClasseAtivo; percentual_alvo: number }[]) => {
      // Deactivate old metas
      await supabase
        .from('metas_alocacao')
        .update({ ativo: false })
        .eq('user_id', user!.id)
        .eq('ativo', true);

      // Insert new metas
      const { error } = await supabase.from('metas_alocacao').insert(
        metas.map((m) => ({
          user_id: user!.id,
          classe: m.classe,
          percentual_alvo: m.percentual_alvo,
          vigente_desde: new Date().toISOString().split('T')[0],
          ativo: true,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] });
      queryClient.invalidateQueries({ queryKey: ['rebalanceamento'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Metas salvas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar metas', description: error.message, variant: 'destructive' });
    },
  });

  return {
    metas: metasQuery.data ?? [],
    rebalanceamento: rebalanceamentoQuery.data ?? [],
    isLoading: metasQuery.isLoading || rebalanceamentoQuery.isLoading,
    saveMetas: saveMutation.mutate,
  };
}
