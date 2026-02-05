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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Installment, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types/installments';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';

interface RegistrarPagamentoParcelaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: Installment | null;
  billDescription?: string;
  onConfirm: (data: {
    installmentId: string;
    paidAt: string;
    paidAmount?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

export function RegistrarPagamentoParcelaModal({
  open,
  onOpenChange,
  installment,
  billDescription,
  onConfirm,
  isLoading = false,
}: RegistrarPagamentoParcelaModalProps) {
  const [paidAt, setPaidAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');

  // Reset form when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open && installment) {
      setPaidAt(format(new Date(), 'yyyy-MM-dd'));
      setPaidAmount(String(installment.amount));
      setPaymentMethod('');
      setNotes('');
    }
    onOpenChange(open);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!installment) return;

    onConfirm({
      installmentId: installment.id,
      paidAt: `${paidAt}T12:00:00Z`,
      paidAmount: paidAmount ? parseFloat(paidAmount) : undefined,
      paymentMethod: paymentMethod || undefined,
      notes: notes.trim() || undefined,
    });

    onOpenChange(false);
  };

  if (!installment) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info da parcela */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-1">
            {billDescription && (
              <p className="font-medium">{billDescription}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Parcela {installment.installment_number} - Vencimento: {format(new Date(installment.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
            </p>
            <p className="text-lg font-semibold">
              {formatCurrency(Number(installment.amount), 'BRL')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAt">Data do Pagamento *</Label>
            <Input
              id="paidAt"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">Valor Pago</Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder={`Default: ${formatCurrency(Number(installment.amount), 'BRL')}`}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar o valor da parcela
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observação</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
