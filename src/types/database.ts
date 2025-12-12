export type ClasseAtivo = 'renda_fixa' | 'fii' | 'acoes_br' | 'acoes_eua' | 'cripto';
export type Moeda = 'BRL' | 'USD';
export type TipoMovimentacao = 'compra' | 'venda' | 'aporte' | 'saque';
export type TipoProvento = 'dividendo' | 'jcp' | 'rendimento' | 'outros';

export interface Ativo {
  id: string;
  user_id: string;
  ticker: string;
  nome: string | null;
  classe: ClasseAtivo;
  moeda_base: Moeda;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plataforma {
  id: string;
  user_id: string;
  nome: string;
  created_at: string;
}

export interface Movimentacao {
  id: string;
  user_id: string;
  data: string;
  ativo_id: string;
  plataforma_id: string | null;
  tipo: TipoMovimentacao;
  quantidade: number;
  preco_unitario: number;
  moeda: Moeda;
  taxas: number;
  valor_total_informado: number | null;
  observacao: string | null;
  created_at: string;
}

export interface Provento {
  id: string;
  user_id: string;
  data: string;
  ativo_id: string;
  plataforma_id: string | null;
  tipo: TipoProvento;
  valor: number;
  moeda: Moeda;
  observacao: string | null;
  created_at: string;
}

export interface PrecoAtivo {
  id: string;
  user_id: string;
  ativo_id: string;
  preco_atual: number;
  moeda: Moeda;
  atualizado_em: string;
  fonte: string | null;
}

export interface MetaAlocacao {
  id: string;
  user_id: string;
  classe: ClasseAtivo;
  percentual_alvo: number;
  vigente_desde: string;
  ativo: boolean;
  created_at: string;
}

export interface CarteiraAtual {
  user_id: string;
  ativo_id: string;
  ticker: string;
  nome: string | null;
  classe: ClasseAtivo;
  moeda_base: Moeda;
  quantidade_total: number;
  custo_total: number;
  preco_medio: number;
  preco_atual: number;
  atualizado_em: string | null;
  valor_atual: number;
  lucro_prejuizo: number;
  lucro_prejuizo_pct: number;
}

export interface ResumoPorClasse {
  user_id: string;
  classe: ClasseAtivo;
  valor_atual: number;
  custo_total: number;
  lucro_prejuizo: number;
}

export interface Rebalanceamento {
  user_id: string;
  classe: ClasseAtivo;
  percentual_alvo: number;
  valor_atual: number;
  total_carteira: number;
  valor_ideal: number;
  diferenca: number;
}

export const CLASSE_LABELS: Record<ClasseAtivo, string> = {
  renda_fixa: 'Renda Fixa',
  fii: 'FIIs',
  acoes_br: 'Ações BR',
  acoes_eua: 'Ações EUA',
  cripto: 'Cripto',
};

export const MOEDA_SYMBOLS: Record<Moeda, string> = {
  BRL: 'R$',
  USD: '$',
};

export const TIPO_MOVIMENTACAO_LABELS: Record<TipoMovimentacao, string> = {
  compra: 'Compra',
  venda: 'Venda',
  aporte: 'Aporte',
  saque: 'Saque',
};

export const TIPO_PROVENTO_LABELS: Record<TipoProvento, string> = {
  dividendo: 'Dividendo',
  jcp: 'JCP',
  rendimento: 'Rendimento',
  outros: 'Outros',
};
