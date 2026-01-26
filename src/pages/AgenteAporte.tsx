import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAgenteAporte } from '@/hooks/useAgenteAporte';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { AgentInputPerAsset } from '@/types/agenteAporte';
import { AtivoMapeamentoModal } from '@/components/agenteAporte/AtivoMapeamentoModal';
import { ValuationModal } from '@/components/agenteAporte/ValuationModal';
import { AtivoDetalhesDrawer } from '@/components/agenteAporte/AtivoDetalhesDrawer';
import { SetupWizard } from '@/components/agenteAporte/SetupWizard';
import { PendenciasCard } from '@/components/agenteAporte/PendenciasCard';
import { TopOportunidadesCard } from '@/components/agenteAporte/TopOportunidadesCard';
import { TodosAtivosTab } from '@/components/agenteAporte/TodosAtivosTab';

export default function AgenteAporte() {
  const { 
    agentInputs, 
    isLoading, 
    syncFromPortfolio, 
    isSyncingPortfolio,
    syncMarketData,
    isSyncingMarket,
    calculateDecision,
    getPendingCounts,
    getTopOpportunities,
  } = useAgenteAporte();

  const [activeTab, setActiveTab] = useState('acoes');
  const [selectedAsset, setSelectedAsset] = useState<AgentInputPerAsset | null>(null);
  const [showMapeamento, setShowMapeamento] = useState(false);
  const [showValuation, setShowValuation] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Get pending counts
  const pendingCounts = getPendingCounts();
  
  // Get top opportunities
  const topOpportunities = getTopOpportunities(5);

  // All assets with decisions for the list tab
  const assetsWithDecisions = useMemo(() => {
    return agentInputs.map(input => ({
      ...input,
      decision: calculateDecision(input),
    }));
  }, [agentInputs, calculateDecision]);

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
              Sincronizar
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
            <TabsTrigger value="acoes">Acoes do Dia</TabsTrigger>
            <TabsTrigger value="todos">Todos os Ativos</TabsTrigger>
            <TabsTrigger value="mapeamento">Mapeamento</TabsTrigger>
          </TabsList>

          <TabsContent value="acoes" className="mt-4 space-y-4">
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
                {/* Pendencias Section */}
                <PendenciasCard 
                  counts={pendingCounts} 
                  onResolve={() => setShowWizard(true)} 
                />

                {/* Top Opportunities Section */}
                <TopOportunidadesCard 
                  opportunities={topOpportunities}
                  onAssetClick={handleAssetClick}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="todos" className="mt-4">
            <TodosAtivosTab 
              assets={assetsWithDecisions}
              onAssetClick={handleAssetClick}
            />
          </TabsContent>

          <TabsContent value="mapeamento" className="mt-4">
            <AtivoMapeamentoModal 
              open={true} 
              onClose={() => setActiveTab('acoes')} 
              embedded={true}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Setup Wizard */}
      <SetupWizard 
        open={showWizard} 
        onClose={() => setShowWizard(false)} 
      />

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