-- Corrigir views para usar security_invoker (respeitar RLS do usuário)
DROP VIEW IF EXISTS public.vw_financeiro_mensal_acumulado;
DROP VIEW IF EXISTS public.vw_financeiro_mensal_resumo;

-- Recriar view resumo mensal com security_invoker
CREATE VIEW public.vw_financeiro_mensal_resumo 
WITH (security_invoker = true) AS
SELECT
  fm.id,
  fm.user_id,
  fm.ano,
  fm.mes,
  fm.observacao,
  COALESCE((SELECT SUM(fr.valor) FROM public.financeiro_receitas fr WHERE fr.financeiro_mensal_id = fm.id), 0) AS total_receitas,
  COALESCE((SELECT SUM(fg.valor) FROM public.financeiro_gastos fg WHERE fg.financeiro_mensal_id = fm.id), 0) AS total_gastos,
  COALESCE((SELECT SUM(fr.valor) FROM public.financeiro_receitas fr WHERE fr.financeiro_mensal_id = fm.id), 0)
  - COALESCE((SELECT SUM(fg.valor) FROM public.financeiro_gastos fg WHERE fg.financeiro_mensal_id = fm.id), 0) AS saldo_mes
FROM public.financeiro_mensal fm;

-- Recriar view acumulado com security_invoker
CREATE VIEW public.vw_financeiro_mensal_acumulado 
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.user_id,
  a.ano,
  a.mes,
  a.observacao,
  a.total_receitas,
  a.total_gastos,
  a.saldo_mes,
  (
    SELECT COALESCE(SUM(b.saldo_mes), 0)
    FROM public.vw_financeiro_mensal_resumo b
    WHERE b.user_id = a.user_id
      AND (b.ano < a.ano OR (b.ano = a.ano AND b.mes <= a.mes))
  ) AS saldo_acumulado
FROM public.vw_financeiro_mensal_resumo a;