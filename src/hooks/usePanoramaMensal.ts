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
  dividaParcelada: number;
  dividaCartao: number;
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

      // 3. Fetch all installments (for per-month debt tracking)
      const { data: allInstallments, error: instError } = await supabase
        .from('installments')
        .select('amount, due_date, status')
        .eq('user_id', user!.id);

      if (instError) throw instError;

      // 4. Fetch all card purchases (for per-month debt tracking)
      const { data: allCardPurchases, error: cardError } = await supabase
        .from('card_purchases')
        .select('amount, purchase_date, included_in_statement_month')
        .eq('user_id', user!.id);

      if (cardError) throw cardError;

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

      // Build per-month debt maps
      // Parceladas: installments due in each month that are not paid
      const parceladaMap = new Map<string, number>();
      (allInstallments || []).forEach((inst) => {
        if (inst.status === 'paid') return;
        const [y, m] = inst.due_date.split('-');
        const key = `${parseInt(y)}-${parseInt(m)}`;
        parceladaMap.set(key, (parceladaMap.get(key) || 0) + Number(inst.amount));
      });

      // Card purchases: purchases per month (not yet included in statement)
      const cartaoMap = new Map<string, number>();
      (allCardPurchases || []).forEach((cp) => {
        if (cp.included_in_statement_month) return; // already included = paid
        const [y, m] = cp.purchase_date.split('-');
        const key = `${parseInt(y)}-${parseInt(m)}`;
        cartaoMap.set(key, (cartaoMap.get(key) || 0) + Number(cp.amount));
      });

      // Build monthly data
      const months: MonthData[] = (financeiro || []).map((f) => {
        const key = `${f.ano}-${f.mes}`;
        const receitas = f.total_receitas || 0;
        const despesas = f.total_gastos || 0;
        const investimentos = invMap.get(key) || 0;
        const dividaParcelada = parceladaMap.get(key) || 0;
        const dividaCartao = cartaoMap.get(key) || 0;
        return {
          ano: f.ano!,
          mes: f.mes!,
          label: `${MONTH_SHORT[(f.mes || 1) - 1]}/${String(f.ano).slice(2)}`,
          receitas,
          despesas,
          resultado: receitas - despesas,
          investimentos,
          dividaParcelada,
          dividaCartao,
          dividaTotal: dividaParcelada + dividaCartao,
        };
      });

      return { months };
    },
    enabled: !!user && !exchangeLoading,
  });

  const months = query.data?.months ?? [];

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
  const varDivida = prevMonth && prevMonth.dividaTotal > 0
    ? (lastMonth!.dividaTotal - prevMonth.dividaTotal) / prevMonth.dividaTotal
    : null;

  // Insights
  const insights: PanoramaInsight[] = [];

  // --- Expense insights ---
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

  // --- Revenue insights ---
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

  // --- Consecutive expense growth ---
  if (months.length >= 3) {
    const last3 = months.slice(-3);
    if (last3[2].despesas > last3[1].despesas && last3[1].despesas > last3[0].despesas) {
      insights.push({
        type: 'warning',
        text: '⚠️ Despesas crescendo por mais de 1 mês consecutivo.',
      });
    }
  }

  // --- Debt insights ---
  if (varDivida !== null && lastMonth && prevMonth) {
    if (varDivida > 0) {
      insights.push({
        type: 'warning',
        text: `💳 Dívida aumentou ${(varDivida * 100).toFixed(1)}% em relação ao mês anterior.`,
      });
    } else if (varDivida < -0.01) {
      insights.push({
        type: 'success',
        text: `💳 Dívida reduziu ${(Math.abs(varDivida) * 100).toFixed(1)}% em relação ao mês anterior.`,
      });
    } else {
      insights.push({
        type: 'info',
        text: '💳 Dívida estável em relação ao mês anterior.',
      });
    }
  }

  // Consecutive debt growth (2+ months)
  if (months.length >= 3) {
    const last3 = months.slice(-3);
    if (last3[2].dividaTotal > last3[1].dividaTotal && last3[1].dividaTotal > last3[0].dividaTotal) {
      insights.push({
        type: 'warning',
        text: '⚠️ Dívida crescendo por 2 ou mais meses consecutivos. Atenção!',
      });
    }
  }

  // Debt falling trend
  if (months.length >= 3) {
    const last3 = months.slice(-3);
    if (last3[2].dividaTotal < last3[1].dividaTotal && last3[1].dividaTotal < last3[0].dividaTotal) {
      insights.push({
        type: 'success',
        text: '📉 Dívida em queda por 2 meses consecutivos. Excelente!',
      });
    }
  }

  // --- Averages ---
  if (months.length > 0) {
    const avgGastos = months.reduce((s, m) => s + m.despesas, 0) / months.length;
    const avgInv = months.reduce((s, m) => s + m.investimentos, 0) / months.length;
    insights.push({
      type: 'info',
      text: `Média mensal: Gastos R$ ${avgGastos.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} | Aportes R$ ${avgInv.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
    });
  }

  // --- Peaks ---
  if (months.length > 0) {
    const maxGasto = months.reduce((max, m) => m.despesas > max.despesas ? m : max, months[0]);
    const maxReceita = months.reduce((max, m) => m.receitas > max.receitas ? m : max, months[0]);
    insights.push({
      type: 'info',
      text: `Pico de gastos: ${maxGasto.label} (R$ ${maxGasto.despesas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}). Melhor receita: ${maxReceita.label} (R$ ${maxReceita.receitas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}).`,
    });
  }

  // Debt peak
  const monthsWithDebt = months.filter(m => m.dividaTotal > 0);
  if (monthsWithDebt.length > 0) {
    const maxDivida = monthsWithDebt.reduce((max, m) => m.dividaTotal > max.dividaTotal ? m : max, monthsWithDebt[0]);
    insights.push({
      type: 'info',
      text: `💳 Maior dívida no período: ${maxDivida.label} (R$ ${maxDivida.dividaTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}).`,
    });
  }

  return {
    months,
    lastMonth,
    prevMonth,
    varDespesas,
    varReceitas,
    varDivida,
    insights,
    isLoading: query.isLoading || exchangeLoading,
  };
}
