export interface CardPurchase {
  id: string;
  user_id: string;
  description: string;
  category: string;
  card_name: string;
  purchase_date: string;
  amount: number;
  store: string | null;
  notes: string | null;
  receipt_url: string | null;
  included_in_statement_month: string | null; // Format: YYYY-MM
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Combustível',
  'Mercado',
  'Farmácia',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Vestuário',
  'Casa',
  'Serviços',
  'Outros',
] as const;

export type DefaultCategory = typeof DEFAULT_CATEGORIES[number];
