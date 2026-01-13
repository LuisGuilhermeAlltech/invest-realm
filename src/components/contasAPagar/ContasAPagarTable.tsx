import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pencil, CheckCircle2, MoreHorizontal, TrendingUp, TrendingDown, Minus, DollarSign, RefreshCw } from 'lucide-react';
import { ContaAPagarComCalculos, MODO_CONTA_LABELS } from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContasAPagarTableProps {
  contas: ContaAPagarComCalculos[];
  onEdit: (conta: ContaAPagarComCalculos) => void;
  onQuitar: (id: string) => void;
  onAtualizarSaldo?: (id: string, novoSaldo: number) => void;
  onAdicionarPagamento?: (id: string, valor: number, descricao: string, data: string) => void;
  isQuiting?: boolean;
  isAtualizandoSaldo?: boolean;
  isAdicionandoPagamento?: boolean;
}

export function ContasAPagarTable({
  contas,
  onEdit,
  onQuitar,
  onAtualizarSaldo,
  onAdicionarPagamento,
  isQuiting = false,
  isAtualizandoSaldo = false,
  isAdicionandoPagamento = false,
}: ContasAPagarTableProps) {
  const [saldoModalOpen, setSaldoModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaAPagarComCalculos | null>(null);
  const [modalTab, setModalTab] = useState<'pagamento' | 'saldo'>('pagamento');
  
  // Form states
  const [novoSaldo, setNovoSaldo] = useState('');
  const [valorPagamento, setValorPagamento] = useState('');
  const [descricaoPagamento, setDescricaoPagamento] = useState('');
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleAbrirModal = (conta: ContaAPagarComCalculos, tab: 'pagamento' | 'saldo') => {
    setContaSelecionada(conta);
    setModalTab(tab);
    setNovoSaldo(conta.saldo_atual?.toString() || '0');
    setValorPagamento('');
    setDescricaoPagamento('');
    setDataPagamento(format(new Date(), 'yyyy-MM-dd'));
    setSaldoModalOpen(true);
  };

  const handleConfirmarSaldo = () => {
    if (contaSelecionada && onAtualizarSaldo) {
      onAtualizarSaldo(contaSelecionada.id, parseFloat(novoSaldo) || 0);
      setSaldoModalOpen(false);
      setContaSelecionada(null);
    }
  };

  const handleConfirmarPagamento = () => {
    if (contaSelecionada && onAdicionarPagamento) {
      const valor = parseFloat(valorPagamento) || 0;
      if (valor <= 0) return;
      
      onAdicionarPagamento(
        contaSelecionada.id,
        valor,
        descricaoPagamento,
        dataPagamento
      );
      setSaldoModalOpen(false);
      setContaSelecionada(null);
    }
  };

  const renderVariacao = (variacao: number) => {
    if (variacao > 0) {
      return (
        <span className="flex items-center gap-1 text-destructive">
          <TrendingUp className="h-3 w-3" />
          +{formatCurrency(variacao, 'BRL')}
        </span>
      );
    } else if (variacao < 0) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingDown className="h-3 w-3" />
          {formatCurrency(variacao, 'BRL')}
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-3 w-3" />
          R$ 0,00
        </span>
      );
    }
  };

  if (contas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma conta encontrada com os filtros selecionados.
      </div>
    );
  }

  const isProcessing = isAtualizandoSaldo || isAdicionandoPagamento;

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead className="text-center">Venc.</TableHead>
              <TableHead className="text-right">Valor Restante</TableHead>
              <TableHead className="text-right">Compromisso</TableHead>
              <TableHead className="text-center">Parcelas</TableHead>
              <TableHead className="text-right">Variação Mês</TableHead>
              <TableHead>Últ. Atualização</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contas.map((conta) => (
              <TableRow key={conta.id}>
                <TableCell className="font-medium">{conta.descricao}</TableCell>
                <TableCell>
                  <Badge variant={conta.modo === 'parcelada' ? 'default' : 'secondary'}>
                    {MODO_CONTA_LABELS[conta.modo]}
                  </Badge>
                </TableCell>
                <TableCell>{conta.instituicao}</TableCell>
                <TableCell className="text-center">
                  {conta.dia_vencimento}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {conta.status === 'quitado' ? (
                    <span className="text-green-600">R$ 0,00</span>
                  ) : (
                    formatCurrency(conta.valor_restante, 'BRL')
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(conta.compromisso_mensal, 'BRL')}
                </TableCell>
                <TableCell className="text-center">
                  {conta.modo === 'parcelada' ? (
                    <span className={conta.status === 'quitado' ? 'text-green-600' : ''}>
                      {conta.parcelas_formatado}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {conta.modo === 'saldo' ? (
                    renderVariacao(conta.variacao_mensal)
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {conta.modo === 'saldo' && conta.saldo_ultima_atualizacao ? (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(conta.saldo_ultima_atualizacao), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[150px] truncate" title={conta.observacoes || ''}>
                  {conta.observacoes || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(conta)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    {/* Menu de ações para contas de saldo */}
                    {conta.modo === 'saldo' && conta.status === 'ativo' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAbrirModal(conta, 'pagamento')}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Adicionar Pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAbrirModal(conta, 'saldo')}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Novo Saldo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    {conta.status === 'ativo' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Deseja realmente quitar esta conta?')) {
                            onQuitar(conta.id);
                          }
                        }}
                        title="Quitar"
                        disabled={isQuiting}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de pagamento / novo saldo */}
      <Dialog open={saldoModalOpen} onOpenChange={setSaldoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{contaSelecionada?.descricao}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as 'pagamento' | 'saldo')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pagamento">
                <DollarSign className="h-4 w-4 mr-2" />
                Pagamento
              </TabsTrigger>
              <TabsTrigger value="saldo">
                <RefreshCw className="h-4 w-4 mr-2" />
                Novo Saldo
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pagamento" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Saldo atual: <strong>{formatCurrency(contaSelecionada?.saldo_atual || 0, 'BRL')}</strong>
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="valorPagamento">Valor do Pagamento *</Label>
                <Input
                  id="valorPagamento"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  placeholder="R$ 0,00"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataPagamento">Data do Pagamento</Label>
                <Input
                  id="dataPagamento"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descricaoPagamento">Descrição (opcional)</Label>
                <Input
                  id="descricaoPagamento"
                  value={descricaoPagamento}
                  onChange={(e) => setDescricaoPagamento(e.target.value)}
                  placeholder="Ex: Pagamento mensal"
                />
              </div>

              {valorPagamento && parseFloat(valorPagamento) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Novo saldo após pagamento: <strong className="text-green-600">
                    {formatCurrency(Math.max((contaSelecionada?.saldo_atual || 0) - parseFloat(valorPagamento), 0), 'BRL')}
                  </strong>
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="saldo" className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Saldo atual: <strong>{formatCurrency(contaSelecionada?.saldo_atual || 0, 'BRL')}</strong>
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="novoSaldo">Novo Saldo *</Label>
                <Input
                  id="novoSaldo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={novoSaldo}
                  onChange={(e) => setNovoSaldo(e.target.value)}
                  placeholder="R$ 0,00"
                />
              </div>
              
              <p className="text-xs text-muted-foreground">
                Use esta opção para definir o saldo atual diretamente (ex: após conferir a fatura).
              </p>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaldoModalOpen(false)}>
              Cancelar
            </Button>
            {modalTab === 'pagamento' ? (
              <Button 
                onClick={handleConfirmarPagamento} 
                disabled={isProcessing || !valorPagamento || parseFloat(valorPagamento) <= 0}
              >
                {isAdicionandoPagamento ? 'Registrando...' : 'Registrar Pagamento'}
              </Button>
            ) : (
              <Button onClick={handleConfirmarSaldo} disabled={isProcessing}>
                {isAtualizandoSaldo ? 'Atualizando...' : 'Atualizar Saldo'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
