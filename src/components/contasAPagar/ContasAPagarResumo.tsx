import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calendar, Target, TrendingUp, TrendingDown, Minus, CreditCard, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Progress } from '@/components/ui/progress';

interface ResumoData {
  totalEmAberto: number;
  compromissoMensal: number;
  qtdAtivas: number;
  variacaoTotalMes: number;
  totalSaldoAtual: number;
  totalPagoMesSaldo: number;
  totalAcrescidoMesSaldo: number;
  progressoMedioMetas: number;
  qtdContasSaldo: number;
  totalParcelasEmAberto: number;
  compromissoMensalParceladas: number;
  qtdContasParceladas: number;
}

interface ContasAPagarResumoProps {
  resumo: ResumoData;
  activeTab: 'parceladas' | 'saldo';
}

export function ContasAPagarResumo({ resumo, activeTab }: ContasAPagarResumoProps) {
  const renderVariacaoIcon = (variacao: number) => {
    if (variacao > 0) {
      return <TrendingUp className="h-4 w-4 text-destructive" />;
    } else if (variacao < 0) {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVariacaoColor = (variacao: number) => {
    if (variacao > 0) return 'text-destructive';
    if (variacao < 0) return 'text-green-600';
    return 'text-muted-foreground';
  };

  if (activeTab === 'saldo') {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total em Aberto</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(resumo.totalSaldoAtual, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumo.qtdContasSaldo} conta{resumo.qtdContasSaldo !== 1 ? 's' : ''} ativa{resumo.qtdContasSaldo !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago no Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(resumo.totalPagoMesSaldo, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de pagamentos realizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acrescido no Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(resumo.totalAcrescidoMesSaldo, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              Novas dívidas/compras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas de Pagamento</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resumo.progressoMedioMetas.toFixed(0)}%
            </div>
            <Progress value={resumo.progressoMedioMetas} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Progresso médio das metas
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tab Parceladas
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Parcelado</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(resumo.totalParcelasEmAberto, 'BRL')}
          </div>
          <p className="text-xs text-muted-foreground">
            {resumo.qtdContasParceladas} conta{resumo.qtdContasParceladas !== 1 ? 's' : ''} ativa{resumo.qtdContasParceladas !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Parcelas Mensais</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(resumo.compromissoMensalParceladas, 'BRL')}
          </div>
          <p className="text-xs text-muted-foreground">
            Compromisso mensal
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(resumo.totalEmAberto, 'BRL')}
          </div>
          <p className="text-xs text-muted-foreground">
            Parcelas + Saldos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Variação Saldos</CardTitle>
          {renderVariacaoIcon(resumo.variacaoTotalMes)}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getVariacaoColor(resumo.variacaoTotalMes)}`}>
            {resumo.variacaoTotalMes > 0 ? '+' : ''}{formatCurrency(resumo.variacaoTotalMes, 'BRL')}
          </div>
          <p className="text-xs text-muted-foreground">
            Variação das contas saldo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
