export type TipoContaAPagar = 'cartao' | 'emprestimo' | 'outro';
export type StatusContaAPagar = 'ativo' | 'quitado';
export type ModoContaAPagar = 'parcelada' | 'saldo';
export type TipoMovimentacaoSaldo = 'pagamento' | 'acrescimo' | 'ajuste';

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
  saldo_inicial: number | null;
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
  total_pago_mes: number;
  total_acrescido_mes: number;
  progresso_meta: number; // 0-100
  ultima_movimentacao: Date | null;
}

export interface MovimentacaoSaldo {
  id: string;
  user_id: string;
  conta_pagar_id: string;
  data: string;
  tipo_movimentacao: TipoMovimentacaoSaldo;
  valor: number;
  saldo_anterior: number;
  saldo_resultante: number;
  empresa_origem: string | null;
  empresa_destino: string | null;
  conta_saida: string | null;
  conta_entrada: string | null;
  comprovante_url: string | null;
  observacao: string | null;
  created_at: string;
}

export interface ContaSaldoResumoMensal {
  user_id: string;
  conta_pagar_id: string;
  mes: string;
  total_pago: number;
  total_acrescido: number;
  total_ajuste_reducao: number;
  qtd_movimentacoes: number;
}

export type TipoMetaMensalSaldo = 'reducao' | 'aumento';

export interface ContaSaldoMetaMensal {
  id: string;
  user_id: string;
  conta_pagar_id: string;
  competencia: string;
  valor_meta: number;
  tipo_meta: TipoMetaMensalSaldo;
  created_at: string;
  updated_at: string;
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

export const TIPO_MOVIMENTACAO_LABELS: Record<TipoMovimentacaoSaldo, string> = {
  pagamento: 'Pagamento',
  acrescimo: 'Acréscimo',
  ajuste: 'Ajuste',
};

export const TIPO_MOVIMENTACAO_COLORS: Record<TipoMovimentacaoSaldo, string> = {
  pagamento: 'text-green-600',
  acrescimo: 'text-destructive',
  ajuste: 'text-blue-600',
};
