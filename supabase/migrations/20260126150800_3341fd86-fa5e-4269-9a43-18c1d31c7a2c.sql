-- =====================================================
-- MÓDULO: AGENTE DE APORTE
-- Tabelas, views e RLS para decisão de investimento
-- =====================================================

-- 1.1) Tabela: asset_master (mapeamento universal do ativo)
CREATE TABLE public.asset_master (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    asset_code text NOT NULL,
    asset_type text NOT NULL CHECK (asset_type IN ('acao_br', 'acao_us', 'etf', 'fii', 'cripto', 'renda_fixa', 'outros')),
    exchange text NULL,
    symbol_public text NULL,
    currency text NOT NULL DEFAULT 'BRL',
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, asset_code)
);

ALTER TABLE public.asset_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own asset_master" ON public.asset_master FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own asset_master" ON public.asset_master FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own asset_master" ON public.asset_master FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own asset_master" ON public.asset_master FOR DELETE USING (auth.uid() = user_id);

-- 1.2) Tabela: market_prices_daily (preço do ativo em sua moeda nativa)
CREATE TABLE public.market_prices_daily (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    asset_code text NOT NULL,
    ref_date date NOT NULL,
    close numeric(18,6) NULL,
    open numeric(18,6) NULL,
    high numeric(18,6) NULL,
    low numeric(18,6) NULL,
    volume numeric(22,0) NULL,
    currency text NOT NULL,
    source text NOT NULL DEFAULT 'public_api',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, asset_code, ref_date)
);

CREATE INDEX idx_market_prices_daily_lookup ON public.market_prices_daily (user_id, asset_code, ref_date DESC);

ALTER TABLE public.market_prices_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own market_prices_daily" ON public.market_prices_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own market_prices_daily" ON public.market_prices_daily FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own market_prices_daily" ON public.market_prices_daily FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own market_prices_daily" ON public.market_prices_daily FOR DELETE USING (auth.uid() = user_id);

-- 1.3) Tabela: fx_rates_daily (câmbio diário)
CREATE TABLE public.fx_rates_daily (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    pair text NOT NULL,
    ref_date date NOT NULL,
    rate numeric(18,6) NOT NULL,
    source text NOT NULL DEFAULT 'public_api',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, pair, ref_date)
);

ALTER TABLE public.fx_rates_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fx_rates_daily" ON public.fx_rates_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fx_rates_daily" ON public.fx_rates_daily FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fx_rates_daily" ON public.fx_rates_daily FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fx_rates_daily" ON public.fx_rates_daily FOR DELETE USING (auth.uid() = user_id);

-- 1.4) Tabela: consultoria_valuation_snapshots (input manual do preço justo)
CREATE TABLE public.consultoria_valuation_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    asset_code text NOT NULL,
    ref_date date NOT NULL,
    consultoria text NOT NULL,
    valuation_type text NOT NULL DEFAULT 'fair_value' CHECK (valuation_type IN ('fair_value', 'fair_value_range', 'target_yield', 'target_rate')),
    fair_value numeric(18,6) NULL,
    fair_value_low numeric(18,6) NULL,
    fair_value_high numeric(18,6) NULL,
    target_yield numeric(10,6) NULL,
    target_rate numeric(10,6) NULL,
    currency text NOT NULL DEFAULT 'BRL',
    classification text NULL,
    notes text NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_consultoria_valuation_lookup ON public.consultoria_valuation_snapshots (user_id, asset_code, ref_date DESC);

ALTER TABLE public.consultoria_valuation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultoria_valuation_snapshots" ON public.consultoria_valuation_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consultoria_valuation_snapshots" ON public.consultoria_valuation_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own consultoria_valuation_snapshots" ON public.consultoria_valuation_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own consultoria_valuation_snapshots" ON public.consultoria_valuation_snapshots FOR DELETE USING (auth.uid() = user_id);

-- 1.5) Views utilitárias

-- View: último preço por ativo
CREATE OR REPLACE VIEW public.v_latest_price_per_asset AS
SELECT DISTINCT ON (user_id, asset_code)
    user_id,
    asset_code,
    ref_date,
    close,
    open,
    high,
    low,
    volume,
    currency,
    source
FROM public.market_prices_daily
ORDER BY user_id, asset_code, ref_date DESC;

-- View: último câmbio USD/BRL
CREATE OR REPLACE VIEW public.v_latest_fx_usdbrl AS
SELECT DISTINCT ON (user_id)
    user_id,
    pair,
    ref_date,
    rate,
    source
FROM public.fx_rates_daily
WHERE pair = 'USD/BRL'
ORDER BY user_id, ref_date DESC;

-- View: última valuation por ativo
CREATE OR REPLACE VIEW public.v_latest_valuation_per_asset AS
SELECT DISTINCT ON (user_id, asset_code)
    user_id,
    asset_code,
    ref_date,
    consultoria,
    valuation_type,
    fair_value,
    fair_value_low,
    fair_value_high,
    target_yield,
    target_rate,
    currency,
    classification,
    notes
FROM public.consultoria_valuation_snapshots
ORDER BY user_id, asset_code, ref_date DESC;

-- View: inputs consolidados para o agente
CREATE OR REPLACE VIEW public.v_agent_inputs_per_asset AS
SELECT 
    am.user_id,
    am.asset_code,
    am.asset_type,
    am.exchange,
    am.symbol_public,
    am.currency AS asset_currency,
    am.active,
    lp.ref_date AS price_date,
    lp.close AS price_current,
    lp.currency AS price_currency,
    lv.ref_date AS valuation_date,
    lv.consultoria,
    lv.valuation_type,
    lv.fair_value,
    lv.fair_value_low,
    lv.fair_value_high,
    lv.target_yield,
    lv.target_rate,
    lv.currency AS valuation_currency,
    lv.classification,
    lv.notes AS valuation_notes,
    fx.rate AS fx_usdbrl,
    fx.ref_date AS fx_date
FROM public.asset_master am
LEFT JOIN public.v_latest_price_per_asset lp ON am.user_id = lp.user_id AND am.asset_code = lp.asset_code
LEFT JOIN public.v_latest_valuation_per_asset lv ON am.user_id = lv.user_id AND am.asset_code = lv.asset_code
LEFT JOIN public.v_latest_fx_usdbrl fx ON am.user_id = fx.user_id
WHERE am.active = true;