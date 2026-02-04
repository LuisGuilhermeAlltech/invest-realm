import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Pencil, 
  CheckCircle2, 
  MoreHorizontal, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign, 
  PlusCircle,
  RefreshCw,
  ExternalLink,
  Target,
  Calendar
} from 'lucide-react';
import { 
  ContaAPagarComCalculos, 
  TIPO_CONTA_LABELS, 
  StatusContaAPagar, 
  TipoContaAPagar,
  TipoMovimentacaoSaldo 
} from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MovimentacaoSaldoModal } from './MovimentacaoSaldoModal';

interface ContasSaldoSectionProps {
  contas: ContaAPagarComCalculos[];
  onEdit: (conta: ContaAPagarComCalculos) => void;
  onQuitar: (id: string) => void;
  onOpenDetalhe: (conta: ContaAPagarComCalculos) => void;
  onRegistrarMovimentacao: (params: { 
    contaId: string; 
    tipo: TipoMovimentacaoSaldo; 
    valor: number; 
    observacao?: string 
  }) => void;
  isQuiting?: boolean;
  isRegistrandoMovimentacao?: boolean;
  statusFiltro: StatusContaAPagar | 'todos';
  setStatusFiltro: (value: StatusContaAPagar | 'todos') => void;
  tipoFiltro: TipoContaAPagar | 'todos';
  setTipoFiltro: (value: TipoContaAPagar | 'todos') => void;
}

export function ContasSaldoSection({
  contas,
  onEdit,
  onQuitar,
  onOpenDetalhe,
  onRegistrarMovimentacao,
  isQuiting = false,
  isRegistrandoMovimentacao = false,
  statusFiltro,
  setStatusFiltro,
  tipoFiltro,
  setTipoFiltro,
}: ContasSaldoSectionProps) {
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movModalTipo, setMovModalTipo] = useState<TipoMovimentacaoSaldo>('pagamento');
  const [contaSelecionada, setContaSelecionada] = useState<ContaAPagarComCalculos | null>(null);

  const handleOpenMovModal = (conta: ContaAPagarComCalculos, tipo: TipoMovimentacaoSaldo) => {
    setContaSelecionada(conta);
    setMovModalTipo(tipo);
    setMovModalOpen(true);
  };

  const handleConfirmMovimentacao = (valor: number, observacao: string) => {
    if (!contaSelecionada) return;
    
    onRegistrarMovimentacao({
      contaId: contaSelecionada.id,
      tipo: movModalTipo,
      valor,
      observacao: observacao || undefined,
    });
    
    setMovModalOpen(false);
    setContaSelecionada(null);
  };

  const renderVariacao = (variacao: number) => {
    if (variacao > 0) {
      return (
        <span className="flex items-center gap-1 text-destructive text-sm">
          <TrendingUp className="h-3 w-3" />
          +{formatCurrency(variacao, 'BRL')}
        </span>
      );
    } else if (variacao < 0) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <TrendingDown className="h-3 w-3" />
          {formatCurrency(variacao, 'BRL')}
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-muted-foreground text-sm">
          <Minus className="h-3 w-3" />
          Sem variação
        </span>
      );
    }
  };

  const getMetaStatus = (conta: ContaAPagarComCalculos) => {
    if (!conta.meta_pagamento || conta.meta_pagamento === 0) return null;
    
    if (conta.progresso_meta >= 100) {
      return { label: 'Meta atingida', color: 'bg-green-500' };
    } else if (conta.progresso_meta >= 50) {
      return { label: 'Em progresso', color: 'bg-amber-500' };
    } else {
      return { label: 'Iniciando', color: 'bg-red-500' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={statusFiltro}
            onValueChange={(value) => setStatusFiltro(value as StatusContaAPagar | 'todos')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativas</SelectItem>
              <SelectItem value="quitado">Quitadas</SelectItem>
              <SelectItem value="todos">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={tipoFiltro}
            onValueChange={(value) => setTipoFiltro(value as TipoContaAPagar | 'todos')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(TIPO_CONTA_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Contas */}
      {contas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          Nenhuma conta de saldo encontrada.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contas.map((conta) => {
            const metaStatus = getMetaStatus(conta);
            
            return (
              <Card 
                key={conta.id} 
                className={`relative ${conta.status === 'quitado' ? 'opacity-60' : ''}`}
              >
                {conta.status === 'quitado' && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Quitada
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {conta.descricao}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {TIPO_CONTA_LABELS[conta.tipo]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {conta.instituicao}
                        </span>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpenDetalhe(conta)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(conta)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {conta.status === 'ativo' && (
                          <>
                            <DropdownMenuItem onClick={() => handleOpenMovModal(conta, 'pagamento')}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Registrar Pagamento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenMovModal(conta, 'acrescimo')}>
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Adicionar ao Saldo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenMovModal(conta, 'ajuste')}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Ajustar Saldo
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm('Deseja realmente quitar esta conta?')) {
                                  onQuitar(conta.id);
                                }
                              }}
                              disabled={isQuiting}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Quitar Conta
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Saldo Atual */}
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Atual</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(conta.saldo_atual || 0, 'BRL')}
                    </p>
                    {conta.saldo_inicial && conta.saldo_inicial !== conta.saldo_atual && (
                      <p className="text-xs text-muted-foreground">
                        Inicial: {formatCurrency(conta.saldo_inicial, 'BRL')}
                      </p>
                    )}
                  </div>

                  {/* Variação do Mês */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Variação no mês</span>
                    {renderVariacao(conta.variacao_mensal)}
                  </div>

                  {/* Meta de Pagamento */}
                  {conta.meta_pagamento && conta.meta_pagamento > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Meta: {formatCurrency(conta.meta_pagamento, 'BRL')}
                        </span>
                        {metaStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${metaStatus.color}`}>
                            {metaStatus.label}
                          </span>
                        )}
                      </div>
                      <Progress value={conta.progresso_meta} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Pago: {formatCurrency(conta.total_pago_mes, 'BRL')} / Falta: {formatCurrency(Math.max(conta.meta_pagamento - conta.total_pago_mes, 0), 'BRL')}
                      </p>
                    </div>
                  )}

                  {/* Última Movimentação */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Última mov.
                    </span>
                    <span className="text-xs">
                      {conta.ultima_movimentacao 
                        ? format(conta.ultima_movimentacao, "dd/MM/yy", { locale: ptBR })
                        : '-'
                      }
                    </span>
                  </div>

                  {/* Botões de Ação Rápida */}
                  {conta.status === 'ativo' && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleOpenMovModal(conta, 'pagamento')}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Pagar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onOpenDetalhe(conta)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Movimentação */}
      <MovimentacaoSaldoModal
        open={movModalOpen}
        onOpenChange={setMovModalOpen}
        tipo={movModalTipo}
        conta={contaSelecionada}
        onConfirm={handleConfirmMovimentacao}
        isLoading={isRegistrandoMovimentacao}
      />
    </div>
  );
}
