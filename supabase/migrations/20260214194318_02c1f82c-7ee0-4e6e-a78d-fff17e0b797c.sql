
-- 1) Add parent_id to categorias_financeiras for subcategories
ALTER TABLE public.categorias_financeiras
  ADD COLUMN parent_id uuid REFERENCES public.categorias_financeiras(id) ON DELETE CASCADE;

-- Index for fast subcategory lookups
CREATE INDEX idx_categorias_financeiras_parent_id ON public.categorias_financeiras(parent_id);

-- 2) Add subcategoria_id to financeiro_gastos
ALTER TABLE public.financeiro_gastos
  ADD COLUMN subcategoria_id uuid REFERENCES public.categorias_financeiras(id);

CREATE INDEX idx_financeiro_gastos_subcategoria_id ON public.financeiro_gastos(subcategoria_id);

-- 3) Fix limites_tipo_gasto: add tipo_id column, migrate data, drop enum column
-- Add the new column
ALTER TABLE public.limites_tipo_gasto
  ADD COLUMN tipo_id uuid REFERENCES public.tipos_gasto(id);

-- Migrate existing data: match enum labels to tipos_gasto names
UPDATE public.limites_tipo_gasto lt
SET tipo_id = tg.id
FROM public.tipos_gasto tg
WHERE (
  (lt.tipo = 'essencial' AND LOWER(tg.nome) = 'essencial' AND tg.user_id = lt.user_id) OR
  (lt.tipo = 'nao_essencial' AND LOWER(tg.nome) IN ('não essencial', 'nao essencial') AND tg.user_id = lt.user_id) OR
  (lt.tipo = 'lazer' AND LOWER(tg.nome) = 'lazer' AND tg.user_id = lt.user_id) OR
  (lt.tipo = 'investimentos' AND LOWER(tg.nome) = 'investimentos' AND tg.user_id = lt.user_id)
);

-- Make tipo column nullable (can't drop yet since it's enum-based, keep for safety)
ALTER TABLE public.limites_tipo_gasto ALTER COLUMN tipo DROP NOT NULL;

-- Create unique constraint on new key
CREATE UNIQUE INDEX idx_limites_tipo_gasto_unique ON public.limites_tipo_gasto(user_id, tipo_id, ano, mes) WHERE tipo_id IS NOT NULL;

-- 4) Update vw_gastos_por_categoria to sum root + subcategory gastos
CREATE OR REPLACE VIEW public.vw_gastos_por_categoria AS
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
  COALESCE(gastos.total, 0) AS total_gasto,
  cf.limite_mensal - COALESCE(gastos.total, 0) AS saldo_categoria
FROM public.financeiro_mensal fm
CROSS JOIN public.categorias_financeiras cf
LEFT JOIN public.tipos_gasto tg ON cf.tipo_id = tg.id
LEFT JOIN (
  SELECT
    fg.financeiro_mensal_id,
    -- For root categories: sum own gastos + gastos of subcategories
    CASE
      WHEN fg.categoria_id = root_cat.id THEN root_cat.id
      WHEN sub_cat.parent_id IS NOT NULL THEN sub_cat.parent_id
      ELSE fg.categoria_id
    END AS root_categoria_id,
    SUM(fg.valor) AS total
  FROM public.financeiro_gastos fg
  LEFT JOIN public.categorias_financeiras sub_cat ON fg.categoria_id = sub_cat.id
  LEFT JOIN public.categorias_financeiras root_cat ON fg.categoria_id = root_cat.id
  GROUP BY fg.financeiro_mensal_id,
    CASE
      WHEN fg.categoria_id = root_cat.id THEN root_cat.id
      WHEN sub_cat.parent_id IS NOT NULL THEN sub_cat.parent_id
      ELSE fg.categoria_id
    END
) gastos ON gastos.financeiro_mensal_id = fm.id AND gastos.root_categoria_id = cf.id
WHERE cf.user_id = fm.user_id
  AND cf.ativa = true
  AND cf.parent_id IS NULL  -- Only show root categories in summary
ORDER BY fm.ano, fm.mes, cf.nome;
