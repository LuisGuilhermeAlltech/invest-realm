
-- 1) Add tipo_id to financeiro_gastos
ALTER TABLE public.financeiro_gastos
  ADD COLUMN tipo_id uuid;

-- 2) Add FK constraint
ALTER TABLE public.financeiro_gastos
  ADD CONSTRAINT financeiro_gastos_tipo_id_fkey
  FOREIGN KEY (tipo_id) REFERENCES public.tipos_gasto(id);

-- 3) Backfill tipo_id from categorias_financeiras via categoria_id
UPDATE public.financeiro_gastos fg
SET tipo_id = cf.tipo_id
FROM public.categorias_financeiras cf
WHERE cf.id = fg.categoria_id
  AND fg.tipo_id IS NULL;

-- 4) For rows with subcategoria_id, move subcategoria to be the new categoria_id
-- (subcategoria IS the specific categorias_financeiras entry in the new model)
UPDATE public.financeiro_gastos
SET categoria_id = subcategoria_id
WHERE subcategoria_id IS NOT NULL;

-- 5) Drop subcategoria_id column (no longer needed)
ALTER TABLE public.financeiro_gastos DROP COLUMN IF EXISTS subcategoria_id;

-- 6) Make tipo_id NOT NULL (after backfill)
-- First set any remaining NULLs to prevent errors
-- (gastos without a valid categoria won't have tipo_id, skip making NOT NULL for safety)
-- ALTER TABLE public.financeiro_gastos ALTER COLUMN tipo_id SET NOT NULL;

-- 7) Drop and recreate vw_gastos_por_tipo to use tipo_id directly from financeiro_gastos
DROP VIEW IF EXISTS public.vw_gastos_por_tipo_resumo;
DROP VIEW IF EXISTS public.vw_gastos_por_tipo;

CREATE VIEW public.vw_gastos_por_tipo
WITH (security_invoker = on) AS
SELECT
  fm.user_id,
  fm.id AS financeiro_mensal_id,
  fm.ano,
  fm.mes,
  fg.tipo_id,
  tg.nome AS tipo_nome,
  COALESCE(SUM(fg.valor), 0) AS total_gasto
FROM public.financeiro_mensal fm
LEFT JOIN public.financeiro_gastos fg ON fg.financeiro_mensal_id = fm.id
LEFT JOIN public.tipos_gasto tg ON tg.id = fg.tipo_id
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, fg.tipo_id, tg.nome;

-- 8) Recreate vw_gastos_por_tipo_resumo
CREATE VIEW public.vw_gastos_por_tipo_resumo
WITH (security_invoker = on) AS
SELECT
  fm.user_id,
  fm.id AS financeiro_mensal_id,
  fm.ano,
  fm.mes,
  fg.tipo_id,
  tg.nome AS tipo_nome,
  COALESCE(SUM(fg.valor), 0) AS total_gasto
FROM public.financeiro_mensal fm
LEFT JOIN public.financeiro_gastos fg ON fg.financeiro_mensal_id = fm.id
LEFT JOIN public.tipos_gasto tg ON tg.id = fg.tipo_id
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, fg.tipo_id, tg.nome;

-- 9) Drop and recreate vw_gastos_por_categoria
-- Now "categoria" = subcategoria (categorias_financeiras linked to tipo)
-- Totals per subcategoria within a month
DROP VIEW IF EXISTS public.vw_gastos_por_categoria;

CREATE VIEW public.vw_gastos_por_categoria
WITH (security_invoker = on) AS
SELECT
  fm.user_id,
  fm.id AS financeiro_mensal_id,
  fm.ano,
  fm.mes,
  cf.id AS categoria_id,
  cf.nome AS categoria_nome,
  cf.tipo AS categoria_tipo,
  cf.tipo_id,
  tg.nome AS tipo_nome,
  cf.limite_mensal,
  COALESCE(SUM(fg.valor), 0) AS total_gasto,
  cf.limite_mensal - COALESCE(SUM(fg.valor), 0) AS saldo_categoria
FROM public.financeiro_mensal fm
CROSS JOIN public.categorias_financeiras cf
LEFT JOIN public.financeiro_gastos fg
  ON fg.financeiro_mensal_id = fm.id
  AND fg.categoria_id = cf.id
LEFT JOIN public.tipos_gasto tg ON tg.id = cf.tipo_id
WHERE cf.user_id = fm.user_id
  AND cf.ativa = true
  AND cf.parent_id IS NULL  -- only root-level subcategorias (not sub-sub)
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes,
         cf.id, cf.nome, cf.tipo, cf.tipo_id, tg.nome, cf.limite_mensal;

-- 10) Update the validate_gasto_categoria trigger to validate tipo_id + categoria relationship
CREATE OR REPLACE FUNCTION public.validate_gasto_categoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  categoria_user_id uuid;
  categoria_tipo_id uuid;
BEGIN
  -- If categoria_id is null, allow (direct macro gasto)
  IF NEW.categoria_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if the category belongs to the same user and matches tipo_id
  SELECT user_id, tipo_id INTO categoria_user_id, categoria_tipo_id
  FROM public.categorias_financeiras
  WHERE id = NEW.categoria_id;
  
  IF categoria_user_id IS NULL THEN
    RAISE EXCEPTION 'Subcategoria não encontrada';
  END IF;
  
  IF categoria_user_id != NEW.user_id THEN
    RAISE EXCEPTION 'Gasto não pode ser vinculado a subcategoria de outro usuário';
  END IF;
  
  -- Validate that subcategoria belongs to the same tipo/macro
  IF NEW.tipo_id IS NOT NULL AND categoria_tipo_id IS NOT NULL AND categoria_tipo_id != NEW.tipo_id THEN
    RAISE EXCEPTION 'Subcategoria não pertence ao mesmo tipo/macro do gasto';
  END IF;
  
  RETURN NEW;
END;
$function$;
