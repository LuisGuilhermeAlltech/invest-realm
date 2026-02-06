import { useEvolucaoPatrimonial } from '@/hooks/useEvolucaoPatrimonial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { TrendingUp, Wallet, PiggyBank, Coins, BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

const MiniTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export function EvolucaoResumoBlock() {
  const { data, isLoading } = useEvolucaoPatrimonial();

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <div className="text-muted-foreground text-sm text-center">Carregando evolução...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const {
    capitalDoBolso,
    patrimonioAtual,
    ganhoAbsoluto,
    ganhoPercentual,
    proventosAcumulados,
    investidosPorMes,
    hasPatrimonioHistorico,
  } = data;

  const chartData = investidosPorMes.map((m, idx) => ({
    ...m,
    patrimonio: idx === investidosPorMes.length - 1 ? patrimonioAtual : undefined,
  }));

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-chart-4" />
        Evolução Patrimonial
      </h2>

      {/* Headline */}
      <p className="text-sm text-muted-foreground">
        Desde janeiro de 2024, você ganhou{' '}
        <span className={cn('font-bold font-mono', ganhoAbsoluto >= 0 ? 'text-positive' : 'text-negative')}>
          {formatCurrency(ganhoAbsoluto)}
        </span>
      </p>

      {/* Mini cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Capital do Bolso</CardTitle>
            <Wallet className="h-3 w-3 text-chart-1" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-base font-bold font-mono">{formatCurrency(capitalDoBolso)}</div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Patrimônio Atual</CardTitle>
            <PiggyBank className="h-3 w-3 text-primary" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-base font-bold font-mono text-primary">{formatCurrency(patrimonioAtual)}</div>
          </CardContent>
        </Card>

        <Card className={cn("border-border", ganhoAbsoluto >= 0 ? "bg-positive/5" : "bg-negative/5")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ganho (R$)</CardTitle>
            <TrendingUp className="h-3 w-3 text-positive" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={cn("text-base font-bold font-mono", ganhoAbsoluto >= 0 ? "text-positive" : "text-negative")}>
              {formatCurrency(ganhoAbsoluto)}
            </div>
          </CardContent>
        </Card>

        <Card className={cn("border-border", ganhoPercentual >= 0 ? "bg-positive/5" : "bg-negative/5")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ganho (%)</CardTitle>
            <BarChart3 className="h-3 w-3 text-chart-4" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={cn("text-base font-bold font-mono", ganhoPercentual >= 0 ? "text-positive" : "text-negative")}>
              {formatPercent(ganhoPercentual)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Proventos</CardTitle>
            <Coins className="h-3 w-3 text-chart-3" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-base font-bold font-mono">{formatCurrency(proventosAcumulados)}</div>
          </CardContent>
        </Card>
      </div>

      {!hasPatrimonioHistorico && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10 py-2">
          <AlertCircle className="h-3 w-3 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
            Patrimônio mensal requer snapshots; exibindo apenas o valor atual.
          </AlertDescription>
        </Alert>
      )}

      {/* Mini chart */}
      <Card className="border-border">
        <CardContent className="pt-4 pb-2">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  width={50}
                />
                <RechartsTooltip content={<MiniTooltip />} />
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  name="Capital do Bolso"
                  stroke="hsl(217, 91%, 40%)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="patrimonio"
                  name="Patrimônio Atual"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={0}
                  dot={{ r: 5, fill: 'hsl(142, 71%, 45%)' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
