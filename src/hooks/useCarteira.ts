import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CarteiraAtual, Moeda } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export function useCarteira() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['carteira', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_carteira_atual')
        .select('*')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data as CarteiraAtual[];
    },
    enabled: !!user,
  });

  const updatePrecoMutation = useMutation({
    mutationFn: async ({ ativo_id, preco_atual, moeda }: { ativo_id: string; preco_atual: number; moeda: Moeda }) => {
      const { data: existing } = await supabase
        .from('precos_ativos')
        .select('id')
        .eq('user_id', user!.id)
        .eq('ativo_id', ativo_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('precos_ativos')
          .update({ preco_atual, moeda, atualizado_em: new Date().toISOString(), fonte: 'manual' })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('precos_ativos').insert({
          user_id: user!.id,
          ativo_id,
          preco_atual,
          moeda,
          atualizado_em: new Date().toISOString(),
          fonte: 'manual',
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carteira'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Preço atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar preço', description: error.message, variant: 'destructive' });
    },
  });

  return {
    carteira: query.data ?? [],
    isLoading: query.isLoading,
    updatePreco: updatePrecoMutation.mutate,
  };
}
