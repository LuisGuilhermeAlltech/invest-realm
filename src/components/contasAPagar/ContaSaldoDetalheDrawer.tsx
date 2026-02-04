import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  DollarSign, 
  PlusCircle, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Target,
  Calendar,
  ArrowDown,
  ArrowUp,
  Equal
} from 'lucide-react';
import { 
  ContaAPagarComCalculos, 
  MovimentacaoSaldo,
  TipoMovimentacaoSaldo,
  TIPO_CONTA_LABELS,
  TIPO_MOVIMENTACAO_LABELS,
  TIPO_MOVIMENTACAO_COLORS
} from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MovimentacaoSaldoModal } from './MovimentacaoSaldoModal';

interface ContaSaldoDetalheDrawerProps {
  conta: ContaAPagarComCalculos | null;
  onClose: () => void;
  movimentacoes: MovimentacaoSaldo[];
  onRegistrarMovimentacao: (params: { 
    contaId: string; 
    tipo: TipoMovimentacaoSaldo; 
    valor: number; 
    observacao?: string 
  }) => void;
  isRegistrandoMovimentacao?: boolean;
}

export function ContaSaldoDetalheDrawer({
  conta,
  onClose,
  movimentacoes,
  onRegistrarMovimentacao,
  isRegistrandoMovimentacao = false,
}: ContaSaldoDetalheDrawerProps) {
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movModalTipo, setMovModalTipo] = useState<TipoMovimentacaoSaldo>('pagamento');

  if (!conta) return null;

  const handleOpenMovModal = (tipo: TipoMovimentacaoSaldo) => {
    setMovModalTipo(tipo);
    setMovModalOpen(true);
  };

  const handleConfirmMovimentacao = (valor: number, observacao: string) => {
    onRegistrarMovimentacao({
      contaId: conta.id,
      tipo: movModalTipo,
      valor,
      observacao: observacao || undefined,
    });
    setMovModalOpen(false);
  };

  const getMovIcon = (tipo: TipoMovimentacaoSaldo) => {
    switch (tipo) {
      case 'pagamento': return <ArrowDown className="h-4 w-4 text-green-600" />;
      case 'acrescimo': return <ArrowUp className="h-4 w-4 text-destructive" />;
      case 'ajuste': return <Equal className="h-4 w-4 text-blue-600" />;
    }
  };

  const renderVariacao = (variacao: number) => {
    if (variacao > 0) {
      return (
        <span className="flex items-center gap-1 text-destructive">
          <TrendingUp className="h-4 w-4" />
          +{formatCurrency(variacao, 'BRL')}
        </span>
      );
    } else if (variacao < 0) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingDown className="h-4 w-4" />
          {formatCurrency(variacao, 'BRL')}
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          Sem variação
        </span>
      );
    }
  };

  const getMetaStatus = () => {
    if (!conta.meta_pagamento || conta.meta_pagamento === 0) return null;
    
    if (conta.progresso_meta >= 100) {
      return { label: 'Meta atingida!', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (conta.progresso_meta >= 50) {
      return { label: 'Em progresso', color: 'text-amber-600', bgColor: 'bg-amber-100' };
    } else {
      return { label: 'Iniciando', color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };

  const metaStatus = getMetaStatus();

  return (
    <>
      <Sheet open={!!conta} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>{conta.descricao}</span>
              <Badge variant="outline">
                {TIPO_CONTA_LABELS[conta.tipo]}
              </Badge>
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{conta.instituicao}</p>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* Saldo e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Saldo Atual</p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(conta.saldo_atual || 0, 'BRL')}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(conta.saldo_inicial || 0, 'BRL')}
                  </p>
                </div>
              </div>

              {/* Variação */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <span className="text-sm text-muted-foreground">Variação no mês</span>
                {renderVariacao(conta.variacao_mensal)}
              </div>

              {/* Resumo do Mês */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 text-green-600">
                    <ArrowDown className="h-4 w-4" />
                    <span className="text-sm">Pago no mês</span>
                  </div>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    {formatCurrency(conta.total_pago_mes, 'BRL')}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <ArrowUp className="h-4 w-4" />
                    <span className="text-sm">Acrescido no mês</span>
                  </div>
                  <p className="text-xl font-bold text-destructive mt-1">
                    {formatCurrency(conta.total_acrescido_mes, 'BRL')}
                  </p>
                </div>
              </div>

              {/* Meta de Pagamento */}
              {conta.meta_pagamento && conta.meta_pagamento > 0 && (
                <div className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Meta Mensal</span>
                    </div>
                    {metaStatus && (
                      <span className={`text-xs px-2 py-1 rounded-full ${metaStatus.bgColor} ${metaStatus.color}`}>
                        {metaStatus.label}
                      </span>
                    )}
                  </div>
                  
                  <Progress value={conta.progresso_meta} className="h-3" />
                  
                  <div className="flex justify-between text-sm">
                    <span>
                      <span className="text-muted-foreground">Pago: </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(conta.total_pago_mes, 'BRL')}
                      </span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Meta: </span>
                      <span className="font-medium">
                        {formatCurrency(conta.meta_pagamento, 'BRL')}
                      </span>
                    </span>
                  </div>
                  
                  {conta.progresso_meta < 100 && (
                    <p className="text-sm text-muted-foreground">
                      Falta pagar: <span className="font-medium text-amber-600">
                        {formatCurrency(conta.meta_pagamento - conta.total_pago_mes, 'BRL')}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              {conta.status === 'ativo' && (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => handleOpenMovModal('pagamento')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pagar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleOpenMovModal('acrescimo')}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleOpenMovModal('ajuste')}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Separator />

              {/* Timeline de Movimentações */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Histórico de Movimentações
                </h3>

                {movimentacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma movimentação registrada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {movimentacoes.map((mov, index) => (
                      <div 
                        key={mov.id} 
                        className="relative pl-6 pb-3 border-l-2 border-muted last:border-l-0"
                      >
                        {/* Dot */}
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-background border-2 border-muted flex items-center justify-center">
                          {getMovIcon(mov.tipo_movimentacao)}
                        </div>

                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${TIPO_MOVIMENTACAO_COLORS[mov.tipo_movimentacao]}`}>
                              {TIPO_MOVIMENTACAO_LABELS[mov.tipo_movimentacao]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(mov.data), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline justify-between">
                            <span className={`text-lg font-bold ${
                              mov.tipo_movimentacao === 'pagamento' 
                                ? 'text-green-600' 
                                : mov.tipo_movimentacao === 'acrescimo'
                                  ? 'text-destructive'
                                  : 'text-blue-600'
                            }`}>
                              {mov.tipo_movimentacao === 'pagamento' ? '-' : mov.tipo_movimentacao === 'acrescimo' ? '+' : ''}
                              {formatCurrency(mov.valor, 'BRL')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Saldo: {formatCurrency(mov.saldo_resultante, 'BRL')}
                            </span>
                          </div>

                          {mov.observacao && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {mov.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Modal de Movimentação */}
      <MovimentacaoSaldoModal
        open={movModalOpen}
        onOpenChange={setMovModalOpen}
        tipo={movModalTipo}
        conta={conta}
        onConfirm={handleConfirmMovimentacao}
        isLoading={isRegistrandoMovimentacao}
      />
    </>
  );
}
