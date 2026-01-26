import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  AssetMaster, 
  AgentInputPerAsset, 
  ConsultoriaValuationSnapshot,
  AgentDecision,
  AgentAction,
  PortfolioAsset,
  PendingCounts,
  AssetInference
} from '@/types/agenteAporte';

// Thresholds for decision making
const BUY_MARGIN_SAFETY = 0.20; // 20%
const WAIT_MARGIN_SAFETY = 0.05; // 5%
const MAX_PORTFOLIO_WEIGHT = 0.20; // 20%

// Asset inference helpers
function inferAssetType(ticker: string, classe: string): string {
  const classeToType: Record<string, string> = {
    acoes_br: 'acao_br',
    acoes_eua: 'acao_us',
    fii: 'fii',
    cripto: 'cripto',
    renda_fixa: 'renda_fixa',
  };
  
  if (classeToType[classe]) return classeToType[classe];
  
  // Fallback inference by ticker pattern
  const upper = ticker.toUpperCase();
  if (upper.endsWith('11') && /^\d/.test(upper.slice(-3, -2))) return 'fii';
  if (/^[A-Z]{4}[34]$/.test(upper)) return 'acao_br';
  if (['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'DOT', 'AVAX', 'LINK', 'MATIC'].includes(upper)) return 'cripto';
  if (upper.startsWith('TESOURO') || upper.startsWith('CDB') || upper.startsWith('LCI') || upper.startsWith('LCA')) return 'renda_fixa';
  if (/^[A-Z]{1,5}$/.test(upper)) return 'acao_us';
  
  return 'outros';
}

function inferCurrency(assetType: string, moedaBase: string): string {
  if (assetType === 'acao_us') return 'USD';
  if (assetType === 'cripto') return 'USD';
  return moedaBase || 'BRL';
}

function inferSymbol(ticker: string, assetType: string): string | null {
  if (assetType === 'renda_fixa') return null;
  if (assetType === 'acao_br' || assetType === 'fii') return `${ticker}.SA`;
  if (assetType === 'acao_us') return ticker;
  if (assetType === 'cripto') return ticker;
  return null;
}

function needsSymbol(assetType: string): boolean {
  return assetType !== 'renda_fixa';
}

export function useAgenteAporte() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch portfolio assets
  const portfolioQuery = useQuery({
    queryKey: ['portfolio_assets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_carteira_atual')
        .select('ticker, classe, moeda_base, quantidade_total')
        .gt('quantidade_total', 0);
      
      if (error) throw error;
      return data as PortfolioAsset[];
    },
    enabled: !!user,
  });

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

  // Calculate pending counts
  const getPendingCounts = (): PendingCounts => {
    const portfolio = portfolioQuery.data ?? [];
    const assets = assetsQuery.data ?? [];
    const inputs = agentInputsQuery.data ?? [];

    const assetCodes = new Set(assets.map(a => a.asset_code));
    
    let sem_mapeamento = 0;
    let sem_valuation = 0;
    let sem_preco = 0;

    portfolio.forEach(p => {
      if (!assetCodes.has(p.ticker)) {
        sem_mapeamento++;
      }
    });

    inputs.forEach(input => {
      if (!input.valuation_type) {
        sem_valuation++;
      }
      if (!input.price_current && input.asset_type !== 'renda_fixa') {
        sem_preco++;
      }
    });

    return { sem_mapeamento, sem_valuation, sem_preco };
  };

  // Get inferred assets for wizard
  const getInferredAssets = (): AssetInference[] => {
    const portfolio = portfolioQuery.data ?? [];
    const assets = assetsQuery.data ?? [];
    const assetMap = new Map(assets.map(a => [a.asset_code, a]));

    return portfolio.map(p => {
      const existing = assetMap.get(p.ticker);
      const inferredType = existing?.asset_type || inferAssetType(p.ticker, p.classe);
      const inferredCurrency = existing?.currency || inferCurrency(inferredType, p.moeda_base);
      
      return {
        asset_code: p.ticker,
        inferred_type: inferredType,
        inferred_currency: inferredCurrency,
        inferred_symbol: existing?.symbol_public || inferSymbol(p.ticker, inferredType),
        needs_symbol: needsSymbol(inferredType),
      };
    });
  };

  // Get top opportunities (assets ready for decision with positive margin)
  const getTopOpportunities = (limit = 5): (AgentInputPerAsset & { decision: AgentDecision })[] => {
    const inputs = agentInputsQuery.data ?? [];
    
    const withDecisions = inputs
      .map(input => ({ ...input, decision: calculateDecision(input) }))
      .filter(item => {
        // Has sufficient data for decision
        if (!item.valuation_type) return false;
        
        // For fair_value types, need price
        if ((item.valuation_type === 'fair_value' || item.valuation_type === 'fair_value_range') 
            && !item.price_current) {
          return false;
        }
        
        // For target_rate, need current_rate_manual
        if (item.valuation_type === 'target_rate' && !item.current_rate_manual) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        const marginA = a.decision.metrics.margem_seguranca_pct ?? a.decision.metrics.upside_pct ?? -999;
        const marginB = b.decision.metrics.margem_seguranca_pct ?? b.decision.metrics.upside_pct ?? -999;
        return marginB - marginA;
      });

    return withDecisions.slice(0, limit);
  };

  // Sync from existing portfolio (ativos table)
  const syncFromPortfolioMutation = useMutation({
    mutationFn: async () => {
      const portfolio = portfolioQuery.data ?? [];
      
      const inserts = portfolio.map((item) => {
        const assetType = inferAssetType(item.ticker, item.classe);
        return {
          user_id: user!.id,
          asset_code: item.ticker,
          asset_type: assetType,
          currency: inferCurrency(assetType, item.moeda_base),
          symbol_public: inferSymbol(item.ticker, assetType),
          active: true,
        };
      });

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

  // Batch upsert assets (from wizard)
  const batchUpsertAssetsMutation = useMutation({
    mutationFn: async (assets: Array<{ asset_code: string; asset_type: string; currency: string; symbol_public: string | null }>) => {
      const inserts = assets.map(a => ({
        user_id: user!.id,
        ...a,
        active: true,
      }));

      const { error } = await supabase
        .from('asset_master')
        .upsert(inserts, { onConflict: 'user_id,asset_code' });

      if (error) throw error;
      return { count: inserts.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset_master'] });
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      toast({ title: `${data.count} ativos atualizados` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  // Batch upsert valuations
  const batchUpsertValuationsMutation = useMutation({
    mutationFn: async (valuations: Array<Omit<ConsultoriaValuationSnapshot, 'id' | 'user_id' | 'created_at'>>) => {
      const inserts = valuations.map(v => ({
        user_id: user!.id,
        ...v,
      }));

      const { error } = await supabase
        .from('consultoria_valuation_snapshots')
        .insert(inserts);

      if (error) throw error;
      return { count: inserts.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      queryClient.invalidateQueries({ queryKey: ['valuations'] });
      toast({ title: `${data.count} valuations salvos` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  // Save manual rate (for renda fixa)
  const saveManualRateMutation = useMutation({
    mutationFn: async (data: { asset_code: string; current_rate: number; notes?: string }) => {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('rate_inputs_manual')
        .upsert({
          user_id: user!.id,
          asset_code: data.asset_code,
          ref_date: today,
          current_rate: data.current_rate,
          notes: data.notes || null,
        }, { onConflict: 'user_id,asset_code,ref_date' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      toast({ title: 'Taxa atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  // Save manual price (for crypto fallback)
  const saveManualPriceMutation = useMutation({
    mutationFn: async (data: { asset_code: string; price: number; currency: string; notes?: string }) => {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('price_inputs_manual')
        .upsert({
          user_id: user!.id,
          asset_code: data.asset_code,
          ref_date: today,
          price: data.price,
          currency: data.currency,
          notes: data.notes || null,
        }, { onConflict: 'user_id,asset_code,ref_date' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
      toast({ title: 'Preco atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
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

      // Filter out renda_fixa assets
      const assets = assetsQuery.data ?? [];
      const codesToSync = assetCodes 
        ? assetCodes.filter(code => {
            const asset = assets.find(a => a.asset_code === code);
            return asset && asset.asset_type !== 'renda_fixa' && asset.symbol_public;
          })
        : assets
            .filter(a => a.asset_type !== 'renda_fixa' && a.symbol_public)
            .map(a => a.asset_code);

      if (codesToSync.length === 0) {
        return { updated: { prices: 0, fx: 0 }, errors: [] };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-market-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            asset_codes: codesToSync,
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

      let priceCurrent = input.price_current;
      if (input.valuation_currency !== input.price_currency) {
        if (input.price_currency === 'USD' && input.valuation_currency === 'BRL' && input.fx_usdbrl) {
          priceCurrent = input.price_current * input.fx_usdbrl;
        } else if (input.price_currency === 'BRL' && input.valuation_currency === 'USD' && input.fx_usdbrl) {
          priceCurrent = input.price_current / input.fx_usdbrl;
        }
      }

      const upside = (fairValue / priceCurrent) - 1;
      const marginSafety = 1 - (priceCurrent / fairValue);

      metrics.upside_pct = upside * 100;
      metrics.margem_seguranca_pct = marginSafety * 100;

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
      
      // Check for manual current rate
      if (input.current_rate_manual) {
        metrics.current_rate = input.current_rate_manual;
        
        if (input.current_rate_manual >= input.target_rate) {
          action = 'comprar';
          rationale = `Taxa atual (${input.current_rate_manual.toFixed(2)}%) >= taxa alvo (${input.target_rate.toFixed(2)}%)`;
        } else {
          action = 'esperar';
          rationale = `Taxa atual (${input.current_rate_manual.toFixed(2)}%) < taxa alvo (${input.target_rate.toFixed(2)}%)`;
        }
        
        return { action, metrics, rationale, warnings };
      }
      
      return {
        action: 'esperar',
        metrics,
        rationale: 'Taxa atual nao informada',
        warnings: ['Informe a taxa atual manualmente'],
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
    portfolio: portfolioQuery.data ?? [],
    assets: assetsQuery.data ?? [],
    agentInputs: agentInputsQuery.data ?? [],
    isLoading: portfolioQuery.isLoading || assetsQuery.isLoading || agentInputsQuery.isLoading,
    getPendingCounts,
    getInferredAssets,
    getTopOpportunities,
    syncFromPortfolio: syncFromPortfolioMutation.mutate,
    isSyncingPortfolio: syncFromPortfolioMutation.isPending,
    batchUpsertAssets: batchUpsertAssetsMutation.mutateAsync,
    batchUpsertValuations: batchUpsertValuationsMutation.mutateAsync,
    saveManualRate: saveManualRateMutation.mutate,
    saveManualPrice: saveManualPriceMutation.mutate,
    updateAsset: updateAssetMutation.mutate,
    syncMarketData: syncMarketDataMutation.mutate,
    isSyncingMarket: syncMarketDataMutation.isPending,
    upsertValuation: upsertValuationMutation.mutate,
    calculateDecision,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio_assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset_master'] });
      queryClient.invalidateQueries({ queryKey: ['agent_inputs'] });
    },
  };
}