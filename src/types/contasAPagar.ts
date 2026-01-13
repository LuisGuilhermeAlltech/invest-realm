export type TipoContaAPagar = 'cartao' | 'emprestimo';
export type StatusContaAPagar = 'ativo' | 'quitado';

export interface ContaAPagar {
  id: string;
  user_id: string;
  descricao: string;
  tipo: TipoContaAPagar;
  instituicao: string;
  conta_id: string | null;
  valor_total: number;
  valor_parcela: number;
  total_parcelas: number;
  data_inicio: string;
  dia_vencimento: number;
  parcela_atual: number;
  ultima_baixa_competencia: string | null;
  status: StatusContaAPagar;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContaAPagarComCalculos extends ContaAPagar {
  parcelas_restantes: number;
  valor_restante: number;
  parcelas_formatado: string;
}

export const TIPO_CONTA_LABELS: Record<TipoContaAPagar, string> = {
  cartao: 'Cartão',
  emprestimo: 'Empréstimo',
};

export const STATUS_CONTA_LABELS: Record<StatusContaAPagar, string> = {
  ativo: 'Ativa',
  quitado: 'Quitada',
};
