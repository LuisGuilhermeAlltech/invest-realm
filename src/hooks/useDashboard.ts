import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';

export function useDashboard() {
  const { user } = useAuth();
  const { usdBrl, exchangeDate, exchangeSource, isLoading: exchangeLoading } = useExchangeRate();

  const carteiraQuery = useQuery({
    queryKey: ['dashboard', 'carteira', user?.id, usdBrl],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_carteira_atual')
        .select('valor_atual, custo_total, quantidade_total, preco_atual, moeda_base, classe')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      
      const ativosComPosicao = data.filter(row => row.quantidade_total > 0);
      const ativosComPreco = ativosComPosicao.filter(row => row.preco_atual !== null && row.preco_atual > 0);
      
      // Convert USD values to BRL before summing
      const convertToBrl = (valor: number, moeda: string | null) => {
        if (moeda === 'USD') {
          return valor * usdBrl;
        }
        return valor;
      };
      
      // Only sum valor_atual for assets that have valid prices, converting USD to BRL
      const totalCarteira = ativosComPreco.reduce((acc, row) => {
        const valorBrl = convertToBrl(row.valor_atual || 0, row.moeda_base);
        return acc + valorBrl;
      }, 0);
      
      // Custo total also needs conversion
      const custoTotalCarteira = ativosComPosicao.reduce((acc, row) => {
        const custoBrl = convertToBrl(row.custo_total || 0, row.moeda_base);
        return acc + custoBrl;
      }, 0);
      
      return {
        totalCarteira,
        custoTotalCarteira,
        temAtivosComPosicao: ativosComPosicao.length > 0,
        temPrecoAtualizado: ativosComPreco.length > 0 && ativosComPreco.length === ativosComPosicao.length,
      };
    },
    enabled: !!user && !exchangeLoading,
  });

  // Fetch cash accounts totals
  const caixaQuery = useQuery({
    queryKey: ['dashboard', 'caixa', user?.id, usdBrl],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_saldo_contas')
        .select('saldo, moeda')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      
      const totalBRL = data
        .filter(a => a.moeda === 'BRL')
        .reduce((sum, a) => sum + (a.saldo || 0), 0);
      
      const totalUSD = data
        .filter(a => a.moeda === 'USD')
        .reduce((sum, a) => sum + (a.saldo || 0), 0);

      const totalCaixaBRL = totalBRL + (totalUSD * usdBrl);

      return {
        totalBRL,
        totalUSD,
        totalCaixaBRL,
      };
    },
    enabled: !!user && !exchangeLoading,
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

  // Fetch carteira data with moeda_base to recalculate rebalanceamento with USD conversion
  const rebalanceamentoQuery = useQuery({
    queryKey: ['dashboard', 'rebalanceamento', user?.id, usdBrl],
    queryFn: async () => {
      // First get the raw rebalanceamento data
      const { data: rebalData, error: rebalError } = await supabase
        .from('vw_rebalanceamento')
        .select('*')
        .eq('user_id', user!.id);
      
      if (rebalError) throw rebalError;
      
      // Get carteira data with moeda_base to know which values need conversion
      const { data: carteiraData, error: carteiraError } = await supabase
        .from('vw_carteira_atual')
        .select('classe, valor_atual, moeda_base, quantidade_total, preco_atual')
        .eq('user_id', user!.id);
      
      if (carteiraError) throw carteiraError;
      
      // Calculate the correct totals per class with USD conversion
      const totaisPorClasse: Record<string, number> = {};
      let totalCarteiraConvertido = 0;
      
      carteiraData
        .filter(row => row.quantidade_total > 0 && row.preco_atual !== null && row.preco_atual > 0)
        .forEach(row => {
          let valorBrl = row.valor_atual || 0;
          if (row.moeda_base === 'USD') {
            valorBrl = valorBrl * usdBrl;
          }
          
          const classe = row.classe as string;
          totaisPorClasse[classe] = (totaisPorClasse[classe] || 0) + valorBrl;
          totalCarteiraConvertido += valorBrl;
        });
      
      // Recalculate rebalanceamento with converted values
      return rebalData.map(row => {
        const classe = row.classe as string;
        const valorAtualConvertido = totaisPorClasse[classe] || 0;
        const valorIdeal = totalCarteiraConvertido * (row.percentual_alvo / 100);
        const diferenca = valorIdeal - valorAtualConvertido;
        
        return {
          ...row,
          valor_atual: valorAtualConvertido,
          total_carteira: totalCarteiraConvertido,
          valor_ideal: valorIdeal,
          diferenca: diferenca,
        };
      });
    },
    enabled: !!user && !exchangeLoading,
  });

  const totalCarteira = carteiraQuery.data?.totalCarteira ?? 0;
  const totalCaixaBRL = caixaQuery.data?.totalCaixaBRL ?? 0;
  const patrimonioTotal = totalCarteira + totalCaixaBRL;

  return {
    totalCarteira,
    custoTotalCarteira: carteiraQuery.data?.custoTotalCarteira ?? 0,
    temAtivosComPosicao: carteiraQuery.data?.temAtivosComPosicao ?? false,
    temPrecoAtualizado: carteiraQuery.data?.temPrecoAtualizado ?? false,
    totalCaixaBRL,
    caixaBRL: caixaQuery.data?.totalBRL ?? 0,
    caixaUSD: caixaQuery.data?.totalUSD ?? 0,
    patrimonioTotal,
    aportesDoMes: aportesDoMesQuery.data ?? 0,
    proventosDoMes: proventosDoMesQuery.data ?? 0,
    ultimaAtualizacao: ultimaAtualizacaoQuery.data,
    rebalanceamento: rebalanceamentoQuery.data ?? [],
    usdBrl,
    exchangeDate,
    exchangeSource,
    isLoading: 
      carteiraQuery.isLoading || 
      caixaQuery.isLoading ||
      aportesDoMesQuery.isLoading || 
      proventosDoMesQuery.isLoading ||
      ultimaAtualizacaoQuery.isLoading ||
      rebalanceamentoQuery.isLoading ||
      exchangeLoading,
  };
}
