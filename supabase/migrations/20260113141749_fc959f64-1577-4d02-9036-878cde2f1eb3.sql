-- Add new columns to contas_a_pagar for supporting 'saldo' mode
ALTER TABLE public.contas_a_pagar 
ADD COLUMN IF NOT EXISTS modo TEXT NOT NULL DEFAULT 'parcelada',
ADD COLUMN IF NOT EXISTS saldo_atual NUMERIC NULL,
ADD COLUMN IF NOT EXISTS pagamento_minimo NUMERIC NULL,
ADD COLUMN IF NOT EXISTS meta_pagamento NUMERIC NULL,
ADD COLUMN IF NOT EXISTS saldo_ultima_atualizacao TIMESTAMPTZ NULL;

-- Make parcelada-specific columns nullable (they were required before)
ALTER TABLE public.contas_a_pagar 
ALTER COLUMN valor_total DROP NOT NULL,
ALTER COLUMN valor_parcela DROP NOT NULL,
ALTER COLUMN total_parcelas DROP NOT NULL,
ALTER COLUMN data_inicio DROP NOT NULL;

-- Add check constraint for modo
ALTER TABLE public.contas_a_pagar 
ADD CONSTRAINT contas_a_pagar_modo_check CHECK (modo IN ('parcelada', 'saldo'));

-- Create table for saldo history
CREATE TABLE public.contas_saldo_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conta_pagar_id UUID NOT NULL REFERENCES public.contas_a_pagar(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  saldo NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT contas_saldo_historico_unique UNIQUE (conta_pagar_id, competencia)
);

-- Enable RLS on contas_saldo_historico
ALTER TABLE public.contas_saldo_historico ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contas_saldo_historico
CREATE POLICY "Users can view own contas_saldo_historico" 
ON public.contas_saldo_historico 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contas_saldo_historico" 
ON public.contas_saldo_historico 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contas_saldo_historico" 
ON public.contas_saldo_historico 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contas_saldo_historico" 
ON public.contas_saldo_historico 
FOR DELETE 
USING (auth.uid() = user_id);