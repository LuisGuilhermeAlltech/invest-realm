-- 1) Criar tabela principal financeiro_mensal
CREATE TABLE public.financeiro_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ano, mes)
);

-- 2) Criar tabela de receitas
CREATE TABLE public.financeiro_receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_mensal_id UUID NOT NULL REFERENCES public.financeiro_mensal(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Criar tabela de gastos
CREATE TABLE public.financeiro_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  financeiro_mensal_id UUID NOT NULL REFERENCES public.financeiro_mensal(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Habilitar RLS
ALTER TABLE public.financeiro_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_gastos ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies para financeiro_mensal
CREATE POLICY "Users can view own financeiro_mensal" ON public.financeiro_mensal
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financeiro_mensal" ON public.financeiro_mensal
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financeiro_mensal" ON public.financeiro_mensal
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financeiro_mensal" ON public.financeiro_mensal
  FOR DELETE USING (auth.uid() = user_id);

-- 6) RLS policies para financeiro_receitas
CREATE POLICY "Users can view own financeiro_receitas" ON public.financeiro_receitas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financeiro_receitas" ON public.financeiro_receitas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financeiro_receitas" ON public.financeiro_receitas
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financeiro_receitas" ON public.financeiro_receitas
  FOR DELETE USING (auth.uid() = user_id);

-- 7) RLS policies para financeiro_gastos
CREATE POLICY "Users can view own financeiro_gastos" ON public.financeiro_gastos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financeiro_gastos" ON public.financeiro_gastos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financeiro_gastos" ON public.financeiro_gastos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financeiro_gastos" ON public.financeiro_gastos
  FOR DELETE USING (auth.uid() = user_id);

-- 8) Trigger para updated_at
CREATE TRIGGER update_financeiro_mensal_updated_at
  BEFORE UPDATE ON public.financeiro_mensal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financeiro_receitas_updated_at
  BEFORE UPDATE ON public.financeiro_receitas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financeiro_gastos_updated_at
  BEFORE UPDATE ON public.financeiro_gastos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) Índices (performance)
CREATE INDEX idx_financeiro_mensal_user ON public.financeiro_mensal(user_id);
CREATE INDEX idx_financeiro_receitas_mensal ON public.financeiro_receitas(financeiro_mensal_id);
CREATE INDEX idx_financeiro_gastos_mensal ON public.financeiro_gastos(financeiro_mensal_id);

-- 10) View resumo mensal (totais + saldo do mês)
CREATE OR REPLACE VIEW public.vw_financeiro_mensal_resumo AS
SELECT
  fm.id,
  fm.user_id,
  fm.ano,
  fm.mes,
  fm.observacao,
  COALESCE((SELECT SUM(fr.valor) FROM public.financeiro_receitas fr WHERE fr.financeiro_mensal_id = fm.id), 0) AS total_receitas,
  COALESCE((SELECT SUM(fg.valor) FROM public.financeiro_gastos fg WHERE fg.financeiro_mensal_id = fm.id), 0) AS total_gastos,
  COALESCE((SELECT SUM(fr.valor) FROM public.financeiro_receitas fr WHERE fr.financeiro_mensal_id = fm.id), 0)
  - COALESCE((SELECT SUM(fg.valor) FROM public.financeiro_gastos fg WHERE fg.financeiro_mensal_id = fm.id), 0) AS saldo_mes
FROM public.financeiro_mensal fm;

-- 11) View com saldo acumulado (soma mês a mês)
CREATE OR REPLACE VIEW public.vw_financeiro_mensal_acumulado AS
SELECT
  a.id,
  a.user_id,
  a.ano,
  a.mes,
  a.observacao,
  a.total_receitas,
  a.total_gastos,
  a.saldo_mes,
  (
    SELECT COALESCE(SUM(b.saldo_mes), 0)
    FROM public.vw_financeiro_mensal_resumo b
    WHERE b.user_id = a.user_id
      AND (b.ano < a.ano OR (b.ano = a.ano AND b.mes <= a.mes))
  ) AS saldo_acumulado
FROM public.vw_financeiro_mensal_resumo a;