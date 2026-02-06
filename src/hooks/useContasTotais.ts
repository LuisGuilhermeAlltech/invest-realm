import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstallments } from '@/hooks/useInstallments';

/**
 * Hook centralizado para métricas de contas.
 *
 * FONTE ÚNICA para "Saldo Parcelado":
 *   → useInstallments().getTotalPending()
 *   → Mesmo cálculo usado pelo card "Total Parcelado" em Contas a Pagar
 *
 * DÍVIDA TOTAL = Saldo Parcelado Oficial + Crédito à Vista
 * CONTAS TOTAIS = Contas Saldo + Dívida Total
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
  const { getTotalPending, isLoading: installmentsLoading } = useInstallments();

  const query = useQuery({
    queryKey: ['contas-totais-saldo-cartao', user?.id],
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

      // 2. Crédito à Vista (card_purchases sem included_in_statement_month)
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

      return { contasSaldo, creditoVista };
    },
    enabled: !!user,
  });

  const contasSaldo = query.data?.contasSaldo ?? 0;
  const creditoVista = query.data?.creditoVista ?? 0;

  // FONTE ÚNICA: exatamente o mesmo cálculo do card "Total Parcelado"
  const parcelasEmAberto = getTotalPending();

  return {
    contasSaldo,
    parcelasEmAberto,
    creditoVista,
    contasTotais: contasSaldo + parcelasEmAberto + creditoVista,
    dividaTotal: parcelasEmAberto + creditoVista,
    isLoading: query.isLoading || installmentsLoading,
  };
}
