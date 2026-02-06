import { useContasTotais } from '@/hooks/useContasTotais';
import { usePanoramaMensal } from '@/hooks/usePanoramaMensal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

export function DebtPanoramaBlock() {
  const { parcelasEmAberto, creditoVista, dividaTotal, isLoading: contasLoading } = useContasTotais();
  const { months, lastMonth, prevMonth, varDivida, isLoading: panoramaLoading } = usePanoramaMensal();

  const isLoading = contasLoading || panoramaLoading;

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <div className="text-muted-foreground text-sm text-center">Carregando panorama...</div>
        </CardContent>
      </Card>
    );
  }

  // Build debt trend data from monthly panorama
  const debtChartData = months.slice(-12).map(m => ({
    label: m.label,
    dividaTotal: m.dividaTotal,
  }));

  // Calculate streak (consecutive months of growth or reduction)
  let streak = 0;
  let streakDirection: 'up' | 'down' | 'stable' = 'stable';
  if (months.length >= 2) {
    // Check from the end backwards
    for (let i = months.length - 1; i >= 1; i--) {
      const curr = months[i].dividaTotal;
      const prev = months[i - 1].dividaTotal;
      if (i === months.length - 1) {
        if (curr > prev) {
          streakDirection = 'up';
          streak = 1;
        } else if (curr < prev) {
          streakDirection = 'down';
          streak = 1;
        } else {
          break;
        }
      } else {
        if (streakDirection === 'up' && curr > prev) {
          streak++;
        } else if (streakDirection === 'down' && curr < prev) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // Variation
  const varAbsolute = lastMonth && prevMonth
    ? lastMonth.dividaTotal - prevMonth.dividaTotal
    : null;

  const formatVar = (v: number | null) => {
    if (v === null) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${(v * 100).toFixed(1)}%`;
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-negative" />
          Panorama de Dívidas (Global)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Dívida Total Atual */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-muted-foreground">Dívida Total Atual</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Saldo Parcelado Oficial + Cartão à Vista não incluído em fatura</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-2xl font-bold font-mono text-negative">
              {formatCurrency(dividaTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Parceladas: {formatCurrency(parcelasEmAberto)} | Cartão: {formatCurrency(creditoVista)}
            </p>
          </div>

          {/* Variação vs mês anterior */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Variação vs Mês Anterior</span>
            {varAbsolute !== null && varDivida !== null ? (
              <>
                <div className={cn(
                  "text-xl font-bold font-mono flex items-center gap-2",
                  varAbsolute > 0 ? "text-negative" : varAbsolute < 0 ? "text-positive" : "text-muted-foreground"
                )}>
                  {varAbsolute > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : varAbsolute < 0 ? (
                    <TrendingDown className="h-5 w-5" />
                  ) : (
                    <Minus className="h-5 w-5" />
                  )}
                  {varAbsolute > 0 ? '+' : ''}{formatCurrency(varAbsolute)}
                </div>
                <p className={cn(
                  "text-xs font-medium",
                  varDivida > 0 ? "text-negative" : varDivida < 0 ? "text-positive" : "text-muted-foreground"
                )}>
                  {formatVar(varDivida)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados do mês anterior</p>
            )}
          </div>

          {/* Sequência */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Tendência</span>
            {streak > 0 ? (
              <>
                <div className={cn(
                  "text-lg font-bold flex items-center gap-2",
                  streakDirection === 'up' ? "text-negative" : "text-positive"
                )}>
                  {streakDirection === 'up' ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {streakDirection === 'up' ? 'Em alta' : 'Em queda'} há {streak} {streak === 1 ? 'mês' : 'meses'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {streakDirection === 'up' ? '⚠️ Atenção à tendência de crescimento' : '✅ Tendência positiva de redução'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Estável ou sem histórico suficiente</p>
            )}
          </div>
        </div>

        {/* Mini debt chart */}
        {debtChartData.length > 1 && (
          <div className="h-[180px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={debtChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  width={50}
                />
                <RechartsTooltip content={<MiniTooltip />} />
                <Area
                  type="monotone"
                  dataKey="dividaTotal"
                  name="Dívida Total"
                  stroke="hsl(0, 72%, 51%)"
                  strokeWidth={2}
                  fill="url(#debtGradient)"
                  dot={{ r: 3, fill: 'hsl(0, 72%, 51%)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {debtChartData.length <= 1 && (
          <p className="text-xs text-muted-foreground italic">
            Sem histórico completo para exibir gráfico de tendência.
          </p>
        )}
      </CardContent>
    </Card>
  );
}