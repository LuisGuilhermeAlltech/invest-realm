import { useDashboard } from '@/hooks/useDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercent, formatDateTime } from '@/lib/formatters';
import { CLASSE_LABELS, ClasseAtivo } from '@/types/database';
import { Wallet, TrendingUp, Coins, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { totalCarteira, aportesDoMes, proventosDoMes, ultimaAtualizacao, rebalanceamento, isLoading } = useDashboard();

  const cards = [
    { title: 'Total da Carteira', value: formatCurrency(totalCarteira), icon: Wallet, color: 'text-primary' },
    { title: 'Aportes do Mês', value: formatCurrency(aportesDoMes), icon: TrendingUp, color: 'text-chart-2' },
    { title: 'Proventos do Mês', value: formatCurrency(proventosDoMes), icon: Coins, color: 'text-chart-3' },
    { title: 'Última Atualização', value: ultimaAtualizacao ? formatDateTime(ultimaAtualizacao) : 'Sem dados', icon: Clock, color: 'text-muted-foreground' },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={cn('h-4 w-4', card.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
