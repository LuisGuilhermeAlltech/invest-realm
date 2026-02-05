import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceivableWithCalculations, ReceivableInstallment, ReceivablePaymentMethod, RECEIVABLE_PAYMENT_METHOD_LABELS } from '@/types/receivables';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface RegistrarRecebimentoParcelaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: ReceivableWithCalculations;
  installment: ReceivableInstallment | null;
  allInstallments: ReceivableInstallment[];
  onRegister: (data: {
    receivable_id: string;
    receivable_installment_id?: string;
    paid_at: string;
    amount: number;
    method: ReceivablePaymentMethod;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function RegistrarRecebimentoParcelaModal({
  open,
  onOpenChange,
  receivable,
  installment,
  allInstallments,
  onRegister,
  isLoading,
}: RegistrarRecebimentoParcelaModalProps) {
  const pendingInstallments = allInstallments.filter((i) => i.status !== 'received');
  
  const [selectedInstallmentId, setSelectedInstallmentId] = useState(installment?.id || pendingInstallments[0]?.id || '');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<ReceivablePaymentMethod>('pix');
  const [notes, setNotes] = useState('');

  const selectedInstallment = allInstallments.find((i) => i.id === selectedInstallmentId);
  const remainingAmount = selectedInstallment ? selectedInstallment.amount - selectedInstallment.received_amount : 0;

  useEffect(() => {
    if (installment) {
      setSelectedInstallmentId(installment.id);
      setAmount((installment.amount - installment.received_amount).toString());
    } else if (pendingInstallments[0]) {
      setSelectedInstallmentId(pendingInstallments[0].id);
      setAmount((pendingInstallments[0].amount - pendingInstallments[0].received_amount).toString());
    }
  }, [installment, pendingInstallments]);

  useEffect(() => {
    if (selectedInstallment) {
      setAmount((selectedInstallment.amount - selectedInstallment.received_amount).toString());
    }
  }, [selectedInstallmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onRegister({
      receivable_id: receivable.id,
      receivable_installment_id: selectedInstallmentId,
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
          <DialogTitle>Registrar Recebimento de Parcela</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-md">
            <div className="font-medium">{receivable.description}</div>
            <div className="text-sm text-muted-foreground">{receivable.payer}</div>
            <div className="text-sm mt-1">
              Progresso: <span className="font-medium">{receivable.progress}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installment">Parcela</Label>
            <Select value={selectedInstallmentId} onValueChange={setSelectedInstallmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a parcela" />
              </SelectTrigger>
              <SelectContent>
                {pendingInstallments.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.installment_number}/{allInstallments.length} - {formatDate(inst.due_date)} - {formatCurrency(inst.amount - inst.received_amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedInstallment && (
            <div className="p-2 bg-muted/50 rounded text-sm">
              <div className="flex justify-between">
                <span>Valor da parcela:</span>
                <span className="font-medium">{formatCurrency(selectedInstallment.amount)}</span>
              </div>
              {selectedInstallment.received_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Já recebido:</span>
                  <span>{formatCurrency(selectedInstallment.received_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium mt-1 pt-1 border-t">
                <span>Restante:</span>
                <span>{formatCurrency(remainingAmount)}</span>
              </div>
            </div>
          )}

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
                max={remainingAmount}
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
            <Button type="submit" disabled={isLoading || !amount || !selectedInstallmentId}>
              {isLoading ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
