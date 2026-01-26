-- Drop main view first (depends on the others)
DROP VIEW IF EXISTS public.v_agent_inputs_per_asset;

-- Now we can safely drop and recreate the simple views with security_invoker
DROP VIEW IF EXISTS public.v_latest_rate_manual;
DROP VIEW IF EXISTS public.v_latest_price_manual;

CREATE OR REPLACE VIEW public.v_latest_rate_manual
WITH (security_invoker = on) AS
SELECT DISTINCT ON (user_id, asset_code)
  user_id,
  asset_code,
  ref_date,
  current_rate,
  notes
FROM public.rate_inputs_manual
ORDER BY user_id, asset_code, ref_date DESC;

CREATE OR REPLACE VIEW public.v_latest_price_manual
WITH (security_invoker = on) AS
SELECT DISTINCT ON (user_id, asset_code)
  user_id,
  asset_code,
  ref_date,
  price,
  currency,
  notes
FROM public.price_inputs_manual
ORDER BY user_id, asset_code, ref_date DESC;

-- Recreate main view
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