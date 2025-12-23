import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FinanceiroMensal } from '@/hooks/useFinanceiroMensal';
import { GastoPorTipo, TIPOS_CATEGORIA, TipoCategoriaFinanceira } from '@/hooks/useCategoriasFinanceiras';
import { formatCurrency } from '@/lib/formatters';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
    .filter(g => Number(g.total_gasto) > 0)
    .map((g) => ({
      name: TIPOS_CATEGORIA[g.categoria_tipo as TipoCategoriaFinanceira]?.label || g.categoria_tipo,
      value: Number(g.total_gasto),
      color: TIPOS_CATEGORIA[g.categoria_tipo as TipoCategoriaFinanceira]?.color || 'hsl(var(--muted))',
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

export function TotaisPorTipoCards({ gastosPorTipo }: { gastosPorTipo: GastoPorTipo[] }) {
  const totais = Object.entries(TIPOS_CATEGORIA).map(([tipo, config]) => {
    const gasto = gastosPorTipo.find(g => g.categoria_tipo === tipo);
    return {
      tipo,
      label: config.label,
      color: config.color,
      total: gasto ? Number(gasto.total_gasto) : 0,
    };
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      {totais.map((t) => (
        <Card key={t.tipo}>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">{t.label}</div>
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
