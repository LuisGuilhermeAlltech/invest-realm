import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboard() {
  const { user } = useAuth();

  const carteiraQuery = useQuery({
    queryKey: ['dashboard', 'carteira', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_carteira_atual')
        .select('valor_atual, custo_total, quantidade_total, preco_atual')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      
      const ativosComPosicao = data.filter(row => row.quantidade_total > 0);
      const ativosComPreco = ativosComPosicao.filter(row => row.preco_atual !== null && row.preco_atual > 0);
      
      // Only sum valor_atual for assets that have valid prices
      const totalCarteira = ativosComPreco.reduce((acc, row) => acc + (row.valor_atual || 0), 0);
      const custoTotalCarteira = ativosComPosicao.reduce((acc, row) => acc + (row.custo_total || 0), 0);
      
      return {
        totalCarteira,
        custoTotalCarteira,
        temAtivosComPosicao: ativosComPosicao.length > 0,
        temPrecoAtualizado: ativosComPreco.length > 0 && ativosComPreco.length === ativosComPosicao.length,
      };
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
    totalCarteira: carteiraQuery.data?.totalCarteira ?? 0,
    custoTotalCarteira: carteiraQuery.data?.custoTotalCarteira ?? 0,
    temAtivosComPosicao: carteiraQuery.data?.temAtivosComPosicao ?? false,
    temPrecoAtualizado: carteiraQuery.data?.temPrecoAtualizado ?? false,
    aportesDoMes: aportesDoMesQuery.data ?? 0,
    proventosDoMes: proventosDoMesQuery.data ?? 0,
    ultimaAtualizacao: ultimaAtualizacaoQuery.data,
    rebalanceamento: rebalanceamentoQuery.data ?? [],
    isLoading: 
      carteiraQuery.isLoading || 
      aportesDoMesQuery.isLoading || 
      proventosDoMesQuery.isLoading ||
      ultimaAtualizacaoQuery.isLoading ||
      rebalanceamentoQuery.isLoading,
  };
}
