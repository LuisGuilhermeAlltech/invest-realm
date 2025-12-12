-- Fix security definer views by setting them as SECURITY INVOKER
ALTER VIEW public.vw_posicao_por_ativo SET (security_invoker = on);
ALTER VIEW public.vw_carteira_atual SET (security_invoker = on);
ALTER VIEW public.vw_resumo_por_classe SET (security_invoker = on);
ALTER VIEW public.vw_rebalanceamento SET (security_invoker = on);

-- Fix function search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;