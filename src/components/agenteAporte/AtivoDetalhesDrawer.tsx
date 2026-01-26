import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgenteAporte } from '@/hooks/useAgenteAporte';
import { AgentInputPerAsset, ASSET_TYPE_LABELS, VALUATION_TYPE_LABELS, AgentAction } from '@/types/agenteAporte';
import { Moeda } from '@/types/database';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, Clock, XCircle, Edit, PlusCircle, RefreshCw, AlertCircle, Save } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  asset: AgentInputPerAsset;
  onAddValuation: () => void;
  onEditMapping: () => void;
}

const ACTION_CONFIG: Record<AgentAction, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  comprar: { label: 'COMPRAR', color: 'bg-green-600', icon: TrendingUp },
  esperar: { label: 'ESPERAR', color: 'bg-yellow-600', icon: Clock },
  evitar: { label: 'EVITAR', color: 'bg-red-600', icon: XCircle },
};

export function AtivoDetalhesDrawer({ open, onClose, asset, onAddValuation, onEditMapping }: Props) {
  const { calculateDecision, syncMarketData, isSyncingMarket, saveManualRate, saveManualPrice } = useAgenteAporte();
  const decision = calculateDecision(asset);
  const config = ACTION_CONFIG[decision.action];
  const Icon = config.icon;

  // Manual rate input for renda fixa
  const [manualRate, setManualRate] = useState<string>(
    asset.current_rate_manual?.toString() || ''
  );
  const [isSavingRate, setIsSavingRate] = useState(false);

  // Manual price input for crypto fallback
  const [manualPrice, setManualPrice] = useState<string>(
    asset.manual_price?.toString() || ''
  );
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  const formatDateLocal = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const handleSaveManualRate = () => {
    const rate = parseFloat(manualRate);
    if (isNaN(rate)) return;
    
    setIsSavingRate(true);
    saveManualRate({ 
      asset_code: asset.asset_code, 
      current_rate: rate 
    });
    setTimeout(() => setIsSavingRate(false), 500);
  };

  const handleSaveManualPrice = () => {
    const price = parseFloat(manualPrice);
    if (isNaN(price)) return;
    
    setIsSavingPrice(true);
    saveManualPrice({ 
      asset_code: asset.asset_code, 
      price,
      currency: asset.asset_currency || 'USD'
    });
    setTimeout(() => setIsSavingPrice(false), 500);
  };

  const isRendaFixa = asset.asset_type === 'renda_fixa';
  const isCripto = asset.asset_type === 'cripto';
  const needsManualPrice = isCripto && !asset.price_current;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{asset.asset_code}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}
              </p>
            </div>
            <Badge className={`${config.color} text-white flex items-center gap-1`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Decisao do Agente</h3>
            <p className="text-sm">{decision.rationale}</p>
            {decision.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {decision.warnings.map((warning, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {Object.keys(decision.metrics).length > 0 && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Metricas</h3>
                <div className="grid grid-cols-2 gap-3">
                  {decision.metrics.margem_seguranca_pct !== undefined && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Margem Seguranca</p>
                      <p className="font-semibold">{decision.metrics.margem_seguranca_pct.toFixed(1)}%</p>
                    </div>
                  )}
                  {decision.metrics.upside_pct !== undefined && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Upside</p>
                      <p className="font-semibold">{decision.metrics.upside_pct.toFixed(1)}%</p>
                    </div>
                  )}
                  {decision.metrics.target_rate !== undefined && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Taxa Alvo</p>
                      <p className="font-semibold">{decision.metrics.target_rate.toFixed(2)}%</p>
                    </div>
                  )}
                  {decision.metrics.current_rate !== undefined && (
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Taxa Atual</p>
                      <p className="font-semibold">{decision.metrics.current_rate.toFixed(2)}%</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Manual Rate Input for Renda Fixa */}
          {isRendaFixa && asset.valuation_type === 'target_rate' && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Taxa Atual (Manual)</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Informe a taxa atual disponivel para este titulo
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 12.50"
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveManualRate}
                    disabled={isSavingRate || !manualRate}
                    size="icon"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
                {asset.rate_manual_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultima atualizacao: {formatDateLocal(asset.rate_manual_date)}
                  </p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Manual Price Input for Crypto */}
          {needsManualPrice && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Preco Atual (Manual)</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Informe o preco manualmente (API indisponivel)
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 50000.00"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveManualPrice}
                    disabled={isSavingPrice || !manualPrice}
                    size="icon"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
                {asset.manual_price_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultima atualizacao: {formatDateLocal(asset.manual_price_date)}
                  </p>
                )}
              </div>
              <Separator />
            </>
          )}

          <div>
            <h3 className="font-semibold mb-2">Preco Atual</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preco:</span>
                <span className="font-medium">
                  {asset.price_current ? formatCurrency(asset.price_current, (asset.price_currency || 'BRL') as Moeda) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span>{formatDateLocal(asset.price_date || asset.manual_price_date)}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Valuation Manual</h3>
            {asset.valuation_type ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span>{VALUATION_TYPE_LABELS[asset.valuation_type] || asset.valuation_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consultoria:</span>
                  <span>{asset.consultoria}</span>
                </div>
                {asset.fair_value && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preco Justo:</span>
                    <span className="font-medium">{formatCurrency(asset.fair_value, (asset.valuation_currency || 'BRL') as Moeda)}</span>
                  </div>
                )}
                {asset.target_rate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa Alvo:</span>
                    <span className="font-medium">{asset.target_rate.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum valuation cadastrado</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Button className="w-full" onClick={onAddValuation}>
              <PlusCircle className="h-4 w-4 mr-2" />
              {asset.valuation_type ? 'Novo Valuation' : 'Adicionar Valuation'}
            </Button>
            <Button variant="outline" className="w-full" onClick={onEditMapping}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Mapeamento
            </Button>
            {!isRendaFixa && (
              <Button variant="outline" className="w-full" onClick={() => syncMarketData([asset.asset_code])} disabled={isSyncingMarket}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingMarket ? 'animate-spin' : ''}`} />
                Atualizar Preco
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}