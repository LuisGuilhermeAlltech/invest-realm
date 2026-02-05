import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown, Calendar, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useContasAPagar } from '@/hooks/useContasAPagar';
import { useInstallments } from '@/hooks/useInstallments';
import { useReceivables } from '@/hooks/useReceivables';

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function ContasDashboard() {
  const hoje = new Date();
  const [selectedMonth, setSelectedMonth] = useState(hoje.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(hoje.getFullYear());

  const { resumo: payableResumo, contasParceladas } = useContasAPagar();
  const { getMonthlyCommitment, getNextDueInstallments } = useInstallments();
  const { getSummary, getNextReceivables } = useReceivables();

  const receivableSummary = useMemo(() => {
    return getSummary(selectedYear, selectedMonth);
  }, [getSummary, selectedYear, selectedMonth]);

  const payableMonthly = useMemo(() => {
    return getMonthlyCommitment(selectedYear, selectedMonth);
  }, [getMonthlyCommitment, selectedYear, selectedMonth]);

  const nextPayables = useMemo(() => {
    const nextInstallments = getNextDueInstallments(5);
    // Enrich with bill info
    return nextInstallments.map(inst => {
      const conta = contasParceladas.find(c => c.id === inst.conta_pagar_id);
      return {
        id: inst.id,
        due_date: inst.due_date,
        amount: inst.amount,
        installment_number: inst.installment_number,
        descricao: conta?.descricao || 'Conta',
        total_parcelas: conta?.total_parcelas || 0,
      };
    });
  }, [getNextDueInstallments, contasParceladas]);

  const nextReceivables = useMemo(() => {
    return getNextReceivables(5);
  }, [getNextReceivables]);

  // Calculate net result
  const netResult = receivableSummary.receivedMonth - payableMonthly;

  const years = [2024, 2025, 2026];

  return (
    <div className="space-y-6">
      {/* Month/Year Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* A Pagar no Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar no Mês</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(payableMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">
              Parcelas + Saldos
            </p>
          </CardContent>
        </Card>

        {/* A Receber no Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber no Mês</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(receivableSummary.toReceiveMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pendente de recebimento
            </p>
          </CardContent>
        </Card>

        {/* Recebido no Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido no Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(receivableSummary.receivedMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Já recebido
            </p>
          </CardContent>
        </Card>

        {/* Resultado Líquido */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
            {netResult >= 0 ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netResult >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(netResult)}
            </div>
            <p className="text-xs text-muted-foreground">
              Recebido - A Pagar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next items */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Próximos Vencimentos (A Pagar) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Próximos Vencimentos (A Pagar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextPayables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum vencimento próximo
              </p>
            ) : (
              <div className="space-y-3">
                {nextPayables.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.due_date)} • {item.installment_number}/{item.total_parcelas}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-destructive">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Recebimentos (A Receber) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Próximos Recebimentos (A Receber)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextReceivables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum recebimento próximo
              </p>
            ) : (
              <div className="space-y-3">
                {nextReceivables.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.due_date)} • {item.payer}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-primary">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em Aberto (A Pagar)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">
              {formatCurrency(payableResumo.totalEmAberto)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em Aberto (A Receber)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-primary">
              {formatCurrency(receivableSummary.totalPending)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Parcelas Atrasadas (Receber)
              {receivableSummary.overdueCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${receivableSummary.overdueCount > 0 ? 'text-destructive' : ''}`}>
              {receivableSummary.overdueCount}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
