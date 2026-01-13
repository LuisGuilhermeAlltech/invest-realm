import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calendar, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface ContasAPagarResumoProps {
  totalEmAberto: number;
  compromissoMensal: number;
  qtdAtivas: number;
  variacaoTotalMes?: number;
}

export function ContasAPagarResumo({
  totalEmAberto,
  compromissoMensal,
  qtdAtivas,
  variacaoTotalMes = 0,
}: ContasAPagarResumoProps) {
  const renderVariacaoIcon = () => {
    if (variacaoTotalMes > 0) {
      return <TrendingUp className="h-4 w-4 text-destructive" />;
    } else if (variacaoTotalMes < 0) {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVariacaoColor = () => {
    if (variacaoTotalMes > 0) return 'text-destructive';
    if (variacaoTotalMes < 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
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
            Soma de todas as parcelas/saldos
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
            Parcelas + metas de pagamento
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
            Quantidade em andamento
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Variação no Mês</CardTitle>
          {renderVariacaoIcon()}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getVariacaoColor()}`}>
            {variacaoTotalMes > 0 ? '+' : ''}{formatCurrency(variacaoTotalMes, 'BRL')}
          </div>
          <p className="text-xs text-muted-foreground">
            Variação das contas de saldo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
