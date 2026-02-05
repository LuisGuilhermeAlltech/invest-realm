-- Add 'automatic' to payment_method enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'automatic';

-- Create function to auto-pay installments on due date
CREATE OR REPLACE FUNCTION public.auto_pay_installments_today()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  UPDATE public.installments
  SET
    status = 'paid',
    paid_at = due_date::timestamp with time zone,
    paid_amount = amount,
    payment_method = 'automatic',
    updated_at = now()
  WHERE
    status = 'pending'
    AND due_date = current_date;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;