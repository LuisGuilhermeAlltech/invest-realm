
-- Drop existing FK and recreate with ON DELETE SET NULL
ALTER TABLE public.financeiro_gastos
  DROP CONSTRAINT IF EXISTS financeiro_gastos_categoria_id_fkey;

ALTER TABLE public.financeiro_gastos
  ADD CONSTRAINT financeiro_gastos_categoria_id_fkey
  FOREIGN KEY (categoria_id)
  REFERENCES public.categorias_financeiras(id)
  ON DELETE SET NULL;
