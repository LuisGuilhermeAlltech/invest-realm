
-- 1. Create tipos_gasto table
CREATE TABLE public.tipos_gasto (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  ordem int DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add unique constraint for user_id + nome
ALTER TABLE public.tipos_gasto ADD CONSTRAINT tipos_gasto_user_nome_unique UNIQUE (user_id, nome);

-- Enable RLS
ALTER TABLE public.tipos_gasto ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own tipos_gasto"
  ON public.tipos_gasto FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tipos_gasto"
  ON public.tipos_gasto FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tipos_gasto"
  ON public.tipos_gasto FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tipos_gasto"
  ON public.tipos_gasto FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_tipos_gasto_updated_at
  BEFORE UPDATE ON public.tipos_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add tipo_id column to categorias_financeiras
ALTER TABLE public.categorias_financeiras 
  ADD COLUMN tipo_id uuid REFERENCES public.tipos_gasto(id);

-- 3. Drop and recreate views with new structure
DROP VIEW IF EXISTS public.vw_gastos_por_categoria;
DROP VIEW IF EXISTS public.vw_gastos_por_tipo;

-- Recreate vw_gastos_por_categoria with tipo_id and tipo_nome
CREATE OR REPLACE VIEW public.vw_gastos_por_categoria WITH (security_invoker = true) AS
SELECT 
  fm.user_id,
  fm.id as financeiro_mensal_id,
  fm.ano,
  fm.mes,
  cf.id as categoria_id,
  cf.nome as categoria_nome,
  cf.tipo as categoria_tipo,
  cf.tipo_id,
  tg.nome as tipo_nome,
  cf.limite_mensal,
  COALESCE(SUM(fg.valor), 0) as total_gasto,
  cf.limite_mensal - COALESCE(SUM(fg.valor), 0) as saldo_categoria
FROM public.financeiro_mensal fm
CROSS JOIN public.categorias_financeiras cf
LEFT JOIN public.tipos_gasto tg ON tg.id = cf.tipo_id
LEFT JOIN public.financeiro_gastos fg 
  ON fg.financeiro_mensal_id = fm.id 
  AND fg.categoria_id = cf.id
WHERE cf.user_id = fm.user_id
  AND cf.ativa = true
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, cf.id, cf.nome, cf.tipo, cf.tipo_id, tg.nome, cf.limite_mensal;

-- Recreate vw_gastos_por_tipo grouping by tipo_id and tipo_nome
CREATE OR REPLACE VIEW public.vw_gastos_por_tipo WITH (security_invoker = true) AS
SELECT 
  fm.user_id,
  fm.id as financeiro_mensal_id,
  fm.ano,
  fm.mes,
  cf.tipo_id,
  tg.nome as tipo_nome,
  cf.tipo as categoria_tipo,
  COALESCE(SUM(fg.valor), 0) as total_gasto
FROM public.financeiro_mensal fm
CROSS JOIN public.categorias_financeiras cf
LEFT JOIN public.tipos_gasto tg ON tg.id = cf.tipo_id
LEFT JOIN public.financeiro_gastos fg 
  ON fg.financeiro_mensal_id = fm.id 
  AND fg.categoria_id = cf.id
WHERE cf.user_id = fm.user_id
  AND cf.ativa = true
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, cf.tipo_id, tg.nome, cf.tipo;
