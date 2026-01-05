-- Fix security definer views by setting security_invoker = true
ALTER VIEW vw_gastos_por_tipo SET (security_invoker = true);
ALTER VIEW vw_gastos_por_tipo_resumo SET (security_invoker = true);