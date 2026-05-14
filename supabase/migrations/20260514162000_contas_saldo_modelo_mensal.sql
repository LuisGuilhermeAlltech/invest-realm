-- Modelo mensal para contas saldo: metas por competência e campos detalhados de lançamento

ALTER TABLE public.contas_saldo_movimentacoes
  ADD COLUMN IF NOT EXISTS empresa_origem text,
  ADD COLUMN IF NOT EXISTS empresa_destino text,
  ADD COLUMN IF NOT EXISTS conta_saida text,
  ADD COLUMN IF NOT EXISTS conta_entrada text,
  ADD COLUMN IF NOT EXISTS comprovante_url text;

CREATE TABLE IF NOT EXISTS public.contas_saldo_metas_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conta_pagar_id uuid NOT NULL REFERENCES public.contas_a_pagar(id) ON DELETE CASCADE,
  competencia date NOT NULL,
  valor_meta numeric(12,2) NOT NULL CHECK (valor_meta > 0),
  tipo_meta text NOT NULL DEFAULT 'reducao' CHECK (tipo_meta IN ('reducao', 'aumento')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contas_saldo_metas_mensais_unique UNIQUE (conta_pagar_id, competencia)
);

ALTER TABLE public.contas_saldo_metas_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contas_saldo_metas_mensais"
  ON public.contas_saldo_metas_mensais
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contas_saldo_metas_mensais"
  ON public.contas_saldo_metas_mensais
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contas_saldo_metas_mensais"
  ON public.contas_saldo_metas_mensais
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contas_saldo_metas_mensais"
  ON public.contas_saldo_metas_mensais
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_contas_saldo_metas_user
  ON public.contas_saldo_metas_mensais(user_id);

CREATE INDEX IF NOT EXISTS idx_contas_saldo_metas_competencia
  ON public.contas_saldo_metas_mensais(conta_pagar_id, competencia);

DROP TRIGGER IF EXISTS update_contas_saldo_metas_mensais_updated_at
  ON public.contas_saldo_metas_mensais;

CREATE TRIGGER update_contas_saldo_metas_mensais_updated_at
  BEFORE UPDATE ON public.contas_saldo_metas_mensais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
