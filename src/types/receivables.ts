export type ReceivableType = 'saldo' | 'parcelado';
export type ReceivableStatus = 'active' | 'closed';
export type ReceivableInstallmentStatus = 'pending' | 'received' | 'overdue' | 'partial';
export type ReceivablePaymentMethod = 'pix' | 'dinheiro' | 'transferencia' | 'cartao' | 'boleto' | 'outro';

export interface Receivable {
  id: string;
  user_id: string;
  description: string;
  type: ReceivableType;
  payer: string;
  category: string | null;
  status: ReceivableStatus;
  notes: string | null;
  // For parcelado type
  total_amount: number | null;
  total_installments: number | null;
  installment_amount: number | null;
  start_date: string | null;
  due_day: number | null;
  // For saldo type
  initial_balance: number | null;
  current_balance: number | null;
  expected_monthly: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivableInstallment {
  id: string;
  user_id: string;
  receivable_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  status: ReceivableInstallmentStatus;
  received_amount: number;
  received_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivablePayment {
  id: string;
  user_id: string;
  receivable_id: string;
  receivable_installment_id: string | null;
  paid_at: string;
  amount: number;
  method: ReceivablePaymentMethod;
  account_in_id: string | null;
  attachment_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReceivableWithCalculations extends Receivable {
  // Calculated fields
  total_pending: number;
  total_received: number;
  next_due_date: Date | null;
  progress: string; // "X/Y" for parcelado
  is_overdue: boolean;
  installments_count: number;
  received_count: number;
}

export const RECEIVABLE_TYPE_LABELS: Record<ReceivableType, string> = {
  saldo: 'Saldo',
  parcelado: 'Parcelado',
};

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  active: 'Ativa',
  closed: 'Encerrada',
};

export const RECEIVABLE_INSTALLMENT_STATUS_LABELS: Record<ReceivableInstallmentStatus, string> = {
  pending: 'Pendente',
  received: 'Recebido',
  overdue: 'Atrasado',
  partial: 'Parcial',
};

export const RECEIVABLE_PAYMENT_METHOD_LABELS: Record<ReceivablePaymentMethod, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  cartao: 'Cartão',
  boleto: 'Boleto',
  outro: 'Outro',
};

export const RECEIVABLE_INSTALLMENT_STATUS_COLORS: Record<ReceivableInstallmentStatus, string> = {
  pending: 'text-yellow-600',
  received: 'text-green-600',
  overdue: 'text-destructive',
  partial: 'text-blue-600',
};
