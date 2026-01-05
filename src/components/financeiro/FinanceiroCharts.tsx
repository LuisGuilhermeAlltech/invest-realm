import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FinanceiroMensal } from '@/hooks/useFinanceiroMensal';
import { GastoPorTipo } from '@/hooks/useCategoriasFinanceiras';
import { GastoTipoComLimite } from '@/hooks/useLimitesTipoGasto';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Color palette for types
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface FinanceiroChartsProps {
  meses: FinanceiroMensal[];
  gastosPorTipo?: GastoPorTipo[];
  selectedMesId?: string | null;
}

export function ReceitasGastosChart({ meses }: { meses: FinanceiroMensal[] }) {
  // Get last 6 months, ordered chronologically
  const chartData = [...meses]
    .sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    })
    .slice(-6)
    .map((m) => ({
      name: `${MESES_CURTOS[m.mes - 1]}/${m.ano.toString().slice(-2)}`,
      receitas: Number(m.total_receitas),
      gastos: Number(m.total_gastos),
    }));

  if (!chartData.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Receitas x Gastos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value, 'BRL')}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--positive))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="hsl(var(--negative))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function GastosPorTipoChart({ gastosPorTipo }: { gastosPorTipo: GastoPorTipo[] }) {
  const chartData = gastosPorTipo
    .filter(g => Number(g.total_gasto) > 0 && g.tipo_nome)
    .map((g, index) => ({
      name: g.tipo_nome || 'Sem tipo',
      value: Number(g.total_gasto),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  if (!chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Sem gastos categorizados
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gastos por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value, 'BRL')}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Get color class based on percentage
function getPercentualColor(percentual: number): string {
  if (percentual >= 90) return 'text-red-600';
  if (percentual >= 70) return 'text-amber-600';
  return 'text-green-600';
}

function getProgressColor(percentual: number): string {
  if (percentual >= 90) return '[&>div]:bg-red-500';
  if (percentual >= 70) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-green-500';
}

// Updated component with limits
export function TotaisPorTipoCardsComLimites({ gastosTipoComLimites }: { gastosTipoComLimites: GastoTipoComLimite[] }) {
  if (!gastosTipoComLimites.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {gastosTipoComLimites.map((t, index) => {
        const percentual = t.percentual;
        const colorClass = getPercentualColor(percentual);
        const progressClass = getProgressColor(percentual);

        return (
          <Card key={t.categoria_tipo || index}>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground font-medium">{t.tipo_nome}</div>
              <div className={cn("text-xl font-bold mt-1", colorClass)}>
                {formatCurrency(t.total_gasto, 'BRL')}
              </div>
              {t.limite_mensal > 0 && (
                <>
                  <div className="text-xs text-muted-foreground mt-1">
                    Limite: {formatCurrency(t.limite_mensal, 'BRL')}
                  </div>
                  <Progress 
                    value={Math.min(percentual, 100)} 
                    className={cn("h-1.5 mt-2", progressClass)}
                  />
                  <div className={cn("text-xs font-medium mt-1", colorClass)}>
                    {percentual.toFixed(0)}% utilizado
                  </div>
                </>
              )}
              {t.limite_mensal === 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Sem limite definido
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Legacy component for backwards compatibility
export function TotaisPorTipoCards({ gastosPorTipo }: { gastosPorTipo: GastoPorTipo[] }) {
  // Group by tipo_nome and sum totals
  const totaisByTipo = gastosPorTipo.reduce((acc, g) => {
    const tipoNome = g.tipo_nome || 'Sem tipo';
    acc[tipoNome] = (acc[tipoNome] || 0) + Number(g.total_gasto);
    return acc;
  }, {} as Record<string, number>);

  const totais = Object.entries(totaisByTipo).map(([nome, total], index) => ({
    nome,
    total,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  if (!totais.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {totais.map((t) => (
        <Card key={t.nome}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t.nome}</div>
            <div 
              className="text-xl font-bold mt-1"
              style={{ color: t.color }}
            >
              {formatCurrency(t.total, 'BRL')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
