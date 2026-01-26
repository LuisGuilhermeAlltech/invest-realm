import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useAgenteAporte } from '@/hooks/useAgenteAporte';
import { VALUATION_TYPE_LABELS } from '@/types/agenteAporte';
import { Save } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  assetCode: string;
}

const CONSULTORIAS = ['AUVP', 'Suno', 'Nord', 'Empiricus', 'Outro'];

export function ValuationModal({ open, onClose, assetCode }: Props) {
  const { upsertValuation } = useAgenteAporte();

  const [formData, setFormData] = useState({
    consultoria: 'AUVP',
    ref_date: new Date().toISOString().split('T')[0],
    valuation_type: 'fair_value' as const,
    fair_value: '',
    fair_value_low: '',
    fair_value_high: '',
    target_yield: '',
    target_rate: '',
    currency: 'BRL',
    classification: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    upsertValuation({
      asset_code: assetCode,
      consultoria: formData.consultoria,
      ref_date: formData.ref_date,
      valuation_type: formData.valuation_type,
      fair_value: formData.fair_value ? parseFloat(formData.fair_value) : null,
      fair_value_low: formData.fair_value_low ? parseFloat(formData.fair_value_low) : null,
      fair_value_high: formData.fair_value_high ? parseFloat(formData.fair_value_high) : null,
      target_yield: formData.target_yield ? parseFloat(formData.target_yield) : null,
      target_rate: formData.target_rate ? parseFloat(formData.target_rate) : null,
      currency: formData.currency,
      classification: formData.classification || null,
      notes: formData.notes || null,
    });

    onClose();
  };

  const renderValuationFields = () => {
    const vType = formData.valuation_type;
    if (vType === 'fair_value') {
      return (
        <div>
            <Label htmlFor="fair_value">Preco Justo</Label>
            <Input
              id="fair_value"
              type="number"
              step="0.01"
              value={formData.fair_value}
              onChange={(e) => setFormData(prev => ({ ...prev, fair_value: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      );
    }
    if (vType === 'fair_value_range') {
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fair_value_low">Faixa Baixa</Label>
              <Input
                id="fair_value_low"
                type="number"
                step="0.01"
                value={formData.fair_value_low}
                onChange={(e) => setFormData(prev => ({ ...prev, fair_value_low: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="fair_value_high">Faixa Alta</Label>
              <Input
                id="fair_value_high"
                type="number"
                step="0.01"
                value={formData.fair_value_high}
                onChange={(e) => setFormData(prev => ({ ...prev, fair_value_high: e.target.value }))}
                placeholder="0.00"
              />
          </div>
        </div>
      );
    }
    if (vType === 'target_yield') {
        return (
          <div>
            <Label htmlFor="target_yield">Yield Alvo (%)</Label>
            <Input
              id="target_yield"
              type="number"
              step="0.01"
              value={formData.target_yield}
              onChange={(e) => setFormData(prev => ({ ...prev, target_yield: e.target.value }))}
              placeholder="Ex: 8.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Yield anual alvo em porcentagem
          </p>
        </div>
      );
    }
    if (vType === 'target_rate') {
        return (
          <div>
            <Label htmlFor="target_rate">Taxa Alvo (%)</Label>
            <Input
              id="target_rate"
              type="number"
              step="0.01"
              value={formData.target_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, target_rate: e.target.value }))}
              placeholder="Ex: IPCA+6 = 6"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Taxa real alvo (ex: CDI+2%, IPCA+6%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Valuation: {assetCode}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="consultoria">Consultoria</Label>
              <Select
                value={formData.consultoria}
                onValueChange={(value) => setFormData(prev => ({ ...prev, consultoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTORIAS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ref_date">Data Referencia</Label>
              <Input
                id="ref_date"
                type="date"
                value={formData.ref_date}
                onChange={(e) => setFormData(prev => ({ ...prev, ref_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="valuation_type">Tipo de Valuation</Label>
              <Select
                value={formData.valuation_type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, valuation_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VALUATION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Moeda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderValuationFields()}

          <div>
            <Label htmlFor="classification">Classificacao (opcional)</Label>
            <Select
              value={formData.classification}
              onValueChange={(value) => setFormData(prev => ({ ...prev, classification: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="barato">Barato</SelectItem>
                <SelectItem value="justo">Justo</SelectItem>
                <SelectItem value="caro">Caro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Observacoes (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas sobre a avaliacao..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Salvar Valuation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
