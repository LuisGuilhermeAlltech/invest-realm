import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ContaAPagar, 
  ContaAPagarComCalculos, 
  TipoContaAPagar, 
  StatusContaAPagar 
} from '@/types/contasAPagar';
import { startOfMonth, format, endOfMonth, getDate } from 'date-fns';

function calcularCamposDerivados(conta: ContaAPagar): ContaAPagarComCalculos {
  const parcelas_restantes = Math.max(conta.total_parcelas - conta.parcela_atual, 0);
  const valor_restante = parcelas_restantes * conta.valor_parcela;
  const parcelas_formatado = `${conta.parcela_atual}/${conta.total_parcelas}`;

  return {
    ...conta,
    parcelas_restantes,
    valor_restante,
    parcelas_formatado,
  };
}

function getVencimentoDoMes(ano: number, mes: number, diaVencimento: number): Date {
  const ultimoDiaMes = endOfMonth(new Date(ano, mes - 1)).getDate();
  const diaReal = Math.min(diaVencimento, ultimoDiaMes);
  return new Date(ano, mes - 1, diaReal);
}

export function useContasAPagar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchContasAPagar = async (): Promise<ContaAPagarComCalculos[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((conta) => 
      calcularCamposDerivados(conta as ContaAPagar)
    );
  };

  const {
    data: contasAPagar = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contas_a_pagar', user?.id],
    queryFn: fetchContasAPagar,
    enabled: !!user,
  });

  // Baixa automática de parcelas
  const processarBaixaAutomatica = async () => {
    if (!user) return;

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    const competenciaAtual = format(startOfMonth(hoje), 'yyyy-MM-dd');

    const { data: contasAtivas, error } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ativo');

    if (error) {
      console.error('Erro ao buscar contas para baixa automática:', error);
      return;
    }

    for (const conta of contasAtivas || []) {
      const vencimento = getVencimentoDoMes(anoAtual, mesAtual, conta.dia_vencimento);
      const jaBaixouEsteMes = conta.ultima_baixa_competencia === competenciaAtual;

      if (hoje >= vencimento && !jaBaixouEsteMes) {
        let novaParcela = conta.parcela_atual + 1;
        let novoStatus = conta.status;

        if (novaParcela > conta.total_parcelas) {
          novaParcela = conta.total_parcelas;
          novoStatus = 'quitado';
        }

        const { error: updateError } = await supabase
          .from('contas_a_pagar')
          .update({
            parcela_atual: novaParcela,
            ultima_baixa_competencia: competenciaAtual,
            status: novoStatus,
          })
          .eq('id', conta.id);

        if (updateError) {
          console.error('Erro ao atualizar conta:', updateError);
        }
      }
    }

    // Refetch para atualizar a UI
    queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
  };

  // Criar conta
  const createMutation = useMutation({
    mutationFn: async (novaConta: Omit<ContaAPagar, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'parcela_atual' | 'ultima_baixa_competencia' | 'status'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('contas_a_pagar')
        .insert({
          ...novaConta,
          user_id: user.id,
          parcela_atual: 1,
          ultima_baixa_competencia: null,
          status: 'ativo',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success('Conta a pagar criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao criar conta a pagar');
    },
  });

  // Atualizar conta
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContaAPagar> & { id: string }) => {
      const { data, error } = await supabase
        .from('contas_a_pagar')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success('Conta a pagar atualizada!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta a pagar');
    },
  });

  // Quitar conta
  const quitarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('contas_a_pagar')
        .update({ status: 'quitado' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success('Conta quitada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao quitar conta:', error);
      toast.error('Erro ao quitar conta');
    },
  });

  // Deletar conta
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contas_a_pagar')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    },
  });

  // Buscar instituições únicas para filtro
  const instituicoes = [...new Set(contasAPagar.map((c) => c.instituicao))].sort();

  // Cálculos de resumo (apenas contas ativas)
  const contasAtivas = contasAPagar.filter((c) => c.status === 'ativo');
  const totalEmAberto = contasAtivas.reduce((sum, c) => sum + c.valor_restante, 0);
  const compromissoMensal = contasAtivas.reduce((sum, c) => sum + c.valor_parcela, 0);
  const qtdAtivas = contasAtivas.length;

  return {
    contasAPagar,
    isLoading,
    error,
    refetch,
    processarBaixaAutomatica,
    createConta: createMutation.mutate,
    updateConta: updateMutation.mutate,
    quitarConta: quitarMutation.mutate,
    deleteConta: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isQuiting: quitarMutation.isPending,
    isDeleting: deleteMutation.isPending,
    instituicoes,
    resumo: {
      totalEmAberto,
      compromissoMensal,
      qtdAtivas,
    },
  };
}
