-- Enums
CREATE TYPE public.classe_ativo AS ENUM ('renda_fixa', 'fii', 'acoes_br', 'acoes_eua', 'cripto');
CREATE TYPE public.moeda AS ENUM ('BRL', 'USD');
CREATE TYPE public.tipo_movimentacao AS ENUM ('compra', 'venda', 'aporte', 'saque');
CREATE TYPE public.tipo_provento AS ENUM ('dividendo', 'jcp', 'rendimento', 'outros');

-- 1) Ativos
CREATE TABLE public.ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    nome TEXT,
    classe public.classe_ativo NOT NULL,
    moeda_base public.moeda NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, ticker)
);

ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ativos" ON public.ativos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ativos" ON public.ativos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ativos" ON public.ativos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ativos" ON public.ativos FOR DELETE USING (auth.uid() = user_id);

-- 2) Plataformas
CREATE TABLE public.plataformas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plataformas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plataformas" ON public.plataformas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plataformas" ON public.plataformas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plataformas" ON public.plataformas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plataformas" ON public.plataformas FOR DELETE USING (auth.uid() = user_id);

-- 3) Movimentações
CREATE TABLE public.movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
    plataforma_id UUID REFERENCES public.plataformas(id) ON DELETE SET NULL,
    tipo public.tipo_movimentacao NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    preco_unitario NUMERIC NOT NULL DEFAULT 0,
    moeda public.moeda NOT NULL,
    taxas NUMERIC DEFAULT 0,
    valor_total_informado NUMERIC,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own movimentacoes" ON public.movimentacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own movimentacoes" ON public.movimentacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own movimentacoes" ON public.movimentacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own movimentacoes" ON public.movimentacoes FOR DELETE USING (auth.uid() = user_id);

-- 4) Proventos
CREATE TABLE public.proventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
    plataforma_id UUID REFERENCES public.plataformas(id) ON DELETE SET NULL,
    tipo public.tipo_provento NOT NULL,
    valor NUMERIC NOT NULL,
    moeda public.moeda NOT NULL,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.proventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proventos" ON public.proventos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own proventos" ON public.proventos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own proventos" ON public.proventos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own proventos" ON public.proventos FOR DELETE USING (auth.uid() = user_id);

-- 5) Preços Ativos
CREATE TABLE public.precos_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
    preco_atual NUMERIC NOT NULL,
    moeda public.moeda NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    fonte TEXT,
    UNIQUE(user_id, ativo_id)
);

ALTER TABLE public.precos_ativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own precos_ativos" ON public.precos_ativos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own precos_ativos" ON public.precos_ativos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own precos_ativos" ON public.precos_ativos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own precos_ativos" ON public.precos_ativos FOR DELETE USING (auth.uid() = user_id);

-- 6) Metas de Alocação
CREATE TABLE public.metas_alocacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    classe public.classe_ativo NOT NULL,
    percentual_alvo NUMERIC NOT NULL,
    vigente_desde DATE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.metas_alocacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metas_alocacao" ON public.metas_alocacao FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metas_alocacao" ON public.metas_alocacao FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metas_alocacao" ON public.metas_alocacao FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own metas_alocacao" ON public.metas_alocacao FOR DELETE USING (auth.uid() = user_id);

-- Update trigger for ativos
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ativos_updated_at
    BEFORE UPDATE ON public.ativos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- VIEW 1: vw_posicao_por_ativo
