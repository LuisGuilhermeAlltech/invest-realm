-- Add RLS policy for vw_saldo_contas view
-- First, we need to grant access and add security
ALTER VIEW public.vw_saldo_contas SET (security_invoker = on);