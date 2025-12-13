import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface CapitalLiquidoAtivo {
  ativo_id: string;
  ticker: string;
  classe: string;
  moeda_base: string;
  aportes_brl: number;
  proventos_brl: number;
  cli_brl: number;
  pct_recuperado: number | null;
}

export function useCapitalLiquido() {
  const { user } = useAuth();
  const { usdBrl, isLoading: exchangeLoading } = useExchangeRate();

  const query = useQuery({
    queryKey: ['capital-liquido', user?.id, usdBrl],
    queryFn: async () => {
      // Fetch all movimentações (compra/aporte) grouped by ativo
      const { data: movData, error: movError } = await supabase
        .from('movimentacoes')
        .select('ativo_id, tipo, quantidade, preco_unitario, taxas, moeda, ativos!inner(ticker, classe, moeda_base)')
        .eq('user_id', user!.id)
        .in('tipo', ['compra', 'aporte']);

      if (movError) throw movError;

      // Fetch all proventos grouped by ativo (source of truth)
      const { data: provData, error: provError } = await supabase
        .from('proventos')
        .select('ativo_id, valor, moeda, ativos!inner(ticker, classe, moeda_base)')
        .eq('user_id', user!.id);

      if (provError) throw provError;

      // Build per-asset data
      const ativoMap = new Map<string, {
        ticker: string;
        classe: string;
        moeda_base: string;
        aportes_brl: number;
        proventos_brl: number;
      }>();

      // Process movimentações
      movData.forEach((mov) => {
        const ativo = mov.ativos as unknown as { ticker: string; classe: string; moeda_base: string };
        const valorMov = (mov.quantidade * mov.preco_unitario) + (mov.taxas || 0);
        let valorBrl = valorMov;
        
        // Convert USD to BRL
        if (mov.moeda === 'USD') {
          valorBrl = valorMov * usdBrl;
        }

        if (!ativoMap.has(mov.ativo_id)) {
          ativoMap.set(mov.ativo_id, {
            ticker: ativo.ticker,
            classe: ativo.classe,
            moeda_base: ativo.moeda_base,
            aportes_brl: 0,
            proventos_brl: 0,
          });
        }

        const entry = ativoMap.get(mov.ativo_id)!;
        entry.aportes_brl += valorBrl;
      });

      // Process proventos
      provData.forEach((prov) => {
        const ativo = prov.ativos as unknown as { ticker: string; classe: string; moeda_base: string };
        let valorBrl = prov.valor;
        
        // Convert USD to BRL
        if (prov.moeda === 'USD') {
          valorBrl = prov.valor * usdBrl;
        }

        if (!ativoMap.has(prov.ativo_id)) {
          ativoMap.set(prov.ativo_id, {
            ticker: ativo.ticker,
            classe: ativo.classe,
            moeda_base: ativo.moeda_base,
            aportes_brl: 0,
            proventos_brl: 0,
          });
        }

        const entry = ativoMap.get(prov.ativo_id)!;
        entry.proventos_brl += valorBrl;
      });

      // Calculate CLI per asset
      const porAtivo: CapitalLiquidoAtivo[] = [];
      let totalAportesBrl = 0;
      let totalProventosBrl = 0;

      ativoMap.forEach((data, ativo_id) => {
        const cli_brl = data.aportes_brl - data.proventos_brl;
        const pct_recuperado = data.aportes_brl > 0 
          ? (data.proventos_brl / data.aportes_brl) 
          : null;

        porAtivo.push({
          ativo_id,
          ticker: data.ticker,
          classe: data.classe,
          moeda_base: data.moeda_base,
          aportes_brl: data.aportes_brl,
          proventos_brl: data.proventos_brl,
          cli_brl,
          pct_recuperado,
        });

        totalAportesBrl += data.aportes_brl;
        totalProventosBrl += data.proventos_brl;
      });

      const cliTotalBrl = totalAportesBrl - totalProventosBrl;

      return {
        porAtivo,
        cliTotalBrl,
        totalAportesBrl,
        totalProventosBrl,
      };
    },
    enabled: !!user && !exchangeLoading,
  });

  return {
    porAtivo: query.data?.porAtivo ?? [],
    cliTotalBrl: query.data?.cliTotalBrl ?? 0,
    totalAportesBrl: query.data?.totalAportesBrl ?? 0,
    totalProventosBrl: query.data?.totalProventosBrl ?? 0,
    isLoading: query.isLoading || exchangeLoading,
  };
}
