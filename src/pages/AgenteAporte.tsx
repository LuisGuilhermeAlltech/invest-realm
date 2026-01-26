import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAgenteAporte } from '@/hooks/useAgenteAporte';
import { Card, CardContent } from '@/components/ui/card';
import { Moeda } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { AgentInputPerAsset, ASSET_TYPE_LABELS, AgentAction } from '@/types/agenteAporte';
import { AtivoMapeamentoModal } from '@/components/agenteAporte/AtivoMapeamentoModal';
import { ValuationModal } from '@/components/agenteAporte/ValuationModal';
import { AtivoDetalhesDrawer } from '@/components/agenteAporte/AtivoDetalhesDrawer';

const ACTION_CONFIG: Record<AgentAction, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  comprar: { label: 'COMPRAR', color: 'bg-green-600', icon: TrendingUp },
  esperar: { label: 'ESPERAR', color: 'bg-yellow-600', icon: Clock },
  evitar: { label: 'EVITAR', color: 'bg-red-600', icon: XCircle },
};

export default function AgenteAporte() {
  const { 
    agentInputs, 
    isLoading, 
    syncFromPortfolio, 
    isSyncingPortfolio,
    syncMarketData,
    isSyncingMarket,
    calculateDecision
  } = useAgenteAporte();

  const [activeTab, setActiveTab] = useState('agente');
  const [selectedAsset, setSelectedAsset] = useState<AgentInputPerAsset | null>(null);
  const [showMapeamento, setShowMapeamento] = useState(false);
  const [showValuation, setShowValuation] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Calculate decisions for all assets
  const assetsWithDecisions = useMemo(() => {
    return agentInputs.map(input => ({
      ...input,
      decision: calculateDecision(input),
    }));
  }, [agentInputs, calculateDecision]);

  // Group by action
  const groupedAssets = useMemo(() => {
    const groups: Record<AgentAction, typeof assetsWithDecisions> = {
      comprar: [],
      esperar: [],
      evitar: [],
    };

    assetsWithDecisions.forEach(asset => {
      groups[asset.decision.action].push(asset);
    });

    return groups;
  }, [assetsWithDecisions]);

  const handleAssetClick = (asset: AgentInputPerAsset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
  };

  const handleAddValuation = (asset: AgentInputPerAsset) => {
    setSelectedAsset(asset);
    setShowValuation(true);
  };

  const handleEditMapping = (asset: AgentInputPerAsset) => {
    setSelectedAsset(asset);
    setShowMapeamento(true);
  };

  const renderAssetCard = (asset: typeof assetsWithDecisions[0]) => {
    const { decision } = asset;
    const config = ACTION_CONFIG[decision.action];
    const Icon = config.icon;

    const hasWarnings = decision.warnings.length > 0;
    const hasPriceIssue = !asset.price_current && asset.asset_type !== 'renda_fixa';
    const hasValuationIssue = !asset.valuation_type;

    return (
      <Card 
        key={asset.asset_code} 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleAssetClick(asset)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{asset.asset_code}</h3>
              <p className="text-sm text-muted-foreground">
                {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}
              </p>
            </div>
            <Badge className={`${config.color} text-white flex items-center gap-1`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-muted-foreground">Preco Atual:</span>
              <p className="font-medium">
                {asset.price_current 
                  ? formatCurrency(asset.price_current, (asset.price_currency || 'BRL') as Moeda)
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Preco Justo:</span>
              <p className="font-medium">
                {asset.fair_value 
                  ? formatCurrency(asset.fair_value, (asset.valuation_currency || 'BRL') as Moeda)
                  : asset.fair_value_low && asset.fair_value_high
                    ? `${formatCurrency(asset.fair_value_low, (asset.valuation_currency || 'BRL') as Moeda)} - ${formatCurrency(asset.fair_value_high, (asset.valuation_currency || 'BRL') as Moeda)}`
                    : '—'}
              </p>
            </div>
          </div>

          {decision.metrics.margem_seguranca_pct !== undefined && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Margem:</span>
              <span className={`text-sm font-medium ${
                decision.metrics.margem_seguranca_pct >= 20 ? 'text-green-600' :
                decision.metrics.margem_seguranca_pct >= 5 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {decision.metrics.margem_seguranca_pct.toFixed(1)}%
              </span>
            </div>
          )}

          <p className="text-sm text-muted-foreground line-clamp-2">{decision.rationale}</p>

          {(hasPriceIssue || hasValuationIssue || hasWarnings) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {hasPriceIssue && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Sem preco
                </Badge>
              )}
              {hasValuationIssue && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Sem valuation
                </Badge>
              )}
              {!asset.symbol_public && asset.asset_type !== 'renda_fixa' && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Sem simbolo
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActionSection = (action: AgentAction, assets: typeof assetsWithDecisions) => {
    if (assets.length === 0) return null;

    const config = ACTION_CONFIG[action];

    return (
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <config.icon className="h-5 w-5" />
          {config.label} ({assets.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map(renderAssetCard)}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Agente de Aporte</h1>
            <p className="text-muted-foreground">
              Decisoes de investimento baseadas em precos e valuations
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncFromPortfolio()}
              disabled={isSyncingPortfolio}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingPortfolio ? 'animate-spin' : ''}`} />
              Sincronizar Carteira
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => syncMarketData(undefined)}
              disabled={isSyncingMarket}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingMarket ? 'animate-spin' : ''}`} />
              Atualizar Precos
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="agente">Agente</TabsTrigger>
            <TabsTrigger value="mapeamento">Mapeamento</TabsTrigger>
          </TabsList>

          <TabsContent value="agente" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : agentInputs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center mb-4">
                    Nenhum ativo mapeado. Sincronize sua carteira para comecar.
                  </p>
                  <Button onClick={() => syncFromPortfolio()} disabled={isSyncingPortfolio}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingPortfolio ? 'animate-spin' : ''}`} />
                    Sincronizar Carteira
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {renderActionSection('comprar', groupedAssets.comprar)}
                {renderActionSection('esperar', groupedAssets.esperar)}
                {renderActionSection('evitar', groupedAssets.evitar)}
              </>
            )}
          </TabsContent>

          <TabsContent value="mapeamento" className="mt-4">
            <AtivoMapeamentoModal 
              open={true} 
              onClose={() => setActiveTab('agente')} 
              embedded={true}
            />
          </TabsContent>
        </Tabs>
      </div>

      {selectedAsset && (
        <>
          <AtivoDetalhesDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            asset={selectedAsset}
            onAddValuation={() => {
              setDrawerOpen(false);
              handleAddValuation(selectedAsset);
            }}
            onEditMapping={() => {
              setDrawerOpen(false);
              handleEditMapping(selectedAsset);
            }}
          />

          <ValuationModal
            open={showValuation}
            onClose={() => setShowValuation(false)}
            assetCode={selectedAsset.asset_code}
          />

          <AtivoMapeamentoModal
            open={showMapeamento}
            onClose={() => setShowMapeamento(false)}
            asset={selectedAsset}
          />
        </>
      )}
    </AppLayout>
  );
}
