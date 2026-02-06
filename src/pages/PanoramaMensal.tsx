import { usePanoramaMensal, PanoramaInsight } from '@/hooks/usePanoramaMensal';
import { useContasTotais } from '@/hooks/useContasTotais';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Info,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-md">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

const InsightIcon = ({ type }: { type: PanoramaInsight['type'] }) => {
  switch (type) {
    case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case 'success': return <CheckCircle className="h-4 w-4 text-positive shrink-0" />;
    case 'info': return <Info className="h-4 w-4 text-chart-1 shrink-0" />;
  }
};

export default function PanoramaMensal() {
  const {
    months,
    lastMonth,
    varDespesas,
    varReceitas,
    varDivida,
    insights,
    isLoading,
  } = usePanoramaMensal();

  const { contasTotais, contasSaldo, parcelasEmAberto, creditoVista, dividaTotal: dividaTotalGlobal, isLoading: contasLoading } = useContasTotais();

  if (isLoading || contasLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!lastMonth) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Panorama Mensal</h1>
        <p className="text-muted-foreground">Nenhum dado financeiro encontrado. Cadastre meses no módulo Financeiro para visualizar o panorama.</p>
      </div>
    );
  }

  const formatVar = (v: number | null) => {
    if (v === null) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${(v * 100).toFixed(1)}%`;
  };

  // Find peak debt
  const monthsWithDebt = months.filter(m => m.dividaTotal > 0);
  const peakDebt = monthsWithDebt.length > 0
    ? monthsWithDebt.reduce((max, m) => m.dividaTotal > max.dividaTotal ? m : max, monthsWithDebt[0])
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Panorama Mensal</h1>

      {/* Cards últimos mês */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-positive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-positive">{formatCurrency(lastMonth.receitas)}</div>
            {varReceitas !== null && (
              <p className={cn("text-xs mt-1 font-medium", varReceitas >= 0 ? "text-positive" : "text-negative")}>
                {formatVar(varReceitas)} vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-negative" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-negative">{formatCurrency(lastMonth.despesas)}</div>
            {varDespesas !== null && (
              <p className={cn("text-xs mt-1 font-medium", varDespesas <= 0 ? "text-positive" : "text-negative")}>
                {formatVar(varDespesas)} vs mês anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={cn("border-border", lastMonth.resultado >= 0 ? "bg-positive/5" : "bg-negative/5")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
            {lastMonth.resultado >= 0 ? (
              <TrendingUp className="h-4 w-4 text-positive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-negative" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn("text-xl font-bold font-mono", lastMonth.resultado >= 0 ? "text-positive" : "text-negative")}>
              {formatCurrency(lastMonth.resultado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receitas − Despesas</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Investimentos</CardTitle>
            <PiggyBank className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">{formatCurrency(lastMonth.investimentos)}</div>
            <p className="text-xs text-muted-foreground mt-1">Aportes no mês</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contas Totais</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Saldo: {formatCurrency(contasSaldo)} + Parceladas: {formatCurrency(parcelasEmAberto)} + Cartão: {formatCurrency(creditoVista)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Wallet className="h-4 w-4 text-negative" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-negative">{formatCurrency(contasTotais)}</div>
            <p className="text-xs text-muted-foreground mt-1">Saldo + Parceladas + Cartão</p>
          </CardContent>
        </Card>
      </div>

      {/* Debt Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-negative" />
          Dívidas (Parceladas + Cartão)
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dívida do Mês</CardTitle>
              <CreditCard className="h-4 w-4 text-negative" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-negative">{formatCurrency(lastMonth.dividaTotal)}</div>
              {varDivida !== null && (
                <p className={cn("text-xs mt-1 font-medium", varDivida <= 0 ? "text-positive" : "text-negative")}>
                  {formatVar(varDivida)} vs mês anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dívida Global</CardTitle>
              <Wallet className="h-4 w-4 text-negative" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono text-negative">{formatCurrency(dividaTotalGlobal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Parceladas + Cartão (total)</p>
            </CardContent>
          </Card>

          {peakDebt && (
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pico de Dívida</CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono text-amber-600">{formatCurrency(peakDebt.dividaTotal)}</div>
                <p className="text-xs text-muted-foreground mt-1">{peakDebt.label}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Receitas, Despesas, Investimentos e Dívidas por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={months} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  width={60}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(142, 71%, 45%)" radius={[2, 2, 0, 0]} barSize={18} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 72%, 51%)" radius={[2, 2, 0, 0]} barSize={18} />
                <Bar dataKey="investimentos" name="Investimentos" fill="hsl(217, 91%, 40%)" radius={[2, 2, 0, 0]} barSize={18} />
                <Line
                  type="monotone"
                  dataKey="resultado"
                  name="Resultado"
                  stroke="hsl(280, 65%, 60%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="dividaTotal"
                  name="Dívida Total"
                  stroke="hsl(25, 95%, 53%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: 'hsl(25, 95%, 53%)' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-chart-3" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <InsightIcon type={insight.type} />
                <span className="text-foreground">{insight.text}</span>
              </div>
            ))}
            {insights.length === 0 && (
              <p className="text-muted-foreground text-sm">Sem insights disponíveis ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
                <TableHead className="text-right">Investimentos</TableHead>
                <TableHead className="text-right">Dívida</TableHead>
                <TableHead className="text-right">Var. Despesas</TableHead>
                <TableHead className="text-right">Var. Receitas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...months].reverse().map((m, idx) => {
                const originalIdx = months.length - 1 - idx;
                const prev = originalIdx > 0 ? months[originalIdx - 1] : null;
                const vDespesas = prev && prev.despesas > 0
                  ? (m.despesas - prev.despesas) / prev.despesas
                  : null;
                const vReceitas = prev && prev.receitas > 0
                  ? (m.receitas - prev.receitas) / prev.receitas
                  : null;
                return (
                  <TableRow key={`${m.ano}-${m.mes}`}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right font-mono text-positive">{formatCurrency(m.receitas)}</TableCell>
                    <TableCell className="text-right font-mono text-negative">{formatCurrency(m.despesas)}</TableCell>
                    <TableCell className={cn("text-right font-mono", m.resultado >= 0 ? "text-positive" : "text-negative")}>
                      {formatCurrency(m.resultado)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(m.investimentos)}</TableCell>
                    <TableCell className="text-right font-mono text-negative">
                      {m.dividaTotal > 0 ? formatCurrency(m.dividaTotal) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {vDespesas !== null ? (
                        <Badge variant={vDespesas <= 0 ? "default" : "destructive"} className="font-mono text-xs">
                          {formatVar(vDespesas)}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {vReceitas !== null ? (
                        <Badge variant={vReceitas >= 0 ? "default" : "destructive"} className="font-mono text-xs">
                          {formatVar(vReceitas)}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
