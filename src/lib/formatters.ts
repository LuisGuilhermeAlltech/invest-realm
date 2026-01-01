import { Moeda, MOEDA_SYMBOLS } from '@/types/database';

export function formatCurrency(value: number, moeda: Moeda = 'BRL'): string {
  const symbol = MOEDA_SYMBOLS[moeda];
  return `${symbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formata um valor percentual para exibição.
 * CONVENÇÃO: O valor de entrada deve ser em formato fração (ex: 0.0655 para 6.55%)
 * Multiplica por 100 para exibição.
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDate(date: string): string {
  // Evita problema de timezone: interpreta a data como local, não UTC
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-BR');
}

/**
 * Função utilitária para obter o valor atual correto de um ativo.
 * GUARD CLAUSE: Para Renda Fixa, usa preco_atual diretamente (não quantidade × preço).
 */
export function getValorAtualAtivo(
  classe: string,
  valorAtual: number | null,
  precoAtual: number | null
): number {
  if (classe === 'renda_fixa') {
    // Renda Fixa: valor_atual = preco_atual diretamente
    return precoAtual || 0;
  }
  // Outros ativos: usar valor_atual calculado (quantidade × preco_atual)
  return valorAtual || 0;
}
