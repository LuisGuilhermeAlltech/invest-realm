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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAgenteAporte } from '@/hooks/useAgenteAporte';
import { ASSET_TYPE_LABELS, VALUATION_TYPE_LABELS, AssetInference } from '@/types/agenteAporte';
import { CheckCircle, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

interface EditableAsset extends AssetInference {
  edited_type?: string;
  edited_currency?: string;
  edited_symbol?: string | null;
}

interface ValuationRow {
  asset_code: string;
  consultoria: string;
  ref_date: string;
  valuation_type: 'fair_value' | 'fair_value_range' | 'target_rate';
  fair_value: string;
  fair_value_low: string;
  fair_value_high: string;
  target_rate: string;
  notes: string;
}

export function SetupWizard({ open, onClose }: Props) {
  const {
    getInferredAssets,
    batchUpsertAssets,
    batchUpsertValuations,
    syncMarketData,
    isSyncingMarket,
  } = useAgenteAporte();

  const [step, setStep] = useState<Step>(1);
  const [editableAssets, setEditableAssets] = useState<EditableAsset[]>([]);
  const [valuationRows, setValuationRows] = useState<ValuationRow[]>([]);
  const [syncResult, setSyncResult] = useState<{ prices: number; errors: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize on open
  const handleOpen = () => {
    const inferred = getInferredAssets();
    setEditableAssets(inferred.map(a => ({ ...a })));
    setValuationRows(inferred.map(a => ({
      asset_code: a.asset_code,
      consultoria: '',
      ref_date: new Date().toISOString().split('T')[0],
      valuation_type: a.inferred_type === 'renda_fixa' ? 'target_rate' : 'fair_value',
      fair_value: '',
      fair_value_low: '',
      fair_value_high: '',
      target_rate: '',
      notes: '',
    })));
    setStep(1);
    setSyncResult(null);
  };

  // Step 1: Update asset
  const updateAssetField = (index: number, field: keyof EditableAsset, value: string | null) => {
    setEditableAssets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Step 2: Update valuation
  const updateValuationField = (index: number, field: keyof ValuationRow, value: string) => {
    setValuationRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Submit step 1
  const submitStep1 = async () => {
    setIsSubmitting(true);
    try {
      const assets = editableAssets.map(a => ({
        asset_code: a.asset_code,
        asset_type: a.edited_type || a.inferred_type,
        currency: a.edited_currency || a.inferred_currency,
        symbol_public: a.edited_symbol !== undefined ? a.edited_symbol : a.inferred_symbol,
      }));
      await batchUpsertAssets(assets);
      setStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit step 2
  const submitStep2 = async () => {
    setIsSubmitting(true);
    try {
      const validRows = valuationRows.filter(r => 
        r.consultoria && 
        (r.fair_value || r.target_rate || (r.fair_value_low && r.fair_value_high))
      );

      if (validRows.length > 0) {
        const valuations = validRows.map(r => ({
          asset_code: r.asset_code,
          consultoria: r.consultoria,
          ref_date: r.ref_date,
          valuation_type: r.valuation_type,
          fair_value: r.fair_value ? parseFloat(r.fair_value) : null,
          fair_value_low: r.fair_value_low ? parseFloat(r.fair_value_low) : null,
          fair_value_high: r.fair_value_high ? parseFloat(r.fair_value_high) : null,
          target_rate: r.target_rate ? parseFloat(r.target_rate) : null,
          target_yield: null,
          currency: 'BRL',
          classification: null,
          notes: r.notes || null,
        }));
        await batchUpsertValuations(valuations);
      }
      setStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Sync prices
  const handleSyncPrices = async () => {
    setSyncResult(null);
    syncMarketData(undefined);
  };

  const currentAssetType = (a: EditableAsset) => a.edited_type || a.inferred_type;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isOpen) handleOpen();
      else onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configurar Ativos - Passo {step} de 3
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step ? 'bg-primary text-primary-foreground' :
                s === step ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-1 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Asset Identification */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Revise o tipo, moeda e simbolo de cada ativo. Ajuste se necessario.
            </p>
            
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Moeda</TableHead>
                    <TableHead>Simbolo Publico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editableAssets.map((asset, idx) => (
                    <TableRow key={asset.asset_code}>
                      <TableCell className="font-medium">{asset.asset_code}</TableCell>
                      <TableCell>
                        <Select
                          value={currentAssetType(asset)}
                          onValueChange={(v) => updateAssetField(idx, 'edited_type', v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ASSET_TYPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={asset.edited_currency || asset.inferred_currency}
                          onValueChange={(v) => updateAssetField(idx, 'edited_currency', v)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BRL">BRL</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {currentAssetType(asset) === 'renda_fixa' ? (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        ) : (
                          <Input
                            value={asset.edited_symbol !== undefined ? (asset.edited_symbol || '') : (asset.inferred_symbol || '')}
                            onChange={(e) => updateAssetField(idx, 'edited_symbol', e.target.value || null)}
                            placeholder="Ex: BBAS3.SA"
                            className="w-32"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={submitStep1} disabled={isSubmitting}>
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Proximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Batch Valuation */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preencha os valuations. Deixe em branco os que nao deseja configurar agora.
            </p>
            
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Ativo</TableHead>
                    <TableHead className="min-w-[100px]">Consultoria</TableHead>
                    <TableHead className="min-w-[100px]">Tipo</TableHead>
                    <TableHead className="min-w-[100px]">Preco Justo</TableHead>
                    <TableHead className="min-w-[100px]">Taxa Alvo %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuationRows.map((row, idx) => {
                    const assetType = editableAssets[idx]?.edited_type || editableAssets[idx]?.inferred_type;
                    const isRendaFixa = assetType === 'renda_fixa';
                    
                    return (
                      <TableRow key={row.asset_code}>
                        <TableCell className="font-medium">{row.asset_code}</TableCell>
                        <TableCell>
                          <Select
                            value={row.consultoria}
                            onValueChange={(v) => updateValuationField(idx, 'consultoria', v)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AUVP">AUVP</SelectItem>
                              <SelectItem value="Suno">Suno</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.valuation_type}
                            onValueChange={(v) => updateValuationField(idx, 'valuation_type', v)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fair_value">Preco Justo</SelectItem>
                              <SelectItem value="fair_value_range">Faixa</SelectItem>
                              <SelectItem value="target_rate">Taxa Alvo</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {row.valuation_type === 'target_rate' ? (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          ) : row.valuation_type === 'fair_value_range' ? (
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                value={row.fair_value_low}
                                onChange={(e) => updateValuationField(idx, 'fair_value_low', e.target.value)}
                                placeholder="Min"
                                className="w-16"
                              />
                              <Input
                                type="number"
                                value={row.fair_value_high}
                                onChange={(e) => updateValuationField(idx, 'fair_value_high', e.target.value)}
                                placeholder="Max"
                                className="w-16"
                              />
                            </div>
                          ) : (
                            <Input
                              type="number"
                              value={row.fair_value}
                              onChange={(e) => updateValuationField(idx, 'fair_value', e.target.value)}
                              placeholder="0.00"
                              className="w-24"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {row.valuation_type === 'target_rate' ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={row.target_rate}
                              onChange={(e) => updateValuationField(idx, 'target_rate', e.target.value)}
                              placeholder="Ex: 12.5"
                              className="w-20"
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(3)}>Pular</Button>
                <Button onClick={submitStep2} disabled={isSubmitting}>
                  {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Proximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sync Prices */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Atualize os precos de mercado para os ativos com simbolo publico configurado.
              Ativos de renda fixa serao ignorados.
            </p>
            
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Button
                size="lg"
                onClick={handleSyncPrices}
                disabled={isSyncingMarket}
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isSyncingMarket ? 'animate-spin' : ''}`} />
                Atualizar Precos Agora
              </Button>
              
              {syncResult && (
                <div className="text-center">
                  <p className="text-sm">
                    {syncResult.prices} precos atualizados
                  </p>
                  {syncResult.errors.length > 0 && (
                    <div className="mt-2 text-sm text-orange-600">
                      {syncResult.errors.length} erros
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={onClose}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}