import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { getValorAtualAtivo } from '@/lib/formatters';

export interface MonthlyInvested {
  label: string; // "Jan/24"
  year: number;
  month: number;
  acumulado: number;
}

export interface EvolucaoData {
  capitalDoBolso: number;
  patrimonioAtual: number;
  ganhoAbsoluto: number;
  ganhoPercentual: number; // fraction (0.065 = 6.5%)
  proventosAcumulados: number;
  investidosPorMes: MonthlyInvested[];
  hasPatrimonioHistorico: boolean;
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Generate all months from Jan/2024 to today
function generateMonthRange(): { year: number; month: number; label: string }[] {
  const months: { year: number; month: number; label: string }[] = [];
  const now = new Date();
  let y = 2024, m = 1;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    months.push({ year: y, month: m, label: `${MONTH_SHORT[m - 1]}/${String(y).slice(2)}` });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

export function useEvolucaoPatrimonial() {
  const { user } = useAuth();
  const { usdBrl, isLoading: exchangeLoading } = useExchangeRate();

  const query = useQuery({
    queryKey: ['evolucao-patrimonial', user?.id, usdBrl],
    queryFn: async (): Promise<EvolucaoData> => {
      // 1. Fetch all movimentações (compra/aporte/saque) from Jan/2024
      const { data: movs, error: movError } = await supabase
        .from('movimentacoes')
        .select('data, quantidade, preco_unitario, taxas, moeda, tipo')
        .eq('user_id', user!.id)
        .in('tipo', ['compra', 'aporte', 'saque'])
        .gte('data', '2024-01-01')
        .order('data', { ascending: true });

      if (movError) throw movError;

      // 2. Fetch all proventos from Jan/2024
      const { data: provs, error: provError } = await supabase
        .from('proventos')
        .select('valor, moeda, data')
        .eq('user_id', user!.id)
        .gte('data', '2024-01-01');

      if (provError) throw provError;

      // 3. Fetch current portfolio
      const { data: carteira, error: cartError } = await supabase
        .from('vw_carteira_atual')
        .select('valor_atual, custo_total, quantidade_total, preco_atual, moeda_base, classe')
        .eq('user_id', user!.id);

      if (cartError) throw cartError;

      // 4. Fetch caixa
      const { data: caixa, error: caixaError } = await supabase
        .from('vw_saldo_contas')
        .select('saldo, moeda')
        .eq('user_id', user!.id);

      if (caixaError) throw caixaError;

      const convertBrl = (valor: number, moeda: string) =>
        moeda === 'USD' ? valor * usdBrl : valor;

      // Build monthly accumulated Capital do Bolso (aportes - saques, sem proventos)
      const allMonths = generateMonthRange();
      const monthlyMap = new Map<string, number>();

      (movs || []).forEach((mov) => {
        const [y, m] = mov.data.split('-');
        const key = `${parseInt(y)}-${parseInt(m)}`;
        const valor = (mov.quantidade * mov.preco_unitario) + (mov.taxas || 0);
        const valorBrl = convertBrl(valor, mov.moeda);
        // Saques reduzem o capital do bolso
        const sinal = mov.tipo === 'saque' ? -1 : 1;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + valorBrl * sinal);
      });

      let acumulado = 0;
      const investidosPorMes: MonthlyInvested[] = allMonths.map(({ year, month, label }) => {
        const key = `${year}-${month}`;
        acumulado += monthlyMap.get(key) || 0;
        return { label, year, month, acumulado };
      });

      const capitalDoBolso = acumulado;

      // Patrimônio atual (same logic as Dashboard)
      const ativosComPosicao = (carteira || []).filter(row => {
        if (row.classe === 'renda_fixa') return (row.custo_total || 0) > 0;
        return row.quantidade_total > 0;
      });
      const ativosComPreco = ativosComPosicao.filter(row => row.preco_atual !== null && row.preco_atual > 0);

      const totalCarteira = ativosComPreco.reduce((acc, row) => {
        const valorCorreto = getValorAtualAtivo(row.classe || '', row.valor_atual, row.preco_atual);
        return acc + convertBrl(valorCorreto, row.moeda_base || 'BRL');
      }, 0);

      const totalCaixa = (caixa || []).reduce((sum, a) => {
        return sum + convertBrl(a.saldo || 0, a.moeda || 'BRL');
      }, 0);

      const patrimonioAtual = totalCarteira + totalCaixa;

      // Proventos acumulados desde Jan/2024
      const proventosAcumulados = (provs || []).reduce((sum, p) => {
        return sum + convertBrl(p.valor || 0, p.moeda);
      }, 0);

      // Ganho = Patrimônio Total − Capital do Bolso
      // Proventos são informativos (já inclusos no patrimônio como valorização)
      const ganhoAbsoluto = patrimonioAtual - capitalDoBolso;
      const ganhoPercentual = capitalDoBolso > 0
        ? ganhoAbsoluto / capitalDoBolso
        : 0;

      return {
        capitalDoBolso,
        patrimonioAtual,
        ganhoAbsoluto,
        ganhoPercentual,
        proventosAcumulados,
        investidosPorMes,
        hasPatrimonioHistorico: false, // No snapshot table exists
      };
    },
    enabled: !!user && !exchangeLoading,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading || exchangeLoading,
  };
}
