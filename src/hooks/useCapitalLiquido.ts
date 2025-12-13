import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface CapitalLiquidoAtivo {
  ativo_id: string;
  ticker: string;
  classe: string;
  moeda_base: string;
  // Valores na moeda original do ativo
  aportes_original: number;
  proventos_original: number;
  cli_original: number;
  // Valores convertidos para BRL (para exibição)
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

      // Build per-asset data - valores na moeda original do ativo
      const ativoMap = new Map<string, {
        ticker: string;
        classe: string;
        moeda_base: string;
        aportes_original: number;  // Na moeda base do ativo
        proventos_original: number; // Na moeda base do ativo
      }>();

      // Process movimentações - acumula na moeda base do ativo
      movData.forEach((mov) => {
        const ativo = mov.ativos as unknown as { ticker: string; classe: string; moeda_base: string };
        const valorMov = (mov.quantidade * mov.preco_unitario) + (mov.taxas || 0);
        
        // Converter para moeda base do ativo se necessário
        let valorNaMoedaBase = valorMov;
        if (mov.moeda !== ativo.moeda_base) {
          // Se a movimentação é em moeda diferente da base do ativo, converter
          if (mov.moeda === 'USD' && ativo.moeda_base === 'BRL') {
            valorNaMoedaBase = valorMov * usdBrl;
          } else if (mov.moeda === 'BRL' && ativo.moeda_base === 'USD') {
            valorNaMoedaBase = valorMov / usdBrl;
          }
        }

        if (!ativoMap.has(mov.ativo_id)) {
          ativoMap.set(mov.ativo_id, {
            ticker: ativo.ticker,
            classe: ativo.classe,
            moeda_base: ativo.moeda_base,
            aportes_original: 0,
            proventos_original: 0,
          });
        }

        const entry = ativoMap.get(mov.ativo_id)!;
        entry.aportes_original += valorNaMoedaBase;
      });

      // Process proventos - acumula na moeda base do ativo
      provData.forEach((prov) => {
        const ativo = prov.ativos as unknown as { ticker: string; classe: string; moeda_base: string };
        
        // Converter para moeda base do ativo se necessário
        let valorNaMoedaBase = prov.valor;
        if (prov.moeda !== ativo.moeda_base) {
          if (prov.moeda === 'USD' && ativo.moeda_base === 'BRL') {
            valorNaMoedaBase = prov.valor * usdBrl;
          } else if (prov.moeda === 'BRL' && ativo.moeda_base === 'USD') {
            valorNaMoedaBase = prov.valor / usdBrl;
          }
        }

        if (!ativoMap.has(prov.ativo_id)) {
          ativoMap.set(prov.ativo_id, {
            ticker: ativo.ticker,
            classe: ativo.classe,
            moeda_base: ativo.moeda_base,
            aportes_original: 0,
            proventos_original: 0,
          });
        }

        const entry = ativoMap.get(prov.ativo_id)!;
        entry.proventos_original += valorNaMoedaBase;
      });

      // Calculate CLI per asset - cálculos na moeda original, conversão só para exibição
      const porAtivo: CapitalLiquidoAtivo[] = [];
      let totalAportesBrl = 0;
      let totalProventosBrl = 0;

      ativoMap.forEach((data, ativo_id) => {
        // CLI calculado na moeda original do ativo
        const cli_original = data.aportes_original - data.proventos_original;
        
        // % recuperado calculado na moeda original (não precisa conversão)
        const pct_recuperado = data.aportes_original > 0 
          ? (data.proventos_original / data.aportes_original) 
          : null;

        // Conversão para BRL apenas para exibição consolidada
        const isUsd = data.moeda_base === 'USD';
        const aportes_brl = isUsd ? data.aportes_original * usdBrl : data.aportes_original;
        const proventos_brl = isUsd ? data.proventos_original * usdBrl : data.proventos_original;
        const cli_brl = isUsd ? cli_original * usdBrl : cli_original;

        porAtivo.push({
          ativo_id,
          ticker: data.ticker,
          classe: data.classe,
          moeda_base: data.moeda_base,
          aportes_original: data.aportes_original,
          proventos_original: data.proventos_original,
          cli_original,
          aportes_brl,
          proventos_brl,
          cli_brl,
          pct_recuperado,
        });

        totalAportesBrl += aportes_brl;
        totalProventosBrl += proventos_brl;
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
