import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calendar, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface ContasAPagarResumoProps {
  totalEmAberto: number;
  compromissoMensal: number;
  qtdAtivas: number;
}

export function ContasAPagarResumo({
  totalEmAberto,
  compromissoMensal,
  qtdAtivas,
}: ContasAPagarResumoProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(totalEmAberto, 'BRL')}
          </div>
          <p className="text-xs text-muted-foreground">
            Soma de todas as parcelas restantes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compromisso Mensal</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(compromissoMensal, 'BRL')}
          </div>
          <p className="text-xs text-muted-foreground">
            Soma das parcelas mensais ativas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{qtdAtivas}</div>
          <p className="text-xs text-muted-foreground">
            Quantidade de contas em andamento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
