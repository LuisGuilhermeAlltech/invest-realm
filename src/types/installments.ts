export type InstallmentStatus = 'pending' | 'paid' | 'overdue';
export type PaymentMethod = 'cartao' | 'pix' | 'boleto' | 'transferencia' | 'dinheiro' | 'outro';

export interface Installment {
  id: string;
  user_id: string;
  conta_pagar_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: InstallmentStatus;
  paid_at: string | null;
  paid_amount: number | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallmentWithBillInfo extends Installment {
  descricao: string;
  instituicao: string;
  tipo: string;
  total_parcelas: number;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cartao: 'Cartão',
  pix: 'PIX',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
};

export const INSTALLMENT_STATUS_COLORS: Record<InstallmentStatus, string> = {
  pending: 'text-yellow-600',
  paid: 'text-green-600',
  overdue: 'text-destructive',
};
