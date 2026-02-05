import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReceivableType, ReceivableWithCalculations } from '@/types/receivables';

interface NovaContaReceberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable?: ReceivableWithCalculations | null;
  onSave: (data: {
    description: string;
    type: ReceivableType;
    payer: string;
    category?: string;
    notes?: string;
    total_amount?: number;
    total_installments?: number;
    installment_amount?: number;
    start_date?: string;
    due_day?: number;
    initial_balance?: number;
    expected_monthly?: number;
  }) => Promise<void>;
  onUpdate?: (data: { id: string } & Partial<ReceivableWithCalculations>) => Promise<void>;
  isLoading: boolean;
}

export function NovaContaReceberModal({
  open,
  onOpenChange,
  receivable,
  onSave,
  onUpdate,
  isLoading,
}: NovaContaReceberModalProps) {
  const isEditing = !!receivable;
  
  const [type, setType] = useState<ReceivableType>(receivable?.type || 'parcelado');
  const [description, setDescription] = useState(receivable?.description || '');
  const [payer, setPayer] = useState(receivable?.payer || '');
  const [category, setCategory] = useState(receivable?.category || '');
  const [notes, setNotes] = useState(receivable?.notes || '');
  
  // Parcelado fields
  const [totalAmount, setTotalAmount] = useState(receivable?.total_amount?.toString() || '');
  const [totalInstallments, setTotalInstallments] = useState(receivable?.total_installments?.toString() || '');
  const [installmentAmount, setInstallmentAmount] = useState(receivable?.installment_amount?.toString() || '');
  const [startDate, setStartDate] = useState(receivable?.start_date || new Date().toISOString().split('T')[0]);
  const [dueDay, setDueDay] = useState(receivable?.due_day?.toString() || '10');
  
  // Saldo fields
  const [initialBalance, setInitialBalance] = useState(receivable?.initial_balance?.toString() || '');
  const [expectedMonthly, setExpectedMonthly] = useState(receivable?.expected_monthly?.toString() || '');

  // Auto-calculate installment amount
  const handleTotalChange = (value: string) => {
    setTotalAmount(value);
    if (value && totalInstallments) {
      setInstallmentAmount((parseFloat(value) / parseInt(totalInstallments)).toFixed(2));
    }
  };

  const handleInstallmentsChange = (value: string) => {
    setTotalInstallments(value);
    if (value && totalAmount) {
      setInstallmentAmount((parseFloat(totalAmount) / parseInt(value)).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const baseData = {
      description,
      type,
      payer,
      category: category || undefined,
      notes: notes || undefined,
    };

    if (isEditing && onUpdate) {
      await onUpdate({
        id: receivable.id,
        ...baseData,
        ...(type === 'saldo' && {
          expected_monthly: expectedMonthly ? parseFloat(expectedMonthly) : undefined,
        }),
      });
    } else {
      await onSave({
        ...baseData,
        ...(type === 'parcelado' && {
          total_amount: parseFloat(totalAmount),
          total_installments: parseInt(totalInstallments),
          installment_amount: parseFloat(installmentAmount),
          start_date: startDate,
          due_day: parseInt(dueDay),
        }),
        ...(type === 'saldo' && {
          initial_balance: parseFloat(initialBalance),
          expected_monthly: expectedMonthly ? parseFloat(expectedMonthly) : undefined,
        }),
      });
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setType('parcelado');
    setDescription('');
    setPayer('');
    setCategory('');
    setNotes('');
    setTotalAmount('');
    setTotalInstallments('');
    setInstallmentAmount('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDay('10');
    setInitialBalance('');
    setExpectedMonthly('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <Tabs value={type} onValueChange={(v) => setType(v as ReceivableType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parcelado">Parcelado</TabsTrigger>
                <TabsTrigger value="saldo">Saldo</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Aluguel Apartamento"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payer">Pagador *</Label>
              <Input
                id="payer"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                placeholder="Ex: João Silva"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Aluguel"
              />
            </div>
          </div>

          {type === 'parcelado' && !isEditing && (
            <div className="space-y-4 p-4 border rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Valor Total *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={totalAmount}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalInstallments">Nº Parcelas *</Label>
                  <Input
                    id="totalInstallments"
                    type="number"
                    min="1"
                    value={totalInstallments}
                    onChange={(e) => handleInstallmentsChange(e.target.value)}
                    placeholder="12"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installmentAmount">Valor Parcela</Label>
                  <Input
                    id="installmentAmount"
                    type="number"
                    step="0.01"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDay">Dia Vencimento *</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="10"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'saldo' && (
            <div className="space-y-4 p-4 border rounded-md">
              <div className="grid grid-cols-2 gap-4">
                {!isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="initialBalance">Saldo Inicial *</Label>
                    <Input
                      id="initialBalance"
                      type="number"
                      step="0.01"
                      min="0"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0,00"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="expectedMonthly">Previsão Mensal</Label>
                  <Input
                    id="expectedMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={expectedMonthly}
                    onChange={(e) => setExpectedMonthly(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
          )}

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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
