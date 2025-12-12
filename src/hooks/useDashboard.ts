import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboard() {
  const { user } = useAuth();

  const totalCarteiraQuery = useQuery({
    queryKey: ['dashboard', 'total', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_carteira_atual')
        .select('valor_atual')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data.reduce((acc, row) => acc + (row.valor_atual || 0), 0);
    },
    enabled: !!user,
  });

  const aportesDoMesQuery = useQuery({
    queryKey: ['dashboard', 'aportes', user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('movimentacoes')
        .select('quantidade, preco_unitario, tipo')
        .eq('user_id', user!.id)
        .in('tipo', ['compra', 'aporte'])
        .gte('data', startOfMonth.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data.reduce((acc, row) => acc + (row.quantidade * row.preco_unitario), 0);
    },
    enabled: !!user,
  });

  const proventosDoMesQuery = useQuery({
    queryKey: ['dashboard', 'proventos', user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('proventos')
        .select('valor')
        .eq('user_id', user!.id)
        .gte('data', startOfMonth.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data.reduce((acc, row) => acc + (row.valor || 0), 0);
    },
    enabled: !!user,
  });

  const ultimaAtualizacaoQuery = useQuery({
    queryKey: ['dashboard', 'ultimaAtualizacao', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('precos_ativos')
        .select('atualizado_em')
        .eq('user_id', user!.id)
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.atualizado_em || null;
    },
    enabled: !!user,
  });

  const rebalanceamentoQuery = useQuery({
    queryKey: ['dashboard', 'rebalanceamento', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_rebalanceamento')
        .select('*')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return {
    totalCarteira: totalCarteiraQuery.data ?? 0,
    aportesDoMes: aportesDoMesQuery.data ?? 0,
    proventosDoMes: proventosDoMesQuery.data ?? 0,
    ultimaAtualizacao: ultimaAtualizacaoQuery.data,
    rebalanceamento: rebalanceamentoQuery.data ?? [],
    isLoading: 
      totalCarteiraQuery.isLoading || 
      aportesDoMesQuery.isLoading || 
      proventosDoMesQuery.isLoading ||
      ultimaAtualizacaoQuery.isLoading ||
      rebalanceamentoQuery.isLoading,
  };
}
