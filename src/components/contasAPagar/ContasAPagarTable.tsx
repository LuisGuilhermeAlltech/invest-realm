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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, CheckCircle2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ContaAPagarComCalculos, TIPO_CONTA_LABELS, MODO_CONTA_LABELS } from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContasAPagarTableProps {
  contas: ContaAPagarComCalculos[];
  onEdit: (conta: ContaAPagarComCalculos) => void;
  onQuitar: (id: string) => void;
  onAtualizarSaldo?: (id: string, novoSaldo: number) => void;
  isQuiting?: boolean;
  isAtualizandoSaldo?: boolean;
}

export function ContasAPagarTable({
  contas,
  onEdit,
  onQuitar,
  onAtualizarSaldo,
  isQuiting = false,
  isAtualizandoSaldo = false,
}: ContasAPagarTableProps) {
  const [saldoModalOpen, setSaldoModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaAPagarComCalculos | null>(null);
  const [novoSaldo, setNovoSaldo] = useState('');

  const handleAbrirSaldoModal = (conta: ContaAPagarComCalculos) => {
    setContaSelecionada(conta);
    setNovoSaldo(conta.saldo_atual?.toString() || '0');
    setSaldoModalOpen(true);
  };

  const handleConfirmarSaldo = () => {
    if (contaSelecionada && onAtualizarSaldo) {
      onAtualizarSaldo(contaSelecionada.id, parseFloat(novoSaldo) || 0);
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
                    {conta.modo === 'saldo' && conta.status === 'ativo' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAbrirSaldoModal(conta)}
                        title="Atualizar Saldo"
                        disabled={isAtualizandoSaldo}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
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

      {/* Modal de atualização de saldo */}
      <Dialog open={saldoModalOpen} onOpenChange={setSaldoModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atualizar Saldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o novo saldo para <strong>{contaSelecionada?.descricao}</strong>
            </p>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={novoSaldo}
              onChange={(e) => setNovoSaldo(e.target.value)}
              placeholder="Novo saldo"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaldoModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarSaldo} disabled={isAtualizandoSaldo}>
              {isAtualizandoSaldo ? 'Atualizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