CREATE OR REPLACE VIEW public.vw_posicao_por_ativo AS
SELECT 
    m.user_id,
    m.ativo_id,
    a.ticker,
    a.nome,
    a.classe,
    a.moeda_base,
    SUM(
        CASE 
            WHEN m.tipo IN ('compra', 'aporte') THEN m.quantidade
            WHEN m.tipo IN ('venda', 'saque') THEN -m.quantidade
            ELSE 0
        END
    ) AS quantidade_total,
    SUM(
        CASE 
            WHEN m.tipo IN ('compra', 'aporte') THEN (m.quantidade * m.preco_unitario) + COALESCE(m.taxas, 0)
            WHEN m.tipo IN ('venda', 'saque') THEN -((m.quantidade * m.preco_unitario) - COALESCE(m.taxas, 0))
            ELSE 0
        END
    ) AS custo_total,
    CASE 
        WHEN SUM(
            CASE 
                WHEN m.tipo IN ('compra', 'aporte') THEN m.quantidade
                WHEN m.tipo IN ('venda', 'saque') THEN -m.quantidade
                ELSE 0
            END
        ) > 0 
        THEN SUM(
            CASE 
                WHEN m.tipo IN ('compra', 'aporte') THEN (m.quantidade * m.preco_unitario) + COALESCE(m.taxas, 0)
                WHEN m.tipo IN ('venda', 'saque') THEN -((m.quantidade * m.preco_unitario) - COALESCE(m.taxas, 0))
                ELSE 0
            END
        ) / NULLIF(SUM(
            CASE 
                WHEN m.tipo IN ('compra', 'aporte') THEN m.quantidade
                WHEN m.tipo IN ('venda', 'saque') THEN -m.quantidade
                ELSE 0
            END
        ), 0)
        ELSE 0
    END AS preco_medio
FROM public.movimentacoes m
JOIN public.ativos a ON m.ativo_id = a.id
GROUP BY m.user_id, m.ativo_id, a.ticker, a.nome, a.classe, a.moeda_base;

-- VIEW 2: vw_carteira_atual
CREATE OR REPLACE VIEW public.vw_carteira_atual AS
SELECT 
    p.user_id,
    p.ativo_id,
    p.ticker,
    p.nome,
    p.classe,
    p.moeda_base,
    p.quantidade_total,
    p.custo_total,
    p.preco_medio,
    COALESCE(pr.preco_atual, 0) AS preco_atual,
    pr.atualizado_em,
    p.quantidade_total * COALESCE(pr.preco_atual, 0) AS valor_atual,
    (p.quantidade_total * COALESCE(pr.preco_atual, 0)) - p.custo_total AS lucro_prejuizo,
    CASE 
        WHEN p.custo_total > 0 
        THEN ((p.quantidade_total * COALESCE(pr.preco_atual, 0)) / p.custo_total) - 1
        ELSE 0
    END AS lucro_prejuizo_pct
FROM public.vw_posicao_por_ativo p
LEFT JOIN public.precos_ativos pr ON p.ativo_id = pr.ativo_id AND p.user_id = pr.user_id;

-- VIEW 3: vw_resumo_por_classe
CREATE OR REPLACE VIEW public.vw_resumo_por_classe AS
SELECT 
    user_id,
    classe,
    SUM(valor_atual) AS valor_atual,
    SUM(custo_total) AS custo_total,
    SUM(lucro_prejuizo) AS lucro_prejuizo
FROM public.vw_carteira_atual
GROUP BY user_id, classe;

-- VIEW 4: vw_rebalanceamento
CREATE OR REPLACE VIEW public.vw_rebalanceamento AS
WITH total_por_user AS (
    SELECT 
        user_id,
        SUM(valor_atual) AS total_carteira
    FROM public.vw_carteira_atual
    GROUP BY user_id
),
metas_vigentes AS (
    SELECT DISTINCT ON (user_id, classe)
        user_id,
        classe,
        percentual_alvo
    FROM public.metas_alocacao
    WHERE ativo = true
    ORDER BY user_id, classe, vigente_desde DESC
)
SELECT 
    m.user_id,
    m.classe,
    m.percentual_alvo,
    COALESCE(r.valor_atual, 0) AS valor_atual,
    t.total_carteira,
    t.total_carteira * (m.percentual_alvo / 100) AS valor_ideal,
    (t.total_carteira * (m.percentual_alvo / 100)) - COALESCE(r.valor_atual, 0) AS diferenca
FROM metas_vigentes m
LEFT JOIN public.vw_resumo_por_classe r ON m.user_id = r.user_id AND m.classe = r.classe
LEFT JOIN total_por_user t ON m.user_id = t.user_id;