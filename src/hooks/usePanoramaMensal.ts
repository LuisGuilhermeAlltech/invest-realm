import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useExchangeRate } from '@/hooks/useExchangeRate';

export interface MonthData {
  ano: number;
  mes: number;
  label: string;
  receitas: number;
  despesas: number;
  resultado: number;
  investimentos: number;
  dividaTotal: number;
}

export interface PanoramaInsight {
  type: 'info' | 'warning' | 'success';
  text: string;
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function usePanoramaMensal() {
  const { user } = useAuth();
  const { usdBrl, isLoading: exchangeLoading } = useExchangeRate();

  const query = useQuery({
    queryKey: ['panorama-mensal', user?.id, usdBrl],
    queryFn: async () => {
      // 1. Fetch financeiro mensal (receitas/gastos)
      const { data: financeiro, error: finError } = await supabase
        .from('vw_financeiro_mensal_acumulado')
        .select('ano, mes, total_receitas, total_gastos')
        .eq('user_id', user!.id)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true });

      if (finError) throw finError;

      // 2. Fetch movimentações (compra/aporte) for investment per month
      const { data: movs, error: movError } = await supabase
        .from('movimentacoes')
        .select('data, quantidade, preco_unitario, taxas, moeda, tipo')
        .eq('user_id', user!.id)
        .in('tipo', ['compra', 'aporte'])
        .order('data', { ascending: true });

      if (movError) throw movError;

      // 3. Fetch saldo accounts for debt tracking
      const { data: dividas, error: divError } = await supabase
        .from('contas_a_pagar')
        .select('saldo_atual, modo, status')
        .eq('user_id', user!.id)
        .eq('status', 'ativo');

      if (divError) throw divError;

      // 4. Fetch pending installments total
      const { data: installments, error: instError } = await supabase
        .from('installments')
        .select('amount, status')
        .eq('user_id', user!.id)
        .neq('status', 'paid');

      if (instError) throw instError;

      const convertBrl = (valor: number, moeda: string) =>
        moeda === 'USD' ? valor * usdBrl : valor;

      // Build investment per month map
      const invMap = new Map<string, number>();
      (movs || []).forEach((mov) => {
        const [y, m] = mov.data.split('-');
        const key = `${parseInt(y)}-${parseInt(m)}`;
        const valor = (mov.quantidade * mov.preco_unitario) + (mov.taxas || 0);
        const valorBrl = convertBrl(valor, mov.moeda);
        invMap.set(key, (invMap.get(key) || 0) + valorBrl);
      });

      // Current total debt
      const dividaSaldo = (dividas || [])
        .filter(d => d.modo === 'saldo')
        .reduce((sum, d) => sum + (d.saldo_atual || 0), 0);
      const dividaParcelas = (installments || [])
        .reduce((sum, i) => sum + Number(i.amount), 0);
      const dividaTotal = dividaSaldo + dividaParcelas;

      // Build monthly data
      const months: MonthData[] = (financeiro || []).map((f) => {
        const key = `${f.ano}-${f.mes}`;
        const receitas = f.total_receitas || 0;
        const despesas = f.total_gastos || 0;
        const investimentos = invMap.get(key) || 0;
        return {
          ano: f.ano!,
          mes: f.mes!,
          label: `${MONTH_SHORT[(f.mes || 1) - 1]}/${String(f.ano).slice(2)}`,
          receitas,
          despesas,
          resultado: receitas - despesas,
          investimentos,
          dividaTotal, // same for all months (current snapshot)
        };
      });

      return { months, dividaTotal };
    },
    enabled: !!user && !exchangeLoading,
  });

  const months = query.data?.months ?? [];
  const dividaTotal = query.data?.dividaTotal ?? 0;

  // Last month data
  const lastMonth = months.length > 0 ? months[months.length - 1] : null;
  const prevMonth = months.length > 1 ? months[months.length - 2] : null;

  // Variations
  const varDespesas = prevMonth && prevMonth.despesas > 0
    ? (lastMonth!.despesas - prevMonth.despesas) / prevMonth.despesas
    : null;
  const varReceitas = prevMonth && prevMonth.receitas > 0
    ? (lastMonth!.receitas - prevMonth.receitas) / prevMonth.receitas
    : null;

  // Insights
  const insights: PanoramaInsight[] = [];

  if (varDespesas !== null && lastMonth && prevMonth) {
    if (varDespesas > 0) {
      insights.push({
        type: 'warning',
        text: `Despesas subiram ${(varDespesas * 100).toFixed(1)}% em relação ao mês anterior.`,
      });
    } else if (varDespesas < 0) {
      insights.push({
        type: 'success',
        text: `Despesas caíram ${(Math.abs(varDespesas) * 100).toFixed(1)}% em relação ao mês anterior.`,
      });
    }
  }

  if (varReceitas !== null && lastMonth && prevMonth) {
    if (varReceitas > 0) {
      insights.push({
        type: 'success',
        text: `Receitas subiram ${(varReceitas * 100).toFixed(1)}% em relação ao mês anterior.`,
      });
    } else if (varReceitas < 0) {
      insights.push({
        type: 'warning',
        text: `Receitas caíram ${(Math.abs(varReceitas) * 100).toFixed(1)}% em relação ao mês anterior.`,
      });
    }
  }

  // Check consecutive expense growth
  if (months.length >= 3) {
    const last3 = months.slice(-3);
    if (last3[2].despesas > last3[1].despesas && last3[1].despesas > last3[0].despesas) {
      insights.push({
        type: 'warning',
        text: '⚠️ Despesas crescendo por mais de 1 mês consecutivo.',
      });
    }
  }

  // Averages
  if (months.length > 0) {
    const avgGastos = months.reduce((s, m) => s + m.despesas, 0) / months.length;
    const avgInv = months.reduce((s, m) => s + m.investimentos, 0) / months.length;
    insights.push({
      type: 'info',
      text: `Média mensal: Gastos R$ ${avgGastos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} | Aportes R$ ${avgInv.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
    });
  }

  // Peaks
  if (months.length > 0) {
    const maxGasto = months.reduce((max, m) => m.despesas > max.despesas ? m : max, months[0]);
    const maxReceita = months.reduce((max, m) => m.receitas > max.receitas ? m : max, months[0]);
    insights.push({
      type: 'info',
      text: `Pico de gastos: ${maxGasto.label} (R$ ${maxGasto.despesas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}). Melhor receita: ${maxReceita.label} (R$ ${maxReceita.receitas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}).`,
    });
  }

  return {
    months,
    lastMonth,
    prevMonth,
    varDespesas,
    varReceitas,
    dividaTotal,
    insights,
    isLoading: query.isLoading || exchangeLoading,
  };
}
