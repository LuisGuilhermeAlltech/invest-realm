import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ContaAPagarComCalculos, 
  TipoMovimentacaoSaldo,
  TIPO_MOVIMENTACAO_LABELS 
} from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, PlusCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface MovimentacaoSaldoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: TipoMovimentacaoSaldo;
  conta: ContaAPagarComCalculos | null;
  onConfirm: (valor: number, observacao: string, data: string) => void;
  isLoading?: boolean;
}

export function MovimentacaoSaldoModal({
  open,
  onOpenChange,
  tipo,
  conta,
  onConfirm,
  isLoading = false,
}: MovimentacaoSaldoModalProps) {
  const [valor, setValor] = useState('');
  const [observacao, setObservacao] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) return;
    onConfirm(valorNum, observacao, data);
    setValor('');
    setObservacao('');
  };

  const handleClose = () => {
    setValor('');
    setObservacao('');
    setData(format(new Date(), 'yyyy-MM-dd'));
    onOpenChange(false);
  };

  const saldoAtual = conta?.saldo_atual || 0;
  const valorNum = parseFloat(valor) || 0;

  let novoSaldo: number;
  let novoSaldoLabel: string;
  let novoSaldoColor: string;

  if (tipo === 'pagamento') {
    novoSaldo = Math.max(saldoAtual - valorNum, 0);
    novoSaldoLabel = 'Novo saldo após pagamento';
    novoSaldoColor = 'text-green-600';
  } else if (tipo === 'acrescimo') {
    novoSaldo = saldoAtual + valorNum;
    novoSaldoLabel = 'Novo saldo após acréscimo';
    novoSaldoColor = 'text-destructive';
  } else {
    novoSaldo = valorNum;
    novoSaldoLabel = 'Novo saldo após ajuste';
    novoSaldoColor = 'text-blue-600';
  }

  const getIcon = () => {
    switch (tipo) {
      case 'pagamento': return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'acrescimo': return <PlusCircle className="h-5 w-5 text-destructive" />;
      case 'ajuste': return <RefreshCw className="h-5 w-5 text-blue-600" />;
    }
  };

  const getDescription = () => {
    switch (tipo) {
      case 'pagamento': 
        return 'Registre um pagamento para reduzir o saldo devedor.';
      case 'acrescimo': 
        return 'Adicione uma nova dívida ou compra ao saldo atual.';
      case 'ajuste': 
        return 'Defina o saldo exato após conferir a fatura.';
    }
  };

  const getInputLabel = () => {
    switch (tipo) {
      case 'pagamento': return 'Valor do Pagamento';
      case 'acrescimo': return 'Valor a Adicionar';
      case 'ajuste': return 'Novo Saldo';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {TIPO_MOVIMENTACAO_LABELS[tipo]} - {conta?.descricao}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {getDescription()}
          </p>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">Saldo atual</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(saldoAtual, 'BRL')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">{getInputLabel()} *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="R$ 0,00"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Pagamento mensal, Compra parcelada..."
              rows={2}
            />
          </div>

          {valorNum > 0 && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">{novoSaldoLabel}</p>
              <p className={`text-lg font-bold ${novoSaldoColor}`}>
                {formatCurrency(novoSaldo, 'BRL')}
              </p>
              {novoSaldo === 0 && tipo === 'pagamento' && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ A conta será quitada automaticamente
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !valor || parseFloat(valor) <= 0}
            >
              {isLoading ? 'Registrando...' : `Confirmar ${TIPO_MOVIMENTACAO_LABELS[tipo]}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
