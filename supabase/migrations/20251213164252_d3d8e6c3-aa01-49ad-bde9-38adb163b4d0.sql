-- Create enum for transaction types
CREATE TYPE public.tipo_transacao_caixa AS ENUM ('DEPOSITO', 'PROVENTO', 'TRANSFERENCIA', 'APLICACAO', 'RESGATE', 'SAQUE');

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  moeda TEXT NOT NULL CHECK (moeda IN ('BRL', 'USD')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cash_transactions table
CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL,
  tipo tipo_transacao_caixa NOT NULL,
  conta_origem_id UUID REFERENCES public.accounts(id),
  conta_destino_id UUID REFERENCES public.accounts(id),
  valor NUMERIC NOT NULL CHECK (valor > 0),
  moeda TEXT NOT NULL CHECK (moeda IN ('BRL', 'USD')),
  descricao TEXT,
  ativo_id UUID REFERENCES public.ativos(id),
  movimentacao_id UUID REFERENCES public.movimentacoes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new columns to ativos table
ALTER TABLE public.ativos 
ADD COLUMN data_ultimo_provento DATE,
ADD COLUMN data_ultima_atualizacao_proventos DATE;

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Users can view own accounts" ON public.accounts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON public.accounts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON public.accounts
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON public.accounts
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for cash_transactions
CREATE POLICY "Users can view own cash_transactions" ON public.cash_transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cash_transactions" ON public.cash_transactions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cash_transactions" ON public.cash_transactions
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cash_transactions" ON public.cash_transactions
FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_transactions_updated_at
BEFORE UPDATE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for cash_transactions
CREATE OR REPLACE FUNCTION public.validate_cash_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moeda_origem TEXT;
  moeda_destino TEXT;
BEGIN
  -- Validate required fields by type
  CASE NEW.tipo
    WHEN 'DEPOSITO' THEN
      IF NEW.conta_destino_id IS NULL THEN
        RAISE EXCEPTION 'DEPOSITO requires conta_destino_id';
      END IF;
    WHEN 'PROVENTO' THEN
      IF NEW.conta_destino_id IS NULL OR NEW.ativo_id IS NULL THEN
        RAISE EXCEPTION 'PROVENTO requires conta_destino_id and ativo_id';
      END IF;
    WHEN 'TRANSFERENCIA' THEN
      IF NEW.conta_origem_id IS NULL OR NEW.conta_destino_id IS NULL THEN
        RAISE EXCEPTION 'TRANSFERENCIA requires conta_origem_id and conta_destino_id';
      END IF;
      IF NEW.conta_origem_id = NEW.conta_destino_id THEN
        RAISE EXCEPTION 'TRANSFERENCIA cannot have same origin and destination';
      END IF;
    WHEN 'APLICACAO' THEN
      IF NEW.conta_origem_id IS NULL OR NEW.ativo_id IS NULL THEN
        RAISE EXCEPTION 'APLICACAO requires conta_origem_id and ativo_id';
      END IF;
    WHEN 'RESGATE' THEN
      IF NEW.conta_destino_id IS NULL OR NEW.ativo_id IS NULL THEN
        RAISE EXCEPTION 'RESGATE requires conta_destino_id and ativo_id';
      END IF;
    WHEN 'SAQUE' THEN
      IF NEW.conta_origem_id IS NULL THEN
        RAISE EXCEPTION 'SAQUE requires conta_origem_id';
      END IF;
  END CASE;

  -- Validate currency matches account currency
  IF NEW.conta_origem_id IS NOT NULL THEN
    SELECT moeda INTO moeda_origem FROM public.accounts WHERE id = NEW.conta_origem_id;
    IF moeda_origem IS NOT NULL AND moeda_origem != NEW.moeda THEN
      RAISE EXCEPTION 'Transaction currency (%) must match origin account currency (%)', NEW.moeda, moeda_origem;
    END IF;
  END IF;

  IF NEW.conta_destino_id IS NOT NULL THEN
    SELECT moeda INTO moeda_destino FROM public.accounts WHERE id = NEW.conta_destino_id;
    IF moeda_destino IS NOT NULL AND moeda_destino != NEW.moeda THEN
      RAISE EXCEPTION 'Transaction currency (%) must match destination account currency (%)', NEW.moeda, moeda_destino;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_cash_transaction_trigger
BEFORE INSERT OR UPDATE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_cash_transaction();

-- Trigger to update ativos on PROVENTO
CREATE OR REPLACE FUNCTION public.update_ativo_provento_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'PROVENTO' AND NEW.ativo_id IS NOT NULL THEN
    UPDATE public.ativos
    SET 
      data_ultimo_provento = GREATEST(COALESCE(data_ultimo_provento, NEW.data), NEW.data),
      data_ultima_atualizacao_proventos = CURRENT_DATE
    WHERE id = NEW.ativo_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_ativo_provento_dates_trigger
AFTER INSERT OR UPDATE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_ativo_provento_dates();

-- Create indexes
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_cash_transactions_user_id_data ON public.cash_transactions(user_id, data);
CREATE INDEX idx_cash_transactions_conta_origem ON public.cash_transactions(conta_origem_id);
CREATE INDEX idx_cash_transactions_conta_destino ON public.cash_transactions(conta_destino_id);
CREATE INDEX idx_cash_transactions_ativo ON public.cash_transactions(ativo_id);

-- Create view for account balances with proper user_id filtering
CREATE OR REPLACE VIEW public.vw_saldo_contas AS
SELECT 
  a.id,
  a.user_id,
  a.nome,
  a.moeda,
  a.ativo,
  COALESCE(
    (SELECT SUM(ct.valor) FROM public.cash_transactions ct 
     WHERE ct.conta_destino_id = a.id 
     AND ct.user_id = a.user_id
     AND ct.tipo IN ('DEPOSITO', 'PROVENTO', 'TRANSFERENCIA', 'RESGATE')),
    0
  ) - COALESCE(
    (SELECT SUM(ct.valor) FROM public.cash_transactions ct 
     WHERE ct.conta_origem_id = a.id 
     AND ct.user_id = a.user_id
     AND ct.tipo IN ('TRANSFERENCIA', 'APLICACAO', 'SAQUE')),
    0
  ) AS saldo
FROM public.accounts a;