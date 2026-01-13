-- Create table: contas_a_pagar
CREATE TABLE public.contas_a_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('cartao', 'emprestimo')),
  instituicao TEXT NOT NULL,
  conta_id UUID NULL REFERENCES public.accounts(id) ON DELETE SET NULL,
  valor_total NUMERIC NOT NULL CHECK (valor_total > 0),
  valor_parcela NUMERIC NOT NULL CHECK (valor_parcela > 0),
  total_parcelas INTEGER NOT NULL CHECK (total_parcelas >= 1),
  data_inicio DATE NOT NULL,
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  parcela_atual INTEGER NOT NULL DEFAULT 1 CHECK (parcela_atual >= 1),
  ultima_baixa_competencia DATE NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'quitado')),
  observacoes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contas_a_pagar ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own contas_a_pagar"
  ON public.contas_a_pagar
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contas_a_pagar"
  ON public.contas_a_pagar
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contas_a_pagar"
  ON public.contas_a_pagar
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contas_a_pagar"
  ON public.contas_a_pagar
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_contas_a_pagar_updated_at
  BEFORE UPDATE ON public.contas_a_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();