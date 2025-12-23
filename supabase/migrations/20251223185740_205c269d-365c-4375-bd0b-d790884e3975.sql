
-- Drop existing views
DROP VIEW IF EXISTS public.vw_gastos_por_categoria;
DROP VIEW IF EXISTS public.vw_gastos_por_tipo;

-- Recreate vw_gastos_por_categoria with correct logic
-- Base: financeiro_mensal + categorias_financeiras (by user_id)
-- LEFT JOIN financeiro_gastos
CREATE OR REPLACE VIEW public.vw_gastos_por_categoria WITH (security_invoker = true) AS
SELECT 
  fm.user_id,
  fm.id as financeiro_mensal_id,
  fm.ano,
  fm.mes,
  cf.id as categoria_id,
  cf.nome as categoria_nome,
  cf.tipo as categoria_tipo,
  cf.limite_mensal,
  COALESCE(SUM(fg.valor), 0) as total_gasto,
  cf.limite_mensal - COALESCE(SUM(fg.valor), 0) as saldo_categoria
FROM public.financeiro_mensal fm
CROSS JOIN public.categorias_financeiras cf
LEFT JOIN public.financeiro_gastos fg 
  ON fg.financeiro_mensal_id = fm.id 
  AND fg.categoria_id = cf.id
WHERE cf.user_id = fm.user_id
  AND cf.ativa = true
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, cf.id, cf.nome, cf.tipo, cf.limite_mensal;

-- Recreate vw_gastos_por_tipo with correct logic
-- Lists all category types for each month, even without expenses
CREATE OR REPLACE VIEW public.vw_gastos_por_tipo WITH (security_invoker = true) AS
WITH tipos AS (
  SELECT unnest(enum_range(NULL::tipo_categoria_financeira)) as tipo
),
meses_tipos AS (
  SELECT 
    fm.user_id,
    fm.id as financeiro_mensal_id,
    fm.ano,
    fm.mes,
    t.tipo as categoria_tipo
  FROM public.financeiro_mensal fm
  CROSS JOIN tipos t
)
SELECT 
  mt.user_id,
  mt.financeiro_mensal_id,
  mt.ano,
  mt.mes,
  mt.categoria_tipo,
  COALESCE(SUM(fg.valor), 0) as total_gasto
FROM meses_tipos mt
LEFT JOIN public.categorias_financeiras cf 
  ON cf.user_id = mt.user_id 
  AND cf.tipo = mt.categoria_tipo
LEFT JOIN public.financeiro_gastos fg 
  ON fg.financeiro_mensal_id = mt.financeiro_mensal_id 
  AND fg.categoria_id = cf.id
GROUP BY mt.user_id, mt.financeiro_mensal_id, mt.ano, mt.mes, mt.categoria_tipo;

-- Create function to validate gasto belongs to user's category
CREATE OR REPLACE FUNCTION public.validate_gasto_categoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  categoria_user_id uuid;
BEGIN
  -- If categoria_id is null, allow (category is optional for backwards compatibility)
  IF NEW.categoria_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if the category belongs to the same user
  SELECT user_id INTO categoria_user_id
  FROM public.categorias_financeiras
  WHERE id = NEW.categoria_id;
  
  IF categoria_user_id IS NULL THEN
    RAISE EXCEPTION 'Categoria não encontrada';
  END IF;
  
  IF categoria_user_id != NEW.user_id THEN
    RAISE EXCEPTION 'Gasto não pode ser vinculado a categoria de outro usuário';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate on insert and update
DROP TRIGGER IF EXISTS validate_gasto_categoria_trigger ON public.financeiro_gastos;
CREATE TRIGGER validate_gasto_categoria_trigger
  BEFORE INSERT OR UPDATE ON public.financeiro_gastos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gasto_categoria();
