import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceivableWithCalculations, ReceivablePaymentMethod, RECEIVABLE_PAYMENT_METHOD_LABELS } from '@/types/receivables';
import { formatCurrency } from '@/lib/formatters';

interface RegistrarRecebimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: ReceivableWithCalculations;
  onRegister: (data: {
    receivable_id: string;
    paid_at: string;
    amount: number;
    method: ReceivablePaymentMethod;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function RegistrarRecebimentoModal({
  open,
  onOpenChange,
  receivable,
  onRegister,
  isLoading,
}: RegistrarRecebimentoModalProps) {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(receivable.expected_monthly?.toString() || '');
  const [method, setMethod] = useState<ReceivablePaymentMethod>('pix');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onRegister({
      receivable_id: receivable.id,
      paid_at: paidAt,
      amount: parseFloat(amount),
      method,
      notes: notes || undefined,
    });

    onOpenChange(false);
    // Reset form
    setPaidAt(new Date().toISOString().split('T')[0]);
    setAmount('');
    setMethod('pix');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <div className="font-medium">{receivable.description}</div>
            <div className="text-sm text-muted-foreground">{receivable.payer}</div>
            <div className="text-sm mt-1">
              Saldo atual: <span className="font-medium">{formatCurrency(receivable.current_balance || 0)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paidAt">Data do Recebimento</Label>
              <Input
                id="paidAt"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Recebido</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Método</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as ReceivablePaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RECEIVABLE_PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !amount}>
              {isLoading ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
