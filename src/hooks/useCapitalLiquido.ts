import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';

interface CapitalDoBolsoAtivo {
  ativo_id: string;
  ticker: string;
  classe: string;
  moeda_base: string;
  // Valores na moeda original do ativo
  aportes_original: number;
  saques_original: number;
  capital_original: number;
  proventos_original: number;
  // Valores convertidos para BRL (para exibição)
  aportes_brl: number;
  saques_brl: number;
  capital_brl: number;
  proventos_brl: number;
  pct_recuperado: number | null;
}

export function useCapitalLiquido() {
  const { user } = useAuth();
  const { usdBrl, isLoading: exchangeLoading } = useExchangeRate();

  const query = useQuery({
    queryKey: ['capital-do-bolso', user?.id, usdBrl],
    queryFn: async () => {
      // Fetch all movimentações (compra/aporte/saque) grouped by ativo
      const { data: movData, error: movError } = await supabase
        .from('movimentacoes')
        .select('ativo_id, tipo, quantidade, preco_unitario, taxas, moeda, ativos!inner(ticker, classe, moeda_base)')
        .eq('user_id', user!.id)
        .in('tipo', ['compra', 'aporte', 'saque']);

      if (movError) throw movError;

      // Fetch proventos (only for informational display, NOT for capital calculation)
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
        aportes_original: number;
        saques_original: number;
        proventos_original: number;
      }>();

      const ensureAtivo = (ativo_id: string, ativo: { ticker: string; classe: string; moeda_base: string }) => {
        if (!ativoMap.has(ativo_id)) {
          ativoMap.set(ativo_id, {
            ticker: ativo.ticker,
            classe: ativo.classe,
            moeda_base: ativo.moeda_base,
            aportes_original: 0,
            saques_original: 0,
            proventos_original: 0,
          });
        }
        return ativoMap.get(ativo_id)!;
      };

      // Process movimentações
      movData.forEach((mov) => {
        const ativo = mov.ativos as unknown as { ticker: string; classe: string; moeda_base: string };
        const valorMov = (mov.quantidade * mov.preco_unitario) + (mov.taxas || 0);

        let valorNaMoedaBase = valorMov;
        if (mov.moeda !== ativo.moeda_base) {
          if (mov.moeda === 'USD' && ativo.moeda_base === 'BRL') {
            valorNaMoedaBase = valorMov * usdBrl;
          } else if (mov.moeda === 'BRL' && ativo.moeda_base === 'USD') {
            valorNaMoedaBase = valorMov / usdBrl;
          }
        }

        const entry = ensureAtivo(mov.ativo_id, ativo);
        if (mov.tipo === 'compra' || mov.tipo === 'aporte') {
          entry.aportes_original += valorNaMoedaBase;
        } else if (mov.tipo === 'saque') {
          entry.saques_original += valorNaMoedaBase;
        }
      });

      // Process proventos (informational only)
      provData.forEach((prov) => {
        const ativo = prov.ativos as unknown as { ticker: string; classe: string; moeda_base: string };

        let valorNaMoedaBase = prov.valor;
        if (prov.moeda !== ativo.moeda_base) {
          if (prov.moeda === 'USD' && ativo.moeda_base === 'BRL') {
            valorNaMoedaBase = prov.valor * usdBrl;
          } else if (prov.moeda === 'BRL' && ativo.moeda_base === 'USD') {
            valorNaMoedaBase = prov.valor / usdBrl;
          }
        }

        const entry = ensureAtivo(prov.ativo_id, ativo);
        entry.proventos_original += valorNaMoedaBase;
      });

      // Calculate Capital do Bolso per asset
      const porAtivo: CapitalDoBolsoAtivo[] = [];
      let totalAportesBrl = 0;
      let totalSaquesBrl = 0;
      let totalProventosBrl = 0;

      ativoMap.forEach((data, ativo_id) => {
        // Capital do Bolso = aportes - saques (NO proventos subtraction)
        const capital_original = data.aportes_original - data.saques_original;

        // % recuperado = proventos / aportes (informational)
        const pct_recuperado = data.aportes_original > 0
          ? (data.proventos_original / data.aportes_original)
          : null;

        const isUsd = data.moeda_base === 'USD';
        const aportes_brl = isUsd ? data.aportes_original * usdBrl : data.aportes_original;
        const saques_brl = isUsd ? data.saques_original * usdBrl : data.saques_original;
        const capital_brl = isUsd ? capital_original * usdBrl : capital_original;
        const proventos_brl = isUsd ? data.proventos_original * usdBrl : data.proventos_original;

        porAtivo.push({
          ativo_id,
          ticker: data.ticker,
          classe: data.classe,
          moeda_base: data.moeda_base,
          aportes_original: data.aportes_original,
          saques_original: data.saques_original,
          capital_original,
          proventos_original: data.proventos_original,
          aportes_brl,
          saques_brl,
          capital_brl,
          proventos_brl,
          pct_recuperado,
        });

        totalAportesBrl += aportes_brl;
        totalSaquesBrl += saques_brl;
        totalProventosBrl += proventos_brl;
      });

      // Capital do Bolso total = aportes - saques (proventos NÃO entram)
      const capitalDoBolsoBrl = totalAportesBrl - totalSaquesBrl;

      return {
        porAtivo,
        capitalDoBolsoBrl,
        totalAportesBrl,
        totalSaquesBrl,
        totalProventosBrl,
      };
    },
    enabled: !!user && !exchangeLoading,
  });

  return {
    porAtivo: query.data?.porAtivo ?? [],
    capitalDoBolsoBrl: query.data?.capitalDoBolsoBrl ?? 0,
    totalAportesBrl: query.data?.totalAportesBrl ?? 0,
    totalSaquesBrl: query.data?.totalSaquesBrl ?? 0,
    totalProventosBrl: query.data?.totalProventosBrl ?? 0,
    isLoading: query.isLoading || exchangeLoading,
  };
}
