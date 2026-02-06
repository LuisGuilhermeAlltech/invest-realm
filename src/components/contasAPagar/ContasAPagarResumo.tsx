import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, Calendar, Target, TrendingUp, TrendingDown, Minus, CreditCard, Wallet, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Progress } from '@/components/ui/progress';
import { useContasTotais } from '@/hooks/useContasTotais';

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
  totalCartaoMes?: number;
}

interface ContasAPagarResumoProps {
  resumo: ResumoData;
  activeTab: 'parceladas' | 'saldo' | 'cartao';
}

export function ContasAPagarResumo({ resumo, activeTab }: ContasAPagarResumoProps) {
  const { contasTotais, contasSaldo, parcelasEmAberto, creditoVista, dividaTotal } = useContasTotais();

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

  if (activeTab === 'cartao') {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto no Mês</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(resumo.totalCartaoMes || 0, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              Compras à vista no cartão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Dívida Total</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Parceladas: {formatCurrency(parcelasEmAberto)} + Cartão: {formatCurrency(creditoVista)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(dividaTotal, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              Parceladas + Cartão à Vista
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
              {formatCurrency(resumo.compromissoMensal, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldos + Parcelas do mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resumo.qtdAtivas}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumo.qtdContasSaldo} saldo + {resumo.qtdContasParceladas} parceladas
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
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium">Exposição Bruta</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">Soma de todos os passivos: Saldo ({formatCurrency(contasSaldo)}) + Parceladas ({formatCurrency(parcelasEmAberto)}) + Cartão ({formatCurrency(creditoVista)})</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(contasTotais, 'BRL')}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo + Dívidas
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
