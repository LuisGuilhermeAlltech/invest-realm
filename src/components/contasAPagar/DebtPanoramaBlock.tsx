import { usePanoramaMensal } from '@/hooks/usePanoramaMensal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface MiniTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      label: string;
      dividaInicioTotal: number;
      variacaoMensal: number;
      dividaSaldo: number;
      dividaParcelada: number;
      dividaCartao: number;
      temBaseComparativa: boolean;
    };
  }>;
  label?: string;
}

const MiniTooltip = ({ active, payload, label }: MiniTooltipProps) => {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const variacao = point.variacaoMensal;

  return (
    <div className="bg-card border border-border rounded-lg p-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Dívida no início: {formatCurrency(point.dividaInicioTotal)}
      </p>
      <p className="text-muted-foreground">
        Saldo: {formatCurrency(point.dividaSaldo)} | Parceladas: {formatCurrency(point.dividaParcelada)}
      </p>
      <p className="text-muted-foreground mb-1">
        Cartão à vista: {formatCurrency(point.dividaCartao)}
      </p>
      {point.temBaseComparativa ? (
        <p className={cn(
          'font-medium',
          variacao > 0 ? 'text-positive' : variacao < 0 ? 'text-negative' : 'text-muted-foreground'
        )}>
          Evolução: {variacao > 0 ? '+' : ''}{formatCurrency(variacao)}
        </p>
      ) : (
        <p className="text-muted-foreground">Sem base de comparação</p>
      )}
    </div>
  );
};

export function DebtPanoramaBlock() {
  const { months, lastMonth, isLoading } = usePanoramaMensal();

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <div className="text-muted-foreground text-sm text-center">Carregando evolução mensal...</div>
        </CardContent>
      </Card>
    );
  }

  const debtChartData = months.slice(-12).map((m) => {
    const variacao = m.variacaoAbsoluta ?? 0;
    return {
      ...m,
      variacaoMensal: variacao,
      label: m.label,
      temBaseComparativa: m.variacaoAbsoluta !== null,
      fill:
        variacao > 0
          ? 'hsl(var(--positive))'
          : variacao < 0
            ? 'hsl(var(--negative))'
            : 'hsl(var(--muted-foreground))',
    };
  });

  const hasComparativeData = debtChartData.some((point) => point.temBaseComparativa);
  const variacaoAtual = lastMonth?.variacaoAbsoluta ?? null;
  const variacaoPercentualAtual = lastMonth?.variacaoPercentual ?? null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Evolução Mensal das Contas a Pagar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Referência: saldo no início de cada mês (contas saldo + parceladas + cartão à vista).
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Dívida no Início do Mês Atual</span>
            <div className="text-2xl font-bold font-mono text-foreground">
              {lastMonth ? formatCurrency(lastMonth.dividaInicioTotal) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastMonth
                ? `Saldo: ${formatCurrency(lastMonth.dividaSaldo)} | Parceladas: ${formatCurrency(lastMonth.dividaParcelada)} | Cartão: ${formatCurrency(lastMonth.dividaCartao)}`
                : 'Sem dados suficientes'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Evolução vs Mês Anterior</span>
            {variacaoAtual !== null ? (
              <>
                <div className={cn(
                  'text-xl font-bold font-mono flex items-center gap-2',
                  variacaoAtual > 0
                    ? 'text-positive'
                    : variacaoAtual < 0
                      ? 'text-negative'
                      : 'text-muted-foreground'
                )}>
                  {variacaoAtual > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : variacaoAtual < 0 ? (
                    <TrendingDown className="h-5 w-5" />
                  ) : (
                    <Minus className="h-5 w-5" />
                  )}
                  {variacaoAtual > 0 ? '+' : ''}{formatCurrency(variacaoAtual)}
                </div>
                <p className={cn(
                  'text-xs font-medium',
                  variacaoAtual > 0
                    ? 'text-positive'
                    : variacaoAtual < 0
                      ? 'text-negative'
                      : 'text-muted-foreground'
                )}>
                  {variacaoPercentualAtual !== null
                    ? `${variacaoPercentualAtual > 0 ? '+' : ''}${(variacaoPercentualAtual * 100).toFixed(1)}%`
                    : 'Sem percentual calculável'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem mês anterior para comparar.</p>
            )}
          </div>
        </div>

        {hasComparativeData ? (
          <div className="h-[180px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(Number(v))}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  width={80}
                />
                <RechartsTooltip content={<MiniTooltip />} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar dataKey="variacaoMensal" name="Evolução Mensal" radius={[4, 4, 0, 0]}>
                  {debtChartData.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Sem histórico suficiente para exibir variação mensal.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Verde = redução de dívida no mês. Vermelho = aumento da dívida no mês.
        </p>
      </CardContent>
    </Card>
  );
}
