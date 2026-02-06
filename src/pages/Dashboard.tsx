import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useCapitalLiquido } from '@/hooks/useCapitalLiquido';
import { useDashboardConsolidado } from '@/hooks/useDashboardConsolidado';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatPercent, formatDateTime, formatDate } from '@/lib/formatters';
import { CLASSE_LABELS, ClasseAtivo } from '@/types/database';
import { 
  Wallet, TrendingUp, TrendingDown, Coins, Clock, Info, AlertCircle, Landmark, 
  PiggyBank, Receipt, ArrowUpCircle, ArrowDownCircle, Calendar, CreditCard,
  HandCoins, CircleDollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EvolucaoResumoBlock } from '@/components/dashboard/EvolucaoResumoBlock';
import { PanoramaResumoBlock } from '@/components/dashboard/PanoramaResumoBlock';

const MESES = [
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

export default function Dashboard() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  const { 
    totalCarteira, 
    custoTotalCarteira, 
    aportesDoMes, 
    proventosDoMes, 
    ultimaAtualizacao, 
    rebalanceamento, 
    temAtivosComPosicao,
    temPrecoAtualizado,
    totalCaixaBRL,
    patrimonioTotal,
    usdBrl,
    exchangeDate,
    isLoading 
  } = useDashboard();

  const { capitalDoBolsoBrl, isLoading: cliLoading } = useCapitalLiquido();

  const {
    financeiroReceitas,
    financeiroGastos,
    receberNoMes,
    recebidoNoMes,
    totalEmAbertoReceber,
    pagarNoMes,
    totalEmAbertoPagar,
    entradasDoMes,
    saidasDoMes,
    resultadoDoMes,
    proximosVencimentos,
    proximosRecebimentos,
    isLoading: consolidadoLoading,
  } = useDashboardConsolidado(selectedYear, selectedMonth);

  const formatExchangeDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr.split(' ')[0];
    }
  };

  const valorExibido = temPrecoAtualizado ? totalCarteira : custoTotalCarteira;
  const labelValor = temPrecoAtualizado ? 'Total em Ativos' : 'Custo Total (sem cotação)';

  // Generate years for filter (current year - 5 to current year + 1)
  const years = Array.from({ length: 7 }, (_, i) => currentDate.getFullYear() - 5 + i);

  if (isLoading || cliLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Month/Year Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">Visão consolidada do patrimônio, fluxo financeiro e compromissos.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {temAtivosComPosicao && !temPrecoAtualizado && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Preço atual não informado para todos os ativos. Acesse a página Carteira e clique em "Atualizar Preços" ou edite manualmente.
          </AlertDescription>
        </Alert>
      )}

      {/* Exchange rate indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5 w-fit">
        <span className="font-medium">USD/BRL:</span>
        <span className="font-mono">{usdBrl.toFixed(2)}</span>
        {exchangeDate && (
          <span className="text-muted-foreground/70">({formatExchangeDate(exchangeDate)})</span>
        )}
      </div>

      {/* Patrimônio Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-primary" />
          Patrimônio
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Total</CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-primary">
                {temPrecoAtualizado || totalCaixaBRL > 0 ? formatCurrency(patrimonioTotal) : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ativos + Caixa em BRL</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{labelValor}</CardTitle>
              <Wallet className="h-4 w-4 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono">{valorExibido > 0 ? formatCurrency(valorExibido) : '—'}</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Caixa Total (BRL)</CardTitle>
              <Landmark className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono">{formatCurrency(totalCaixaBRL)}</div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital do Bolso</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Somente dinheiro externo aportado. Proventos reinvestidos não contam como capital do bolso.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Receipt className="h-4 w-4 text-chart-5" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono">
                {formatCurrency(capitalDoBolsoBrl)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Dinheiro externo investido</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fluxo do Mês Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-chart-3" />
          Fluxo do Mês
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entradas do Mês</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Financeiro Receitas + Recebidos (A Receber)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <ArrowUpCircle className="h-4 w-4 text-positive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-positive">{formatCurrency(entradasDoMes)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Receitas: {formatCurrency(financeiroReceitas)} + Recebido: {formatCurrency(recebidoNoMes)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saídas do Mês</CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Gastos efetivamente pagos (Financeiro)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <ArrowDownCircle className="h-4 w-4 text-negative" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-negative">{formatCurrency(saidasDoMes)}</div>
              <p className="text-xs text-muted-foreground mt-1">Gastos efetivamente pagos</p>
            </CardContent>
          </Card>
          <Card className={cn("border-border", resultadoDoMes >= 0 ? "bg-positive/5" : "bg-negative/5")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado do Mês</CardTitle>
              {resultadoDoMes >= 0 ? (
                <TrendingUp className="h-4 w-4 text-positive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-negative" />
              )}
            </CardHeader>
            <CardContent>
              <div className={cn("text-xl font-bold font-mono", resultadoDoMes >= 0 ? "text-positive" : "text-negative")}>
                {formatCurrency(resultadoDoMes)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Entradas − Saídas</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Proventos do Mês</CardTitle>
              <Coins className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono">{formatCurrency(proventosDoMes)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contas - Visão do Mês */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-chart-2" />
          Contas – Visão do Mês
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">A Pagar no Mês</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-negative" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono">{formatCurrency(pagarNoMes)}</div>
              <p className="text-xs text-muted-foreground mt-1">Compromissos do mês (não pagos)</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">A Receber no Mês</CardTitle>
              <HandCoins className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono">{formatCurrency(receberNoMes)}</div>
              <p className="text-xs text-muted-foreground mt-1">Parcelas pendentes</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto (A Pagar)</CardTitle>
              <Wallet className="h-4 w-4 text-negative" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-negative">{formatCurrency(totalEmAbertoPagar)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total futuro</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Aberto (A Receber)</CardTitle>
              <HandCoins className="h-4 w-4 text-positive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-positive">{formatCurrency(totalEmAbertoReceber)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total pendente</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Próximos Eventos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos Vencimentos */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-negative" />
              Próximos Vencimentos (A Pagar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosVencimentos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum vencimento futuro.</p>
            ) : (
              <div className="space-y-3">
                {proximosVencimentos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-medium truncate">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.due_date)}</p>
                    </div>
                    <span className="font-mono font-medium text-negative">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos Recebimentos */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-positive" />
              Próximos Recebimentos (A Receber)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosRecebimentos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum recebimento pendente.</p>
            ) : (
              <div className="space-y-3">
                {proximosRecebimentos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-medium truncate">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">{item.payer} • {formatDate(item.due_date)}</p>
                    </div>
                    <span className="font-mono font-medium text-positive">{formatCurrency(item.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary cards - Aportes, Atualização */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aportes do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">{formatCurrency(aportesDoMes)}</div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última Atualização</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">{ultimaAtualizacao ? formatDateTime(ultimaAtualizacao) : 'Sem dados'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Patrimonial */}
      <EvolucaoResumoBlock />

      {/* Panorama Mensal */}
      <PanoramaResumoBlock />

      {/* Rebalanceamento */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Rebalanceamento</CardTitle>
        </CardHeader>
        <CardContent>
          {rebalanceamento.length === 0 ? (
            <p className="text-muted-foreground text-sm">Configure suas metas de alocação para ver o rebalanceamento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classe</TableHead>
                  <TableHead className="text-right">% Alvo</TableHead>
                  <TableHead className="text-right">Valor Atual</TableHead>
                  <TableHead className="text-right">Valor Ideal</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rebalanceamento.map((row) => (
                  <TableRow key={row.classe}>
                    <TableCell className="font-medium">{CLASSE_LABELS[row.classe as ClasseAtivo]}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(row.percentual_alvo / 100)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.valor_atual || 0)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.valor_ideal || 0)}</TableCell>
                    <TableCell className={cn('text-right font-mono', row.diferenca > 0 ? 'text-positive' : row.diferenca < 0 ? 'text-negative' : '')}>
                      {formatCurrency(row.diferenca || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
