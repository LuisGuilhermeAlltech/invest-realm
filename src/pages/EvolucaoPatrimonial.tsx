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
  Legend,
  ReferenceDot,
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

export default function EvolucaoPatrimonial() {
  const { data, isLoading } = useEvolucaoPatrimonial();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Sem dados disponíveis.</div>
      </div>
    );
  }

  const {
    capitalDoBolso,
    patrimonioAtual,
    ganhoAbsoluto,
    ganhoPercentual,
    proventosAcumulados,
    investidosPorMes,
    hasPatrimonioHistorico,
  } = data;

  // Chart data: add patrimônio as last point only
  const chartData = investidosPorMes.map((m, idx) => ({
    ...m,
    patrimonio: idx === investidosPorMes.length - 1 ? patrimonioAtual : undefined,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Headline */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Evolução Patrimonial</h1>
        <p className="text-lg text-muted-foreground">
          Desde janeiro de 2024, você ganhou{' '}
          <span className={cn('font-bold font-mono', ganhoAbsoluto >= 0 ? 'text-positive' : 'text-negative')}>
            {formatCurrency(ganhoAbsoluto)}
          </span>
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Capital do Bolso</CardTitle>
            <Wallet className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">{formatCurrency(capitalDoBolso)}</div>
            <p className="text-xs text-muted-foreground mt-1">Dinheiro externo aportado</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Atual</CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono text-primary">{formatCurrency(patrimonioAtual)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ativos + Caixa</p>
          </CardContent>
        </Card>

        <Card className={cn("border-border", ganhoAbsoluto >= 0 ? "bg-positive/5" : "bg-negative/5")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganho (R$)</CardTitle>
            <TrendingUp className="h-4 w-4 text-positive" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-xl font-bold font-mono", ganhoAbsoluto >= 0 ? "text-positive" : "text-negative")}>
              {formatCurrency(ganhoAbsoluto)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Patrimônio − Capital do Bolso</p>
          </CardContent>
        </Card>

        <Card className={cn("border-border", ganhoPercentual >= 0 ? "bg-positive/5" : "bg-negative/5")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganho (%)</CardTitle>
            <BarChart3 className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-xl font-bold font-mono", ganhoPercentual >= 0 ? "text-positive" : "text-negative")}>
              {formatPercent(ganhoPercentual)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Rentabilidade total</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proventos</CardTitle>
            <Coins className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono">{formatCurrency(proventosAcumulados)}</div>
            <p className="text-xs text-muted-foreground mt-1">Acumulados desde Jan/2024</p>
          </CardContent>
        </Card>
      </div>

      {/* Warning about patrimônio histórico */}
      {!hasPatrimonioHistorico && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Patrimônio mensal requer snapshots; exibindo apenas o valor atual.
          </AlertDescription>
        </Alert>
      )}

      {/* Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Evolução Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  name="Capital do Bolso"
                  stroke="hsl(217, 91%, 40%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {/* Patrimônio: only last point */}
                <Line
                  type="monotone"
                  dataKey="patrimonio"
                  name="Patrimônio Atual"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={0}
                  dot={{ r: 6, fill: 'hsl(142, 71%, 45%)' }}
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
