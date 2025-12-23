
-- Create enum for category types
CREATE TYPE public.tipo_categoria_financeira AS ENUM ('essencial', 'nao_essencial', 'lazer');

-- Create categorias_financeiras table
CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo public.tipo_categoria_financeira NOT NULL,
  limite_mensal NUMERIC NOT NULL DEFAULT 0,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own categorias_financeiras" ON public.categorias_financeiras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categorias_financeiras" ON public.categorias_financeiras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categorias_financeiras" ON public.categorias_financeiras FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categorias_financeiras" ON public.categorias_financeiras FOR DELETE USING (auth.uid() = user_id);

-- Add categoria_id to financeiro_gastos
ALTER TABLE public.financeiro_gastos ADD COLUMN categoria_id UUID REFERENCES public.categorias_financeiras(id);

-- Create index
CREATE INDEX idx_categorias_financeiras_user ON public.categorias_financeiras(user_id);
CREATE INDEX idx_financeiro_gastos_categoria ON public.financeiro_gastos(categoria_id);

-- Trigger for updated_at
CREATE TRIGGER update_categorias_financeiras_updated_at
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- View for gastos by category per month
CREATE OR REPLACE VIEW public.vw_gastos_por_categoria WITH (security_invoker = true) AS
SELECT 
  fg.user_id,
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
LEFT JOIN public.financeiro_gastos fg ON fg.financeiro_mensal_id = fm.id
LEFT JOIN public.categorias_financeiras cf ON fg.categoria_id = cf.id
WHERE cf.id IS NOT NULL
GROUP BY fg.user_id, fm.id, fm.ano, fm.mes, cf.id, cf.nome, cf.tipo, cf.limite_mensal;

-- View for totals by category type per month
CREATE OR REPLACE VIEW public.vw_gastos_por_tipo WITH (security_invoker = true) AS
SELECT 
  fm.user_id,
  fm.id as financeiro_mensal_id,
  fm.ano,
  fm.mes,
  cf.tipo as categoria_tipo,
  COALESCE(SUM(fg.valor), 0) as total_gasto
FROM public.financeiro_mensal fm
LEFT JOIN public.financeiro_gastos fg ON fg.financeiro_mensal_id = fm.id
LEFT JOIN public.categorias_financeiras cf ON fg.categoria_id = cf.id
WHERE cf.id IS NOT NULL
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, cf.tipo;
