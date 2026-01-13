export type TipoContaAPagar = 'cartao' | 'emprestimo' | 'outro';
export type StatusContaAPagar = 'ativo' | 'quitado';
export type ModoContaAPagar = 'parcelada' | 'saldo';

export interface ContaAPagar {
  id: string;
  user_id: string;
  descricao: string;
  tipo: TipoContaAPagar;
  instituicao: string;
  conta_id: string | null;
  modo: ModoContaAPagar;
  // Campos para parcelada
  valor_total: number | null;
  valor_parcela: number | null;
  total_parcelas: number | null;
  data_inicio: string | null;
  dia_vencimento: number;
  parcela_atual: number;
  ultima_baixa_competencia: string | null;
  // Campos para saldo
  saldo_atual: number | null;
  pagamento_minimo: number | null;
  meta_pagamento: number | null;
  saldo_ultima_atualizacao: string | null;
  // Controle
  status: StatusContaAPagar;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContaAPagarComCalculos extends ContaAPagar {
  // Campos calculados para ambos os modos
  valor_restante: number;
  compromisso_mensal: number;
  // Campos específicos para parcelada
  parcelas_restantes: number;
  parcelas_formatado: string;
  // Campos específicos para saldo
  variacao_mensal: number;
}

export interface ContaSaldoHistorico {
  id: string;
  user_id: string;
  conta_pagar_id: string;
  competencia: string;
  saldo: number;
  created_at: string;
}

export const TIPO_CONTA_LABELS: Record<TipoContaAPagar, string> = {
  cartao: 'Cartão',
  emprestimo: 'Empréstimo',
  outro: 'Outro',
};

export const STATUS_CONTA_LABELS: Record<StatusContaAPagar, string> = {
  ativo: 'Ativa',
  quitado: 'Quitada',
};

export const MODO_CONTA_LABELS: Record<ModoContaAPagar, string> = {
  parcelada: 'Parcelada',
  saldo: 'Saldo',
};
