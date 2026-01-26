-- Table for manual rate inputs (renda fixa)
CREATE TABLE public.rate_inputs_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_code text NOT NULL,
  ref_date date NOT NULL,
  current_rate numeric(10,6) NOT NULL,
  notes text NULL,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint
ALTER TABLE public.rate_inputs_manual 
ADD CONSTRAINT rate_inputs_manual_user_asset_date_unique 
UNIQUE (user_id, asset_code, ref_date);

-- Index for performance
CREATE INDEX idx_rate_inputs_manual_lookup 
ON public.rate_inputs_manual (user_id, asset_code, ref_date DESC);

-- RLS
ALTER TABLE public.rate_inputs_manual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate_inputs_manual"
ON public.rate_inputs_manual FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate_inputs_manual"
ON public.rate_inputs_manual FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate_inputs_manual"
ON public.rate_inputs_manual FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rate_inputs_manual"
ON public.rate_inputs_manual FOR DELETE
USING (auth.uid() = user_id);

-- Table for manual price inputs (crypto fallback)
CREATE TABLE public.price_inputs_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_code text NOT NULL,
  ref_date date NOT NULL,
  price numeric(18,6) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  notes text NULL,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint
ALTER TABLE public.price_inputs_manual 
ADD CONSTRAINT price_inputs_manual_user_asset_date_unique 
UNIQUE (user_id, asset_code, ref_date);

-- Index for performance
CREATE INDEX idx_price_inputs_manual_lookup 
ON public.price_inputs_manual (user_id, asset_code, ref_date DESC);

-- RLS
ALTER TABLE public.price_inputs_manual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own price_inputs_manual"
ON public.price_inputs_manual FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price_inputs_manual"
ON public.price_inputs_manual FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price_inputs_manual"
ON public.price_inputs_manual FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price_inputs_manual"
ON public.price_inputs_manual FOR DELETE
USING (auth.uid() = user_id);

-- View for latest manual rate per asset
CREATE OR REPLACE VIEW public.v_latest_rate_manual AS
SELECT DISTINCT ON (user_id, asset_code)
  user_id,
  asset_code,
  ref_date,
  current_rate,
  notes
FROM public.rate_inputs_manual
ORDER BY user_id, asset_code, ref_date DESC;

-- View for latest manual price per asset
CREATE OR REPLACE VIEW public.v_latest_price_manual AS
SELECT DISTINCT ON (user_id, asset_code)
  user_id,
  asset_code,
  ref_date,
  price,
  currency,
  notes
FROM public.price_inputs_manual
ORDER BY user_id, asset_code, ref_date DESC;

-- Update v_agent_inputs_per_asset to include manual rates and prices
DROP VIEW IF EXISTS public.v_agent_inputs_per_asset;

CREATE OR REPLACE VIEW public.v_agent_inputs_per_asset
WITH (security_invoker = on) AS
SELECT 
  am.user_id,
  am.asset_code,
  am.asset_type,
  am.exchange,
  am.symbol_public,
  am.currency AS asset_currency,
  am.active,
  lp.ref_date AS price_date,
  COALESCE(lp.close, lpm.price) AS price_current,
  COALESCE(lp.currency, lpm.currency) AS price_currency,
  lpm.ref_date AS manual_price_date,
  lpm.price AS manual_price,
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
  fx.ref_date AS fx_date,
  lrm.ref_date AS rate_manual_date,
  lrm.current_rate AS current_rate_manual
FROM public.asset_master am
LEFT JOIN public.v_latest_price_per_asset lp 
  ON am.user_id = lp.user_id AND am.asset_code = lp.asset_code
LEFT JOIN public.v_latest_price_manual lpm
  ON am.user_id = lpm.user_id AND am.asset_code = lpm.asset_code
LEFT JOIN public.v_latest_valuation_per_asset lv 
  ON am.user_id = lv.user_id AND am.asset_code = lv.asset_code
LEFT JOIN public.v_latest_fx_usdbrl fx 
  ON am.user_id = fx.user_id
LEFT JOIN public.v_latest_rate_manual lrm
  ON am.user_id = lrm.user_id AND am.asset_code = lrm.asset_code
WHERE am.active = true;