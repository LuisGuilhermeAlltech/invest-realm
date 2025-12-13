import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Moeda } from '@/types/database';

export type TipoTransacaoCaixa = 'DEPOSITO' | 'PROVENTO' | 'TRANSFERENCIA' | 'APLICACAO' | 'RESGATE' | 'SAQUE';

export interface Account {
  id: string;
  user_id: string;
  nome: string;
  moeda: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  saldo: number;
}

export interface CashTransaction {
  id: string;
  user_id: string;
  data: string;
  tipo: TipoTransacaoCaixa;
  valor: number;
  moeda: string;
  conta_origem_id: string | null;
  conta_destino_id: string | null;
  ativo_id: string | null;
  movimentacao_id: string | null;
  descricao: string | null;
  created_at: string;
}

export interface CashTransactionWithDetails extends CashTransaction {
  conta_origem?: { nome: string } | null;
  conta_destino?: { nome: string } | null;
  ativos?: { ticker: string; nome: string | null } | null;
}

export function useCaixa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch accounts with balances
  const accountsQuery = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_saldo_contas')
        .select('*')
        .eq('user_id', user!.id);
      
      if (error) throw error;
      return data as AccountWithBalance[];
    },
    enabled: !!user,
  });

  // Fetch cash transactions
  const transactionsQuery = useQuery({
    queryKey: ['cash_transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select(`
          *,
          conta_origem:accounts!cash_transactions_conta_origem_id_fkey(nome),
          conta_destino:accounts!cash_transactions_conta_destino_id_fkey(nome),
          ativos(ticker, nome)
        `)
        .eq('user_id', user!.id)
        .order('data', { ascending: false });
      
      if (error) throw error;
      return data as CashTransactionWithDetails[];
    },
    enabled: !!user,
  });

  // Create account
  const createAccountMutation = useMutation({
    mutationFn: async (data: { nome: string; moeda: string }) => {
      const { error } = await supabase.from('accounts').insert({
        user_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
    },
  });

  // Update account
  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nome: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('accounts')
        .update(data)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar conta', description: error.message, variant: 'destructive' });
    },
  });

  // Delete account
  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Conta excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir conta', description: error.message, variant: 'destructive' });
    },
  });

  // Create cash transaction
  const createTransactionMutation = useMutation({
    mutationFn: async (data: {
      data: string;
      tipo: TipoTransacaoCaixa;
      valor: number;
      moeda: string;
      conta_origem_id?: string | null;
      conta_destino_id?: string | null;
      ativo_id?: string | null;
      descricao?: string | null;
    }) => {
      const { error } = await supabase.from('cash_transactions').insert({
        user_id: user!.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ativos'] });
      toast({ title: 'Movimentação criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar movimentação', description: error.message, variant: 'destructive' });
    },
  });

  // Delete cash transaction
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cash_transactions').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Movimentação excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir movimentação', description: error.message, variant: 'destructive' });
    },
  });

  return {
    accounts: accountsQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    isLoading: accountsQuery.isLoading || transactionsQuery.isLoading,
    createAccount: createAccountMutation.mutate,
    updateAccount: updateAccountMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,
    createTransaction: createTransactionMutation.mutate,
    deleteTransaction: deleteTransactionMutation.mutate,
    isCreatingTransaction: createTransactionMutation.isPending,
  };
}

export const TIPO_TRANSACAO_LABELS: Record<TipoTransacaoCaixa, string> = {
  DEPOSITO: 'Depósito',
  PROVENTO: 'Provento',
  TRANSFERENCIA: 'Transferência',
  APLICACAO: 'Aplicação',
  RESGATE: 'Resgate',
  SAQUE: 'Saque',
};

// Helper to determine which fields are required for each transaction type
export function getRequiredFields(tipo: TipoTransacaoCaixa): {
  conta_origem: boolean;
  conta_destino: boolean;
  ativo: boolean;
} {
  switch (tipo) {
    case 'DEPOSITO':
      return { conta_origem: false, conta_destino: true, ativo: false };
    case 'PROVENTO':
      return { conta_origem: false, conta_destino: true, ativo: true };
    case 'TRANSFERENCIA':
      return { conta_origem: true, conta_destino: true, ativo: false };
    case 'APLICACAO':
      return { conta_origem: true, conta_destino: false, ativo: true };
    case 'RESGATE':
      return { conta_origem: false, conta_destino: true, ativo: true };
    case 'SAQUE':
      return { conta_origem: true, conta_destino: false, ativo: false };
    default:
      return { conta_origem: false, conta_destino: false, ativo: false };
  }
}
