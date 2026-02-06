import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook centralizado para o conceito "Contas Totais".
 *
 * CONTAS TOTAIS = Contas Saldo (contas_a_pagar modo=saldo ativas)
 *               + Parceladas em aberto (installments não pagas)
 *               + Crédito à Vista (card_purchases ainda não incluídas na fatura)
 *
 * DÍVIDA TOTAL = Parceladas em aberto + Crédito à Vista (sem contas saldo)
 */
export interface ContasTotaisData {
  contasSaldo: number;
  parcelasEmAberto: number;
  creditoVista: number;
  contasTotais: number;
  dividaTotal: number;
  isLoading: boolean;
}

export function useContasTotais(): ContasTotaisData {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['contas-totais', user?.id],
    queryFn: async () => {
      // 1. Contas Saldo (contas_a_pagar modo=saldo, status=ativo)
      const { data: saldoContas, error: saldoErr } = await supabase
        .from('contas_a_pagar')
        .select('saldo_atual')
        .eq('user_id', user!.id)
        .eq('modo', 'saldo')
        .eq('status', 'ativo');
      if (saldoErr) throw saldoErr;

      const contasSaldo = (saldoContas || []).reduce(
        (sum, c) => sum + (c.saldo_atual || 0),
        0
      );

      // 2. Parceladas em aberto (installments com status != 'paid')
      const { data: parcelas, error: parcErr } = await supabase
        .from('installments')
        .select('amount')
        .eq('user_id', user!.id)
        .neq('status', 'paid');
      if (parcErr) throw parcErr;

      const parcelasEmAberto = (parcelas || []).reduce(
        (sum, i) => sum + Number(i.amount),
        0
      );

      // 3. Crédito à Vista (card_purchases sem included_in_statement_month)
      const { data: cartao, error: cartErr } = await supabase
        .from('card_purchases')
        .select('amount')
        .eq('user_id', user!.id)
        .is('included_in_statement_month', null);
      if (cartErr) throw cartErr;

      const creditoVista = (cartao || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      return { contasSaldo, parcelasEmAberto, creditoVista };
    },
    enabled: !!user,
  });

  const contasSaldo = query.data?.contasSaldo ?? 0;
  const parcelasEmAberto = query.data?.parcelasEmAberto ?? 0;
  const creditoVista = query.data?.creditoVista ?? 0;

  return {
    contasSaldo,
    parcelasEmAberto,
    creditoVista,
    contasTotais: contasSaldo + parcelasEmAberto + creditoVista,
    dividaTotal: parcelasEmAberto + creditoVista,
    isLoading: query.isLoading,
  };
}
