import { usePanoramaMensal } from '@/hooks/usePanoramaMensal';
import { useContasTotais } from '@/hooks/useContasTotais';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BarChart3,
  ExternalLink,
  Wallet,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
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

export function PanoramaResumoBlock() {
  const {
    months,
    lastMonth,
    varDespesas,
    varReceitas,
    isLoading,
  } = usePanoramaMensal();

  const { contasTotais, contasSaldo, parcelasEmAberto, creditoVista, isLoading: contasLoading } = useContasTotais();

  if (isLoading || contasLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8">
          <div className="text-muted-foreground text-sm text-center">Carregando panorama...</div>
        </CardContent>
      </Card>
    );
  }

  if (!lastMonth) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-chart-2" />
          Panorama Mensal
        </h2>
        <Card className="border-border">
          <CardContent className="py-6">
            <p className="text-muted-foreground text-sm text-center">
              Nenhum dado financeiro encontrado. Cadastre meses no Financeiro para visualizar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatVar = (v: number | null) => {
    if (v === null) return null;
    const sign = v > 0 ? '+' : '';
    return `${sign}${(v * 100).toFixed(1)}%`;
  };

  // Use last 6 months for chart
  const chartData = months.slice(-6);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-chart-2" />
          Panorama Mensal
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/panorama" className="gap-1 text-xs">
            Ver detalhes <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      {/* Mini cards - last month */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Receitas</CardTitle>
            <ArrowUpCircle className="h-3 w-3 text-positive" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-base font-bold font-mono text-positive">{formatCurrency(lastMonth.receitas)}</div>
            {formatVar(varReceitas) && (
              <p className={cn("text-[10px] mt-0.5 font-medium", (varReceitas ?? 0) >= 0 ? "text-positive" : "text-negative")}>
                {formatVar(varReceitas)} vs anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Despesas</CardTitle>
            <ArrowDownCircle className="h-3 w-3 text-negative" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-base font-bold font-mono text-negative">{formatCurrency(lastMonth.despesas)}</div>
            {formatVar(varDespesas) && (
              <p className={cn("text-[10px] mt-0.5 font-medium", (varDespesas ?? 0) <= 0 ? "text-positive" : "text-negative")}>
                {formatVar(varDespesas)} vs anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={cn("border-border", lastMonth.resultado >= 0 ? "bg-positive/5" : "bg-negative/5")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Resultado</CardTitle>
            {lastMonth.resultado >= 0 ? (
              <TrendingUp className="h-3 w-3 text-positive" />
            ) : (
              <TrendingDown className="h-3 w-3 text-negative" />
            )}
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className={cn("text-base font-bold font-mono", lastMonth.resultado >= 0 ? "text-positive" : "text-negative")}>
              {formatCurrency(lastMonth.resultado)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Investimentos</CardTitle>
            <PiggyBank className="h-3 w-3 text-chart-1" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-base font-bold font-mono">{formatCurrency(lastMonth.investimentos)}</div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <div className="flex items-center gap-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Contas Totais</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-2.5 w-2.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">Saldo: {formatCurrency(contasSaldo)} + Parc: {formatCurrency(parcelasEmAberto)} + Cartão: {formatCurrency(creditoVista)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Wallet className="h-3 w-3 text-negative" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-base font-bold font-mono text-negative">{formatCurrency(contasTotais)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Mini chart */}
      {chartData.length > 1 && (
        <Card className="border-border">
          <CardContent className="pt-4 pb-2">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(142, 71%, 45%)" radius={[2, 2, 0, 0]} barSize={12} />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(0, 72%, 51%)" radius={[2, 2, 0, 0]} barSize={12} />
                  <Bar dataKey="investimentos" name="Investimentos" fill="hsl(217, 91%, 40%)" radius={[2, 2, 0, 0]} barSize={12} />
                  <Line
                    type="monotone"
                    dataKey="resultado"
                    name="Resultado"
                    stroke="hsl(280, 65%, 60%)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="dividaTotal"
                    name="Dívida"
                    stroke="hsl(25, 95%, 53%)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: 'hsl(25, 95%, 53%)' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
