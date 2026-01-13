import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ContaAPagar, 
  ContaAPagarComCalculos, 
  ContaSaldoHistorico,
} from '@/types/contasAPagar';
import { startOfMonth, format, endOfMonth, subMonths } from 'date-fns';

function getVencimentoDoMes(ano: number, mes: number, diaVencimento: number): Date {
  const ultimoDiaMes = endOfMonth(new Date(ano, mes - 1)).getDate();
  const diaReal = Math.min(diaVencimento, ultimoDiaMes);
  return new Date(ano, mes - 1, diaReal);
}

function getCompetenciaAtual(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
}

function getCompetenciaAnterior(): string {
  return format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
}

export function useContasAPagar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar histórico de saldo
  const fetchHistorico = async (): Promise<ContaSaldoHistorico[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('contas_saldo_historico')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  };

  const { data: historicoSaldo = [] } = useQuery({
    queryKey: ['contas_saldo_historico', user?.id],
    queryFn: fetchHistorico,
    enabled: !!user,
  });

  // Função para calcular campos derivados
  const calcularCamposDerivados = (conta: ContaAPagar): ContaAPagarComCalculos => {
    if (conta.modo === 'parcelada') {
      const totalParcelas = conta.total_parcelas || 0;
      const parcelaAtual = conta.parcela_atual || 0;
      const valorParcela = conta.valor_parcela || 0;
      
      const parcelas_restantes = Math.max(totalParcelas - parcelaAtual, 0);
      const valor_restante = parcelas_restantes * valorParcela;
      const parcelas_formatado = `${parcelaAtual}/${totalParcelas}`;

      return {
        ...conta,
        parcelas_restantes,
        valor_restante,
        compromisso_mensal: valorParcela,
        parcelas_formatado,
        variacao_mensal: 0,
      };
    } else {
      // Modo saldo
      const saldoAtual = conta.saldo_atual || 0;
      const competenciaAtual = getCompetenciaAtual();
      const competenciaAnterior = getCompetenciaAnterior();

      // Buscar saldo do mês anterior
      const historicoMesAnterior = historicoSaldo.find(
        h => h.conta_pagar_id === conta.id && h.competencia === competenciaAnterior
      );
      const saldoMesAnterior = historicoMesAnterior?.saldo || 0;
      const variacao_mensal = saldoAtual - saldoMesAnterior;

      // Compromisso mensal: meta > pagamento_minimo > 0
      const compromisso_mensal = conta.meta_pagamento || conta.pagamento_minimo || 0;

      return {
        ...conta,
        parcelas_restantes: 0,
        valor_restante: saldoAtual,
        compromisso_mensal,
        parcelas_formatado: '-',
        variacao_mensal,
      };
    }
  };

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
    queryKey: ['contas_a_pagar', user?.id, historicoSaldo],
    queryFn: fetchContasAPagar,
    enabled: !!user,
  });

  // Baixa automática de parcelas (APENAS para modo parcelada)
  const processarBaixaAutomatica = async () => {
    if (!user) return;

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    const competenciaAtual = getCompetenciaAtual();

    const { data: contasAtivas, error } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .eq('modo', 'parcelada');

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

    queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
  };

  // Atualizar saldo (para modo saldo)
  const atualizarSaldoMutation = useMutation({
    mutationFn: async ({ id, novoSaldo }: { id: string; novoSaldo: number }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const competenciaAtual = getCompetenciaAtual();

      // Atualizar ou inserir no histórico
      const { error: histError } = await supabase
        .from('contas_saldo_historico')
        .upsert({
          user_id: user.id,
          conta_pagar_id: id,
          competencia: competenciaAtual,
          saldo: novoSaldo,
        }, {
          onConflict: 'conta_pagar_id,competencia',
        });

      if (histError) throw histError;

      // Atualizar a conta principal
      const { data, error } = await supabase
        .from('contas_a_pagar')
        .update({
          saldo_atual: novoSaldo,
          saldo_ultima_atualizacao: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_historico', user?.id] });
      toast.success('Saldo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar saldo:', error);
      toast.error('Erro ao atualizar saldo');
    },
  });

  // Criar conta
  const createMutation = useMutation({
    mutationFn: async (novaConta: Partial<ContaAPagar>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('contas_a_pagar')
        .insert({
          descricao: novaConta.descricao!,
          tipo: novaConta.tipo!,
          instituicao: novaConta.instituicao!,
          conta_id: novaConta.conta_id || null,
          modo: novaConta.modo || 'parcelada',
          valor_total: novaConta.valor_total || null,
          valor_parcela: novaConta.valor_parcela || null,
          total_parcelas: novaConta.total_parcelas || null,
          data_inicio: novaConta.data_inicio || null,
          dia_vencimento: novaConta.dia_vencimento!,
          saldo_atual: novaConta.saldo_atual || null,
          pagamento_minimo: novaConta.pagamento_minimo || null,
          meta_pagamento: novaConta.meta_pagamento || null,
          saldo_ultima_atualizacao: novaConta.saldo_ultima_atualizacao || null,
          observacoes: novaConta.observacoes || null,
          user_id: user.id,
          parcela_atual: 1,
          status: 'ativo',
        })
        .select()
        .single();

      if (error) throw error;

      // Se for modo saldo, criar registro inicial no histórico
      if (novaConta.modo === 'saldo' && novaConta.saldo_atual) {
        const competenciaAtual = getCompetenciaAtual();
        await supabase
          .from('contas_saldo_historico')
          .insert({
            user_id: user.id,
            conta_pagar_id: data.id,
            competencia: competenciaAtual,
            saldo: novaConta.saldo_atual,
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_historico', user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_historico', user?.id] });
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
  const compromissoMensal = contasAtivas.reduce((sum, c) => sum + c.compromisso_mensal, 0);
  const qtdAtivas = contasAtivas.length;
  
  // Variação total do mês (apenas contas de saldo)
  const contasSaldo = contasAtivas.filter((c) => c.modo === 'saldo');
  const variacaoTotalMes = contasSaldo.reduce((sum, c) => sum + c.variacao_mensal, 0);

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
    atualizarSaldo: atualizarSaldoMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isQuiting: quitarMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAtualizandoSaldo: atualizarSaldoMutation.isPending,
    instituicoes,
    resumo: {
      totalEmAberto,
      compromissoMensal,
      qtdAtivas,
      variacaoTotalMes,
    },
  };
}
