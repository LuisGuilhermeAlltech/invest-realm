-- Create table for tracking payments on balance accounts
CREATE TABLE public.contas_saldo_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conta_pagar_id UUID NOT NULL REFERENCES public.contas_a_pagar(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC NOT NULL,
  descricao TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contas_saldo_pagamentos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own contas_saldo_pagamentos" 
ON public.contas_saldo_pagamentos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contas_saldo_pagamentos" 
ON public.contas_saldo_pagamentos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contas_saldo_pagamentos" 
ON public.contas_saldo_pagamentos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contas_saldo_pagamentos" 
ON public.contas_saldo_pagamentos 
FOR DELETE 
USING (auth.uid() = user_id);