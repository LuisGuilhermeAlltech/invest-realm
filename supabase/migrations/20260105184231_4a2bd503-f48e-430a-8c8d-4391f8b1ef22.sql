-- Adicionar 'investimentos' ao enum tipo_categoria_financeira
ALTER TYPE public.tipo_categoria_financeira ADD VALUE IF NOT EXISTS 'investimentos';

-- Criar tabela de limites por tipo de gasto
CREATE TABLE public.limites_tipo_gasto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo public.tipo_categoria_financeira NOT NULL,
  limite_mensal NUMERIC NOT NULL DEFAULT 0,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT limites_tipo_gasto_unique UNIQUE (user_id, tipo, ano, mes)
);

-- Enable RLS
ALTER TABLE public.limites_tipo_gasto ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own limites_tipo_gasto"
  ON public.limites_tipo_gasto FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own limites_tipo_gasto"
  ON public.limites_tipo_gasto FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own limites_tipo_gasto"
  ON public.limites_tipo_gasto FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own limites_tipo_gasto"
  ON public.limites_tipo_gasto FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_limites_tipo_gasto_updated_at
  BEFORE UPDATE ON public.limites_tipo_gasto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();