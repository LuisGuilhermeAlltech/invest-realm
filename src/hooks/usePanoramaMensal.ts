import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';

export interface MonthData {
  ano: number;
  mes: number;
  label: string;
  dividaSaldo: number;
  dividaParcelada: number;
  dividaCartao: number;
  dividaInicioTotal: number;
  variacaoAbsoluta: number | null;
  variacaoPercentual: number | null;
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function usePanoramaMensal() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['panorama-mensal', user?.id],
    queryFn: async () => {
      if (!user) return { months: [] as MonthData[] };

      const [
        contasResponse,
        movimentacoesResponse,
        installmentsResponse,
        cardPurchasesResponse,
      ] = await Promise.all([
        supabase
          .from('contas_a_pagar')
          .select('id, modo, saldo_inicial, created_at')
          .eq('user_id', user.id),
        supabase
          .from('contas_saldo_movimentacoes')
          .select('conta_pagar_id, data, saldo_resultante, created_at')
          .eq('user_id', user.id),
        supabase
          .from('installments')
          .select('conta_pagar_id, due_date, amount')
          .eq('user_id', user.id),
        supabase
          .from('card_purchases')
          .select('purchase_date, amount, included_in_statement_month')
          .eq('user_id', user.id),
      ]);

      if (contasResponse.error) throw contasResponse.error;
      if (movimentacoesResponse.error) throw movimentacoesResponse.error;
      if (installmentsResponse.error) throw installmentsResponse.error;
      if (cardPurchasesResponse.error) throw cardPurchasesResponse.error;

      type ContaDebtRow = {
        id: string;
        modo: 'parcelada' | 'saldo';
        saldo_inicial: number | null;
        created_at: string;
      };

      type MovimentacaoSaldoRow = {
        conta_pagar_id: string;
        data: string;
        saldo_resultante: number;
        created_at: string;
      };

      type InstallmentRow = {
        conta_pagar_id: string;
        due_date: string;
        amount: number;
      };

      type CardPurchaseRow = {
        purchase_date: string;
        amount: number;
        included_in_statement_month: string | null;
      };

      const contas = (contasResponse.data || []) as ContaDebtRow[];
      const movimentacoes = (movimentacoesResponse.data || []) as MovimentacaoSaldoRow[];
      const installments = (installmentsResponse.data || []) as InstallmentRow[];
      const cardPurchases = (cardPurchasesResponse.data || []) as CardPurchaseRow[];

      const toNumber = (value: number | string | null | undefined) => Number(value || 0) || 0;
      const safeDate = (dateValue: string | null | undefined) => {
        if (!dateValue) return null;
        const parsed = parseISO(dateValue);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };
      const datePart = (dateValue: string) => dateValue.slice(0, 10);

      const contaCreatedMap = new Map<string, string>();
      contas.forEach((conta) => {
        contaCreatedMap.set(conta.id, datePart(conta.created_at));
      });

      const movimentosPorConta = new Map<string, MovimentacaoSaldoRow[]>();
      movimentacoes.forEach((mov) => {
        if (!movimentosPorConta.has(mov.conta_pagar_id)) {
          movimentosPorConta.set(mov.conta_pagar_id, []);
        }
        movimentosPorConta.get(mov.conta_pagar_id)!.push(mov);
      });
      movimentosPorConta.forEach((lista) => {
        lista.sort((a, b) => {
          if (a.data === b.data) {
            return a.created_at.localeCompare(b.created_at);
          }
          return a.data.localeCompare(b.data);
        });
      });

      const baseDates = [
        ...contas.map((conta) => safeDate(conta.created_at)),
        ...installments.map((inst) => safeDate(inst.due_date)),
        ...cardPurchases.map((purchase) => safeDate(purchase.purchase_date)),
      ].filter((d): d is Date => d !== null);

      if (baseDates.length === 0) {
        return { months: [] as MonthData[] };
      }

      const firstMonth = startOfMonth(
        baseDates.reduce((oldest, current) =>
          current.getTime() < oldest.getTime() ? current : oldest
        )
      );
      const currentMonth = startOfMonth(new Date());
      const contasSaldo = contas.filter((conta) => conta.modo === 'saldo');
      const months: MonthData[] = [];

      for (let cursor = firstMonth; cursor <= currentMonth; cursor = addMonths(cursor, 1)) {
        const snapshotDate = format(cursor, 'yyyy-MM-dd');
        const snapshotMonth = format(cursor, 'yyyy-MM');

        let dividaSaldo = 0;
        contasSaldo.forEach((conta) => {
          const createdAtDate = contaCreatedMap.get(conta.id);
          if (!createdAtDate || createdAtDate >= snapshotDate) return;

          const listaMovimentacoes = movimentosPorConta.get(conta.id) || [];
          let saldoNoInicioMes = toNumber(conta.saldo_inicial);

          for (let i = listaMovimentacoes.length - 1; i >= 0; i -= 1) {
            if (listaMovimentacoes[i].data < snapshotDate) {
              saldoNoInicioMes = toNumber(listaMovimentacoes[i].saldo_resultante);
              break;
            }
          }

          dividaSaldo += Math.max(saldoNoInicioMes, 0);
        });

        let dividaParcelada = 0;
        installments.forEach((inst) => {
          const createdAtDate = contaCreatedMap.get(inst.conta_pagar_id);
          if (createdAtDate && createdAtDate >= snapshotDate) return;
          if (inst.due_date >= snapshotDate) {
            dividaParcelada += toNumber(inst.amount);
          }
        });

        let dividaCartao = 0;
        cardPurchases.forEach((purchase) => {
          if (purchase.purchase_date >= snapshotDate) return;
          if (
            purchase.included_in_statement_month &&
            purchase.included_in_statement_month < snapshotMonth
          ) {
            return;
          }
          dividaCartao += toNumber(purchase.amount);
        });

        const dividaInicioTotal = dividaSaldo + dividaParcelada + dividaCartao;
        const ano = cursor.getFullYear();
        const mes = cursor.getMonth() + 1;

        months.push({
          ano,
          mes,
          label: `${MONTH_SHORT[mes - 1]}/${String(ano).slice(2)}`,
          dividaSaldo,
          dividaParcelada,
          dividaCartao,
          dividaInicioTotal,
          variacaoAbsoluta: null,
          variacaoPercentual: null,
        });
      }

      const monthsWithVariation = months.map((month, idx) => {
        if (idx === 0) return month;

        const previousMonthDebt = months[idx - 1].dividaInicioTotal;
        const variacaoAbsoluta = previousMonthDebt - month.dividaInicioTotal;
        const variacaoPercentual =
          previousMonthDebt > 0 ? variacaoAbsoluta / previousMonthDebt : null;

        return {
          ...month,
          variacaoAbsoluta,
          variacaoPercentual,
        };
      });

      return { months: monthsWithVariation };
    },
    enabled: !!user,
  });

  const months = query.data?.months ?? [];
  const lastMonth = months.length > 0 ? months[months.length - 1] : null;
  const prevMonth = months.length > 1 ? months[months.length - 2] : null;

  return {
    months,
    lastMonth,
    prevMonth,
    isLoading: query.isLoading,
  };
}
