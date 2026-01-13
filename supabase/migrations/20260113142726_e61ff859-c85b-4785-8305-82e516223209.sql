-- Drop the old check constraint and create a new one that includes 'outro'
ALTER TABLE public.contas_a_pagar DROP CONSTRAINT IF EXISTS contas_a_pagar_tipo_check;
ALTER TABLE public.contas_a_pagar ADD CONSTRAINT contas_a_pagar_tipo_check CHECK (tipo IN ('cartao', 'emprestimo', 'outro'));