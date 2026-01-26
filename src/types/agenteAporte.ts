export interface AssetMaster {
  id: string;
  user_id: string;
  asset_code: string;
  asset_type: 'acao_br' | 'acao_us' | 'etf' | 'fii' | 'cripto' | 'renda_fixa' | 'outros';
  exchange: string | null;
  symbol_public: string | null;
  currency: string;
  active: boolean;
  created_at: string;
}

export interface MarketPriceDaily {
  id: string;
  user_id: string;
  asset_code: string;
  ref_date: string;
  close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  currency: string;
  source: string;
  created_at: string;
}

export interface FxRateDaily {
  id: string;
  user_id: string;
  pair: string;
  ref_date: string;
  rate: number;
  source: string;
  created_at: string;
}

export interface ConsultoriaValuationSnapshot {
  id: string;
  user_id: string;
  asset_code: string;
  ref_date: string;
  consultoria: string;
  valuation_type: 'fair_value' | 'fair_value_range' | 'target_yield' | 'target_rate';
  fair_value: number | null;
  fair_value_low: number | null;
  fair_value_high: number | null;
  target_yield: number | null;
  target_rate: number | null;
  currency: string;
  classification: string | null;
  notes: string | null;
  created_at: string;
}

export interface AgentInputPerAsset {
  user_id: string;
  asset_code: string;
  asset_type: string;
  exchange: string | null;
  symbol_public: string | null;
  asset_currency: string;
  active: boolean;
  price_date: string | null;
  price_current: number | null;
  price_currency: string | null;
  manual_price_date: string | null;
  manual_price: number | null;
  valuation_date: string | null;
  consultoria: string | null;
  valuation_type: string | null;
  fair_value: number | null;
  fair_value_low: number | null;
  fair_value_high: number | null;
  target_yield: number | null;
  target_rate: number | null;
  valuation_currency: string | null;
  classification: string | null;
  valuation_notes: string | null;
  fx_usdbrl: number | null;
  fx_date: string | null;
  rate_manual_date: string | null;
  current_rate_manual: number | null;
}

export interface PortfolioAsset {
  ticker: string;
  classe: string;
  moeda_base: string;
  quantidade_total: number;
}

export interface PendingCounts {
  sem_mapeamento: number;
  sem_valuation: number;
  sem_preco: number;
}

export interface AssetInference {
  asset_code: string;
  inferred_type: string;
  inferred_currency: string;
  inferred_symbol: string | null;
  needs_symbol: boolean;
}

export type AgentAction = 'comprar' | 'esperar' | 'evitar';

export interface AgentDecision {
  action: AgentAction;
  metrics: {
    upside_pct?: number;
    margem_seguranca_pct?: number;
    yield_atual?: number;
    target_yield?: number;
    current_rate?: number;
    target_rate?: number;
  };
  rationale: string;
  warnings: string[];
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
  acao_br: 'Acao BR',
  acao_us: 'Acao US',
  etf: 'ETF',
  fii: 'FII',
  cripto: 'Cripto',
  renda_fixa: 'Renda Fixa',
  outros: 'Outros',
};

export const VALUATION_TYPE_LABELS: Record<string, string> = {
  fair_value: 'Preco Justo',
  fair_value_range: 'Faixa de Valor',
  target_yield: 'Yield Alvo',
  target_rate: 'Taxa Alvo',
};
