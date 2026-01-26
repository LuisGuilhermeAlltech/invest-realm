import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  AssetMaster, 
  AgentInputPerAsset, 
  ConsultoriaValuationSnapshot,
  AgentDecision,
  AgentAction
} from '@/types/agenteAporte';

// Thresholds for decision making
const BUY_MARGIN_SAFETY = 0.20; // 20%
const WAIT_MARGIN_SAFETY = 0.05; // 5%
const MAX_PORTFOLIO_WEIGHT = 0.20; // 20%

export function useAgenteAporte() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all assets from asset_master
  const assetsQuery = useQuery({
    queryKey: ['asset_master', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_master')
        .select('*')
        .eq('active', true)
        .order('asset_code');
      
      if (error) throw error;
      return data as AssetMaster[];
    },
    enabled: !!user,
  });

  // Fetch agent inputs (consolidated view)
  const agentInputsQuery = useQuery({
    queryKey: ['agent_inputs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_agent_inputs_per_asset')
        .select('*');
      
      if (error) throw error;
      return data as AgentInputPerAsset[];
    },
    enabled: !!user,
  });

  // Sync from existing portfolio (ativos table)
  const syncFromPortfolioMutation = useMutation({
    mutationFn: async () => {
      // Get assets from carteira (vw_carteira_atual)
      const { data: carteira, error: carteiraError } = await supabase
        .from('vw_carteira_atual')
        .select('ativo_id, ticker, classe, moeda_base')
        .gt('quantidade_total', 0);
      
      if (carteiraError) throw carteiraError;

      // Map classe to asset_type
      const classeToType: Record<string, string> = {
        acoes_br: 'acao_br',
        acoes_eua: 'acao_us',
        fii: 'fii',
        cripto: 'cripto',
        renda_fixa: 'renda_fixa',
      };

      // Upsert into asset_master
      const inserts = (carteira || []).map((item) => ({
        user_id: user!.id,
        asset_code: item.ticker,
        asset_type: classeToType[item.classe as string] || 'outros',
        currency: item.moeda_base || 'BRL',
        active: true,
      }));

      if (inserts.length === 0) return { synced: 0 };

      const { error } = await supabase
        .from('asset_master')
        .upsert(inserts, { onConflict: 'user_id,asset_code' });

      if (error) throw error;
      return { synced: inserts.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset_master'] });
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      toast({ title: `${data.synced} ativos sincronizados` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao sincronizar', description: error.message, variant: 'destructive' });
    },
  });

  // Update asset mapping
  const updateAssetMutation = useMutation({
    mutationFn: async (data: Partial<AssetMaster> & { asset_code: string }) => {
      const { asset_code, ...updates } = data;
      
      const { error } = await supabase
        .from('asset_master')
        .update(updates)
        .eq('user_id', user!.id)
        .eq('asset_code', asset_code);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_master'] });
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      toast({ title: 'Ativo atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  // Sync market data (call edge function)
  const syncMarketDataMutation = useMutation({
    mutationFn: async (assetCodes?: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nao autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-market-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            asset_codes: assetCodes,
            force: false,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha na sincronizacao');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      queryClient.invalidateQueries({ queryKey: ['market_prices'] });
      
      const msg = `Precos: ${data.updated?.prices || 0}, Cambio: ${data.updated?.fx || 0}`;
      if (data.errors?.length > 0) {
        toast({ 
          title: 'Sincronizacao parcial', 
          description: `${msg}. ${data.errors.length} erros.`,
          variant: 'default' 
        });
      } else {
        toast({ title: 'Dados atualizados', description: msg });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Erro na sincronizacao', description: error.message, variant: 'destructive' });
    },
  });

  // Create/update valuation
  const upsertValuationMutation = useMutation({
    mutationFn: async (data: Omit<ConsultoriaValuationSnapshot, 'id' | 'user_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('consultoria_valuation_snapshots')
        .insert({
          user_id: user!.id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      queryClient.invalidateQueries({ queryKey: ['valuations'] });
      toast({ title: 'Valuation salvo' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  // Calculate agent decision for an asset
  const calculateDecision = (
    input: AgentInputPerAsset,
    portfolioWeight?: number
  ): AgentDecision => {
    const warnings: string[] = [];
    let action: AgentAction = 'esperar';
    const metrics: AgentDecision['metrics'] = {};
    let rationale = '';

    // Check for missing valuation
    if (!input.valuation_type) {
      return {
        action: 'esperar',
        metrics: {},
        rationale: 'Sem valuation manual cadastrado',
        warnings: ['Adicione um valuation para este ativo'],
      };
    }

    // Handle fair_value and fair_value_range
    if (input.valuation_type === 'fair_value' || input.valuation_type === 'fair_value_range') {
      // Check for missing price
      if (!input.price_current) {
        // For renda_fixa, this is expected
        if (input.asset_type === 'renda_fixa') {
          return {
            action: 'esperar',
            metrics: {},
            rationale: 'Renda fixa sem preco publico. Use taxa alvo.',
            warnings: ['Configure valuation por taxa alvo'],
          };
        }
        return {
          action: 'esperar',
          metrics: {},
          rationale: 'Sem preco publico atualizado',
          warnings: ['Atualize os precos de mercado'],
        };
      }

      let fairValue = input.fair_value;
      
      // For range, use the midpoint or low end for conservative approach
      if (input.valuation_type === 'fair_value_range' && input.fair_value_low && input.fair_value_high) {
        fairValue = (input.fair_value_low + input.fair_value_high) / 2;
      }

      if (!fairValue) {
        return {
          action: 'esperar',
          metrics: {},
          rationale: 'Preco justo nao definido',
          warnings: ['Defina o preco justo no valuation'],
        };
      }

      // Currency conversion if needed
      let priceCurrent = input.price_current;
      if (input.valuation_currency !== input.price_currency) {
        if (input.price_currency === 'USD' && input.valuation_currency === 'BRL' && input.fx_usdbrl) {
          priceCurrent = input.price_current * input.fx_usdbrl;
        } else if (input.price_currency === 'BRL' && input.valuation_currency === 'USD' && input.fx_usdbrl) {
          priceCurrent = input.price_current / input.fx_usdbrl;
        }
      }

      // Calculate metrics
      const upside = (fairValue / priceCurrent) - 1;
      const marginSafety = 1 - (priceCurrent / fairValue);

      metrics.upside_pct = upside * 100;
      metrics.margem_seguranca_pct = marginSafety * 100;

      // Decision logic
      if (marginSafety >= BUY_MARGIN_SAFETY) {
        action = 'comprar';
        rationale = `Margem de seguranca de ${(marginSafety * 100).toFixed(1)}% (>= 20%)`;
      } else if (marginSafety >= WAIT_MARGIN_SAFETY) {
        action = 'esperar';
        rationale = `Margem de seguranca de ${(marginSafety * 100).toFixed(1)}% (entre 5% e 20%)`;
      } else {
        action = 'evitar';
        rationale = `Preco acima do justo. Margem: ${(marginSafety * 100).toFixed(1)}%`;
      }
    }

    // Handle target_yield
    if (input.valuation_type === 'target_yield') {
      if (!input.target_yield) {
        return {
          action: 'esperar',
          metrics: {},
          rationale: 'Yield alvo nao definido',
          warnings: ['Defina o yield alvo no valuation'],
        };
      }

      metrics.target_yield = input.target_yield;
      
      // Without actual yield data, default to wait
      return {
        action: 'esperar',
        metrics,
        rationale: 'Yield atual nao disponivel. Informe manualmente.',
        warnings: ['Configure preco justo ou informe yield atual'],
      };
    }

    // Handle target_rate (for renda_fixa)
    if (input.valuation_type === 'target_rate') {
      if (!input.target_rate) {
        return {
          action: 'esperar',
          metrics: {},
          rationale: 'Taxa alvo nao definida',
          warnings: ['Defina a taxa alvo no valuation'],
        };
      }

      metrics.target_rate = input.target_rate;
      
      // For now, default to wait since we don't have current rate
      return {
        action: 'esperar',
        metrics,
        rationale: 'Taxa atual nao disponivel. Compare manualmente.',
        warnings: ['Verifique se a taxa atual >= taxa alvo'],
      };
    }

    // Portfolio weight check
    if (portfolioWeight !== undefined && portfolioWeight > MAX_PORTFOLIO_WEIGHT && action === 'comprar') {
      action = 'esperar';
      warnings.push(`Peso na carteira (${(portfolioWeight * 100).toFixed(1)}%) acima do limite (20%)`);
      rationale += `. Limite de exposicao atingido.`;
    }

    return { action, metrics, rationale, warnings };
  };

  return {
    assets: assetsQuery.data ?? [],
    agentInputs: agentInputsQuery.data ?? [],
    isLoading: assetsQuery.isLoading || agentInputsQuery.isLoading,
    syncFromPortfolio: syncFromPortfolioMutation.mutate,
    isSyncingPortfolio: syncFromPortfolioMutation.isPending,
    updateAsset: updateAssetMutation.mutate,
    syncMarketData: syncMarketDataMutation.mutate,
    isSyncingMarket: syncMarketDataMutation.isPending,
    upsertValuation: upsertValuationMutation.mutate,
    calculateDecision,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['asset_master'] });
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
    },
  };
}
