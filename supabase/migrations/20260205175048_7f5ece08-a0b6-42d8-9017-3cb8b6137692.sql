-- Enum for installment status
CREATE TYPE public.installment_status AS ENUM ('pending', 'paid', 'overdue');

-- Enum for payment method
CREATE TYPE public.payment_method AS ENUM ('cartao', 'pix', 'boleto', 'transferencia', 'dinheiro', 'outro');

-- Table: installments (individual installments for parcelada accounts)
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conta_pagar_id UUID NOT NULL REFERENCES public.contas_a_pagar(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status public.installment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  paid_amount NUMERIC(12,2) NULL,
  payment_method public.payment_method NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT installments_number_positive CHECK (installment_number > 0),
  CONSTRAINT installments_amount_positive CHECK (amount > 0),
  CONSTRAINT installments_unique_per_bill UNIQUE (conta_pagar_id, installment_number)
);

-- Enable RLS
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own installments"
ON public.installments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own installments"
ON public.installments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own installments"
ON public.installments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installments"
ON public.installments FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_installments_updated_at
BEFORE UPDATE ON public.installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_installments_conta_pagar ON public.installments(conta_pagar_id);
CREATE INDEX idx_installments_user_due_date ON public.installments(user_id, due_date);
CREATE INDEX idx_installments_status ON public.installments(status);

-- Table: card_purchases (à vista purchases on credit card)
CREATE TABLE public.card_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  card_name TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  store TEXT NULL,
  notes TEXT NULL,
  receipt_url TEXT NULL,
  included_in_statement_month TEXT NULL, -- Format: YYYY-MM
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT card_purchases_amount_positive CHECK (amount > 0)
);

-- Enable RLS
ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own card_purchases"
ON public.card_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own card_purchases"
ON public.card_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card_purchases"
ON public.card_purchases FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own card_purchases"
ON public.card_purchases FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_card_purchases_updated_at
BEFORE UPDATE ON public.card_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_card_purchases_user_date ON public.card_purchases(user_id, purchase_date);
CREATE INDEX idx_card_purchases_category ON public.card_purchases(category);
CREATE INDEX idx_card_purchases_card ON public.card_purchases(card_name);

-- Function to generate installments for a parcelada account
CREATE OR REPLACE FUNCTION public.generate_installments_for_conta(
  p_conta_id UUID,
  p_user_id UUID,
  p_data_inicio DATE,
  p_dia_vencimento INTEGER,
  p_total_parcelas INTEGER,
  p_valor_parcela NUMERIC,
  p_parcela_atual INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i INTEGER;
  v_due_date DATE;
  v_year INTEGER;
  v_month INTEGER;
  v_day INTEGER;
  v_last_day INTEGER;
  v_status public.installment_status;
BEGIN
  -- Delete existing installments for this conta
  DELETE FROM public.installments WHERE conta_pagar_id = p_conta_id;
  
  -- Generate each installment
  FOR i IN 1..p_total_parcelas LOOP
    -- Calculate the month for this installment
    v_year := EXTRACT(YEAR FROM p_data_inicio) + ((EXTRACT(MONTH FROM p_data_inicio)::INTEGER + i - 2) / 12);
    v_month := ((EXTRACT(MONTH FROM p_data_inicio)::INTEGER + i - 2) % 12) + 1;
    
    -- Handle day overflow (e.g., day 31 in a 30-day month)
    v_last_day := (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day')::DATE - DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1))::DATE + 1;
    v_day := LEAST(p_dia_vencimento, v_last_day);
    
    v_due_date := MAKE_DATE(v_year, v_month, v_day);
    
    -- Set status based on parcela_atual (for backfill)
    IF i < p_parcela_atual THEN
      v_status := 'paid';
    ELSE
      v_status := 'pending';
    END IF;
    
    INSERT INTO public.installments (
      user_id,
      conta_pagar_id,
      installment_number,
      due_date,
      amount,
      status,
      paid_at,
      paid_amount
    ) VALUES (
      p_user_id,
      p_conta_id,
      i,
      v_due_date,
      p_valor_parcela,
      v_status,
      CASE WHEN v_status = 'paid' THEN v_due_date::TIMESTAMP WITH TIME ZONE ELSE NULL END,
      CASE WHEN v_status = 'paid' THEN p_valor_parcela ELSE NULL END
    );
  END LOOP;
END;
$$;

-- Backfill: Generate installments for existing parcelada accounts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id, user_id, data_inicio, dia_vencimento, total_parcelas, valor_parcela, parcela_atual
    FROM public.contas_a_pagar
    WHERE modo = 'parcelada' AND status = 'ativo' AND total_parcelas IS NOT NULL
  LOOP
    PERFORM public.generate_installments_for_conta(
      r.id,
      r.user_id,
      COALESCE(r.data_inicio::DATE, CURRENT_DATE),
      r.dia_vencimento,
      r.total_parcelas,
      COALESCE(r.valor_parcela, 0),
      COALESCE(r.parcela_atual, 1)
    );
  END LOOP;
END;
$$;