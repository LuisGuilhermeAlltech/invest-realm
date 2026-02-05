-- Enum for receivable type
CREATE TYPE public.receivable_type AS ENUM ('saldo', 'parcelado');

-- Enum for receivable status
CREATE TYPE public.receivable_status AS ENUM ('active', 'closed');

-- Enum for receivable installment status
CREATE TYPE public.receivable_installment_status AS ENUM ('pending', 'received', 'overdue', 'partial');

-- Enum for payment method (reuse existing or create new)
CREATE TYPE public.receivable_payment_method AS ENUM ('pix', 'dinheiro', 'transferencia', 'cartao', 'boleto', 'outro');

-- Main receivables table
CREATE TABLE public.receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  type public.receivable_type NOT NULL,
  payer TEXT NOT NULL,
  category TEXT,
  status public.receivable_status NOT NULL DEFAULT 'active',
  notes TEXT,
  -- For parcelado type
  total_amount NUMERIC,
  total_installments INTEGER,
  installment_amount NUMERIC,
  start_date DATE,
  due_day INTEGER,
  -- For saldo type
  initial_balance NUMERIC,
  current_balance NUMERIC,
  expected_monthly NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Receivable installments table
CREATE TABLE public.receivable_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status public.receivable_installment_status NOT NULL DEFAULT 'pending',
  received_amount NUMERIC NOT NULL DEFAULT 0,
  received_at DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Receivable payments table (manual entries)
CREATE TABLE public.receivable_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  receivable_installment_id UUID REFERENCES public.receivable_installments(id) ON DELETE SET NULL,
  paid_at DATE NOT NULL,
  amount NUMERIC NOT NULL,
  method public.receivable_payment_method NOT NULL,
  account_in_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivable_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for receivables
CREATE POLICY "Users can view their own receivables" 
ON public.receivables FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receivables" 
ON public.receivables FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receivables" 
ON public.receivables FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receivables" 
ON public.receivables FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for receivable_installments
CREATE POLICY "Users can view their own receivable installments" 
ON public.receivable_installments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receivable installments" 
ON public.receivable_installments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receivable installments" 
ON public.receivable_installments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receivable installments" 
ON public.receivable_installments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for receivable_payments
CREATE POLICY "Users can view their own receivable payments" 
ON public.receivable_payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receivable payments" 
ON public.receivable_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receivable payments" 
ON public.receivable_payments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receivable payments" 
ON public.receivable_payments FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_receivables_updated_at
BEFORE UPDATE ON public.receivables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receivable_installments_updated_at
BEFORE UPDATE ON public.receivable_installments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update installment status when payment is registered
CREATE OR REPLACE FUNCTION public.update_receivable_installment_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receivable_installment_id IS NOT NULL THEN
    -- Update received_amount
    UPDATE public.receivable_installments
    SET 
      received_amount = received_amount + NEW.amount,
      received_at = COALESCE(received_at, NEW.paid_at),
      status = CASE 
        WHEN received_amount + NEW.amount >= amount THEN 'received'::public.receivable_installment_status
        WHEN received_amount + NEW.amount > 0 THEN 'partial'::public.receivable_installment_status
        ELSE status
      END,
      updated_at = now()
    WHERE id = NEW.receivable_installment_id;
  ELSE
    -- For saldo type, update current_balance
    UPDATE public.receivables
    SET 
      current_balance = GREATEST(0, COALESCE(current_balance, 0) - NEW.amount),
      updated_at = now()
    WHERE id = NEW.receivable_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_installment_on_payment
AFTER INSERT ON public.receivable_payments
FOR EACH ROW EXECUTE FUNCTION public.update_receivable_installment_on_payment();

-- Function to generate installments for parcelado receivables
CREATE OR REPLACE FUNCTION public.generate_receivable_installments(
  p_receivable_id UUID,
  p_user_id UUID,
  p_start_date DATE,
  p_due_day INTEGER,
  p_total_installments INTEGER,
  p_installment_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
  i INTEGER;
  v_due_date DATE;
  v_year INTEGER;
  v_month INTEGER;
  v_day INTEGER;
  v_last_day INTEGER;
BEGIN
  -- Delete existing installments
  DELETE FROM public.receivable_installments WHERE receivable_id = p_receivable_id;
  
  -- Generate each installment
  FOR i IN 1..p_total_installments LOOP
    v_year := EXTRACT(YEAR FROM p_start_date) + ((EXTRACT(MONTH FROM p_start_date)::INTEGER + i - 2) / 12);
    v_month := ((EXTRACT(MONTH FROM p_start_date)::INTEGER + i - 2) % 12) + 1;
    
    v_last_day := (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day')::DATE - DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1))::DATE + 1;
    v_day := LEAST(p_due_day, v_last_day);
    
    v_due_date := MAKE_DATE(v_year, v_month, v_day);
    
    INSERT INTO public.receivable_installments (
      user_id,
      receivable_id,
      installment_number,
      due_date,
      amount,
      status
    ) VALUES (
      p_user_id,
      p_receivable_id,
      i,
      v_due_date,
      p_installment_amount,
      'pending'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Indexes for performance
CREATE INDEX idx_receivables_user_id ON public.receivables(user_id);
CREATE INDEX idx_receivables_status ON public.receivables(status);
CREATE INDEX idx_receivable_installments_receivable_id ON public.receivable_installments(receivable_id);
CREATE INDEX idx_receivable_installments_due_date ON public.receivable_installments(due_date);
CREATE INDEX idx_receivable_installments_status ON public.receivable_installments(status);
CREATE INDEX idx_receivable_payments_receivable_id ON public.receivable_payments(receivable_id);
CREATE INDEX idx_receivable_payments_paid_at ON public.receivable_payments(paid_at);