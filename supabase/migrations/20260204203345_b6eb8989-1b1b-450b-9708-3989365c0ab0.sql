-- Add saldo_inicial to contas_a_pagar for balance tracking
ALTER TABLE public.contas_a_pagar
ADD COLUMN IF NOT EXISTS saldo_inicial numeric DEFAULT NULL;

-- Drop existing pagamentos table to recreate with enhanced schema
DROP TABLE IF EXISTS public.contas_saldo_pagamentos;

-- Create enhanced movimentacoes table for saldo accounts
CREATE TABLE public.contas_saldo_movimentacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_pagar_id uuid NOT NULL REFERENCES public.contas_a_pagar(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo_movimentacao text NOT NULL CHECK (tipo_movimentacao IN ('pagamento', 'acrescimo', 'ajuste')),
  valor numeric NOT NULL,
  saldo_anterior numeric NOT NULL,
  saldo_resultante numeric NOT NULL,
  observacao text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contas_saldo_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own movimentacoes"
  ON public.contas_saldo_movimentacoes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own movimentacoes"
  ON public.contas_saldo_movimentacoes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own movimentacoes"
  ON public.contas_saldo_movimentacoes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own movimentacoes"
  ON public.contas_saldo_movimentacoes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_contas_saldo_movimentacoes_conta ON public.contas_saldo_movimentacoes(conta_pagar_id);
CREATE INDEX idx_contas_saldo_movimentacoes_data ON public.contas_saldo_movimentacoes(data);
CREATE INDEX idx_contas_saldo_movimentacoes_user ON public.contas_saldo_movimentacoes(user_id);

-- Create a view for monthly summary of saldo accounts
CREATE OR REPLACE VIEW public.vw_contas_saldo_resumo_mensal
WITH (security_invoker = on)
AS
SELECT 
  m.user_id,
  m.conta_pagar_id,
  date_trunc('month', m.data)::date as mes,
  SUM(CASE WHEN m.tipo_movimentacao = 'pagamento' THEN m.valor ELSE 0 END) as total_pago,
  SUM(CASE WHEN m.tipo_movimentacao = 'acrescimo' THEN m.valor ELSE 0 END) as total_acrescido,
  SUM(CASE WHEN m.tipo_movimentacao = 'ajuste' THEN 
    CASE WHEN m.saldo_resultante < m.saldo_anterior THEN m.saldo_anterior - m.saldo_resultante
    ELSE 0 END
  ELSE 0 END) as total_ajuste_reducao,
  COUNT(*) as qtd_movimentacoes
FROM public.contas_saldo_movimentacoes m
GROUP BY m.user_id, m.conta_pagar_id, date_trunc('month', m.data);

-- Grant permissions
GRANT SELECT ON public.vw_contas_saldo_resumo_mensal TO authenticated;