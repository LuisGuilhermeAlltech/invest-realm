import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// Helper to get today's date in Brazil timezone (YYYY-MM-DD)
const getTodayBrazil = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
};

export interface DashboardConsolidadoData {
  // Financeiro Mensal
  financeiroReceitas: number;
  financeiroGastos: number;
  
  // Contas a Receber
  receberNoMes: number;
  recebidoNoMes: number;
  totalEmAbertoReceber: number;
  
  // Contas a Pagar
  pagarNoMes: number;
  totalEmAbertoPagar: number;
  
  // Computed
  entradasDoMes: number;
  saidasDoMes: number;
  resultadoDoMes: number;
  
  // Lists
  proximosVencimentos: {
    id: string;
    descricao: string;
    due_date: string;
    valor: number;
  }[];
  proximosRecebimentos: {
    id: string;
    descricao: string;
    payer: string;
    due_date: string;
    valor: number;
  }[];
}

export function useDashboardConsolidado(year: number, month: number) {
  const { user } = useAuth();

  const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const today = getTodayBrazil();

  // Financeiro mensal data for selected month
  const financeiroQuery = useQuery({
    queryKey: ['dashboard-consolidado', 'financeiro', user?.id, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_financeiro_mensal_resumo')
        .select('total_receitas, total_gastos')
        .eq('user_id', user!.id)
        .eq('ano', year)
        .eq('mes', month)
        .maybeSingle();
      
      if (error) throw error;
      return {
        receitas: data?.total_receitas || 0,
        gastos: data?.total_gastos || 0,
      };
    },
    enabled: !!user,
  });

  // Receivables data for selected month
  const receivablesQuery = useQuery({
    queryKey: ['dashboard-consolidado', 'receivables', user?.id, year, month],
    queryFn: async () => {
      // Get installments for the month (pending)
      const { data: installments, error: installmentsError } = await supabase
        .from('receivable_installments')
        .select('id, receivable_id, amount, received_amount, due_date, status')
        .eq('user_id', user!.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd);
      
      if (installmentsError) throw installmentsError;

      // Get payments for the month
      const { data: payments, error: paymentsError } = await supabase
        .from('receivable_payments')
        .select('amount, paid_at')
        .eq('user_id', user!.id)
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd);
      
      if (paymentsError) throw paymentsError;

      // Get all pending installments (for total em aberto)
      const { data: allPending, error: allPendingError } = await supabase
        .from('receivable_installments')
        .select('amount, received_amount, status')
        .eq('user_id', user!.id)
        .neq('status', 'received');
      
      if (allPendingError) throw allPendingError;

      // Get receivables saldo em aberto
      const { data: saldoReceivables, error: saldoError } = await supabase
        .from('receivables')
        .select('current_balance')
        .eq('user_id', user!.id)
        .eq('type', 'saldo')
        .eq('status', 'active');
      
      if (saldoError) throw saldoError;

      const receberNoMes = (installments || [])
        .filter(i => i.status !== 'received')
        .reduce((sum, i) => sum + (i.amount - i.received_amount), 0);

      const recebidoNoMes = (payments || [])
        .reduce((sum, p) => sum + p.amount, 0);

      const totalEmAbertoReceber = 
        (allPending || []).reduce((sum, i) => sum + (i.amount - i.received_amount), 0) +
        (saldoReceivables || []).reduce((sum, r) => sum + (r.current_balance || 0), 0);

      return {
        receberNoMes,
        recebidoNoMes,
        totalEmAbertoReceber,
      };
    },
    enabled: !!user,
  });

  // Payables data for selected month
  const payablesQuery = useQuery({
    queryKey: ['dashboard-consolidado', 'payables', user?.id, year, month],
    queryFn: async () => {
      // Get installments due in the month that are still pending (due_date > today)
      const { data: installments, error: installmentsError } = await supabase
        .from('installments')
        .select('amount, due_date')
        .eq('user_id', user!.id)
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)
        .gt('due_date', today);
      
      if (installmentsError) throw installmentsError;

      // Get saldo accounts with meta_pagamento or pagamento_minimo
      const { data: saldoAccounts, error: saldoError } = await supabase
        .from('contas_a_pagar')
        .select('meta_pagamento, pagamento_minimo, saldo_atual')
        .eq('user_id', user!.id)
        .eq('modo', 'saldo')
        .eq('status', 'ativo');
      
      if (saldoError) throw saldoError;

      // Get card purchases for the month
      const { data: cardPurchases, error: cardError } = await supabase
        .from('card_purchases')
        .select('amount')
        .eq('user_id', user!.id)
        .gte('purchase_date', monthStart)
        .lte('purchase_date', monthEnd);
      
      if (cardError) throw cardError;

      // Get all future installments (for total em aberto)
      const { data: allFuture, error: allFutureError } = await supabase
        .from('installments')
        .select('amount')
        .eq('user_id', user!.id)
        .gt('due_date', today);
      
      if (allFutureError) throw allFutureError;

      // Get all saldo accounts totals
      const { data: allSaldo, error: allSaldoError } = await supabase
        .from('contas_a_pagar')
        .select('saldo_atual')
        .eq('user_id', user!.id)
        .eq('modo', 'saldo')
        .eq('status', 'ativo');
      
      if (allSaldoError) throw allSaldoError;

      const parcelasNoMes = (installments || [])
        .reduce((sum, i) => sum + Number(i.amount), 0);

      const saldoCompromisso = (saldoAccounts || [])
        .reduce((sum, a) => sum + (a.meta_pagamento || a.pagamento_minimo || 0), 0);

      const cartaoNoMes = (cardPurchases || [])
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const pagarNoMes = parcelasNoMes + saldoCompromisso + cartaoNoMes;

      const totalEmAbertoPagar = 
        (allFuture || []).reduce((sum, i) => sum + Number(i.amount), 0) +
        (allSaldo || []).reduce((sum, a) => sum + (a.saldo_atual || 0), 0);

      return {
        pagarNoMes,
        totalEmAbertoPagar,
        cartaoNoMes,
      };
    },
    enabled: !!user,
  });

  // Next due installments (payables)
  const nextPayablesQuery = useQuery({
    queryKey: ['dashboard-consolidado', 'next-payables', user?.id],
    queryFn: async () => {
      const { data: installments, error: installmentsError } = await supabase
        .from('installments')
        .select('id, conta_pagar_id, amount, due_date')
        .eq('user_id', user!.id)
        .gt('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5);
      
      if (installmentsError) throw installmentsError;

      // Get conta info for each
      const contaIds = [...new Set((installments || []).map(i => i.conta_pagar_id))];
      const { data: contas, error: contasError } = await supabase
        .from('contas_a_pagar')
        .select('id, descricao')
        .in('id', contaIds);
      
      if (contasError) throw contasError;

      const contaMap = new Map((contas || []).map(c => [c.id, c.descricao]));

      return (installments || []).map(i => ({
        id: i.id,
        descricao: contaMap.get(i.conta_pagar_id) || 'Sem descrição',
        due_date: i.due_date,
        valor: Number(i.amount),
      }));
    },
    enabled: !!user,
  });

  // Next due receivables
  const nextReceivablesQuery = useQuery({
    queryKey: ['dashboard-consolidado', 'next-receivables', user?.id],
    queryFn: async () => {
      const { data: installments, error: installmentsError } = await supabase
        .from('receivable_installments')
        .select('id, receivable_id, amount, received_amount, due_date')
        .eq('user_id', user!.id)
        .neq('status', 'received')
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5);
      
      if (installmentsError) throw installmentsError;

      // Get receivable info for each
      const receivableIds = [...new Set((installments || []).map(i => i.receivable_id))];
      const { data: receivables, error: receivablesError } = await supabase
        .from('receivables')
        .select('id, description, payer')
        .in('id', receivableIds);
      
      if (receivablesError) throw receivablesError;

      const receivableMap = new Map((receivables || []).map(r => [r.id, { description: r.description, payer: r.payer }]));

      return (installments || []).map(i => ({
        id: i.id,
        descricao: receivableMap.get(i.receivable_id)?.description || 'Sem descrição',
        payer: receivableMap.get(i.receivable_id)?.payer || '',
        due_date: i.due_date,
        valor: i.amount - i.received_amount,
      }));
    },
    enabled: !!user,
  });

  const financeiroReceitas = financeiroQuery.data?.receitas ?? 0;
  const financeiroGastos = financeiroQuery.data?.gastos ?? 0;
  const recebidoNoMes = receivablesQuery.data?.recebidoNoMes ?? 0;
  const receberNoMes = receivablesQuery.data?.receberNoMes ?? 0;
  const pagarNoMes = payablesQuery.data?.pagarNoMes ?? 0;

  const entradasDoMes = financeiroReceitas + recebidoNoMes;
  const saidasDoMes = financeiroGastos + pagarNoMes;
  const resultadoDoMes = entradasDoMes - saidasDoMes;

  return {
    financeiroReceitas,
    financeiroGastos,
    receberNoMes,
    recebidoNoMes,
    totalEmAbertoReceber: receivablesQuery.data?.totalEmAbertoReceber ?? 0,
    pagarNoMes,
    totalEmAbertoPagar: payablesQuery.data?.totalEmAbertoPagar ?? 0,
    entradasDoMes,
    saidasDoMes,
    resultadoDoMes,
    proximosVencimentos: nextPayablesQuery.data ?? [],
    proximosRecebimentos: nextReceivablesQuery.data ?? [],
    isLoading: 
      financeiroQuery.isLoading || 
      receivablesQuery.isLoading || 
      payablesQuery.isLoading ||
      nextPayablesQuery.isLoading ||
      nextReceivablesQuery.isLoading,
  };
}
