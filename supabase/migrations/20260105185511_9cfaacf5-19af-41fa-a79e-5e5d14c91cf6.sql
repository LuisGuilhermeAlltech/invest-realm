-- Recriar vw_gastos_por_tipo para agrupar corretamente por tipo_id (tipos_gasto)
DROP VIEW IF EXISTS vw_gastos_por_tipo;

CREATE VIEW vw_gastos_por_tipo AS
SELECT 
  fm.user_id,
  fm.id AS financeiro_mensal_id,
  fm.ano,
  fm.mes,
  cf.tipo_id,
  tg.nome AS tipo_nome,
  COALESCE(SUM(fg.valor), 0) AS total_gasto
FROM financeiro_mensal fm
CROSS JOIN tipos_gasto tg
LEFT JOIN categorias_financeiras cf 
  ON cf.tipo_id = tg.id 
  AND cf.user_id = fm.user_id 
  AND cf.ativa = true
LEFT JOIN financeiro_gastos fg 
  ON fg.financeiro_mensal_id = fm.id 
  AND fg.categoria_id = cf.id
WHERE tg.user_id = fm.user_id
  AND tg.ativo = true
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, cf.tipo_id, tg.nome;

-- Also need to update limites_tipo_gasto to use tipo_id instead of enum
-- But that's a bigger change. For now, we'll map tipo names to the existing enum

-- Create a mapping view to help with the transition
CREATE OR REPLACE VIEW vw_gastos_por_tipo_resumo AS
SELECT 
  fm.user_id,
  fm.id AS financeiro_mensal_id,
  fm.ano,
  fm.mes,
  tg.id AS tipo_id,
  tg.nome AS tipo_nome,
  COALESCE(SUM(fg.valor), 0) AS total_gasto
FROM financeiro_mensal fm
CROSS JOIN tipos_gasto tg
LEFT JOIN categorias_financeiras cf 
  ON cf.tipo_id = tg.id 
  AND cf.user_id = fm.user_id 
  AND cf.ativa = true
LEFT JOIN financeiro_gastos fg 
  ON fg.financeiro_mensal_id = fm.id 
  AND fg.categoria_id = cf.id
WHERE tg.user_id = fm.user_id
  AND tg.ativo = true
GROUP BY fm.user_id, fm.id, fm.ano, fm.mes, tg.id, tg.nome
HAVING COALESCE(SUM(fg.valor), 0) > 0 OR EXISTS (
  SELECT 1 FROM limites_tipo_gasto ltg 
  WHERE ltg.user_id = fm.user_id 
    AND ltg.ano = fm.ano 
    AND ltg.mes = fm.mes
    AND ltg.tipo::text = LOWER(REPLACE(tg.nome, ' ', '_'))
);