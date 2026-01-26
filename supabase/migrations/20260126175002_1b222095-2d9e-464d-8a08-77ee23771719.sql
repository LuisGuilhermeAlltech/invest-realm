-- Corrigir views para usar security_invoker (RLS respeitado)

-- Recriar views com security_invoker = true

DROP VIEW IF EXISTS public.v_agent_inputs_per_asset;
DROP VIEW IF EXISTS public.v_latest_valuation_per_asset;
DROP VIEW IF EXISTS public.v_latest_fx_usdbrl;
DROP VIEW IF EXISTS public.v_latest_price_per_asset;

-- View: último preço por ativo
CREATE VIEW public.v_latest_price_per_asset 
WITH (security_invoker = on) AS
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
CREATE VIEW public.v_latest_fx_usdbrl 
WITH (security_invoker = on) AS
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
CREATE VIEW public.v_latest_valuation_per_asset 
WITH (security_invoker = on) AS
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
CREATE VIEW public.v_agent_inputs_per_asset 
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