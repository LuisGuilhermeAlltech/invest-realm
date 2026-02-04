import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  ContaAPagar, 
  ContaAPagarComCalculos, 
  MovimentacaoSaldo,
  TipoMovimentacaoSaldo,
} from '@/types/contasAPagar';
import { startOfMonth, format, endOfMonth, subMonths, parseISO, differenceInMonths } from 'date-fns';

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

function getMesAtualInicioFim() {
  const hoje = new Date();
  const inicio = startOfMonth(hoje);
  const fim = endOfMonth(hoje);
  return {
    inicio: format(inicio, 'yyyy-MM-dd'),
    fim: format(fim, 'yyyy-MM-dd'),
  };
}

export function useContasAPagar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar movimentações de saldo
  const fetchMovimentacoes = async (): Promise<MovimentacaoSaldo[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('contas_saldo_movimentacoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MovimentacaoSaldo[];
  };

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['contas_saldo_movimentacoes', user?.id],
    queryFn: fetchMovimentacoes,
    enabled: !!user,
  });

  // Buscar histórico de saldo (para variação mensal)
  const fetchHistorico = async () => {
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

  // Função para calcular parcela atual baseada na data de início
  const calcularParcelaAtualPorData = (dataInicio: string | null, totalParcelas: number): number => {
    if (!dataInicio) return 0;
    
    const inicio = startOfMonth(parseISO(dataInicio));
    const hoje = startOfMonth(new Date());
    const mesesPassados = differenceInMonths(hoje, inicio);
    
    if (mesesPassados < 0) return 0;
    return Math.min(mesesPassados + 1, totalParcelas);
  };

  // Função para calcular campos derivados
  const calcularCamposDerivados = (conta: ContaAPagar): ContaAPagarComCalculos => {
    const { inicio, fim } = getMesAtualInicioFim();
    
    if (conta.modo === 'parcelada') {
      const totalParcelas = conta.total_parcelas || 0;
      const valorParcela = conta.valor_parcela || 0;
      const parcelaAtual = calcularParcelaAtualPorData(conta.data_inicio, totalParcelas);
      
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
        total_pago_mes: 0,
        total_acrescido_mes: 0,
        progresso_meta: 0,
        ultima_movimentacao: null,
      };
    } else {
      // Modo saldo
      const saldoAtual = conta.saldo_atual || 0;
      const competenciaAnterior = getCompetenciaAnterior();

      // Buscar saldo do mês anterior
      const historicoMesAnterior = historicoSaldo.find(
        (h: { conta_pagar_id: string; competencia: string }) => 
          h.conta_pagar_id === conta.id && h.competencia === competenciaAnterior
      );
      const saldoMesAnterior = historicoMesAnterior?.saldo || conta.saldo_inicial || saldoAtual;
      const variacao_mensal = saldoAtual - saldoMesAnterior;

      // Movimentações do mês atual
      const movsMesAtual = movimentacoes.filter(
        m => m.conta_pagar_id === conta.id && m.data >= inicio && m.data <= fim
      );

      const total_pago_mes = movsMesAtual
        .filter(m => m.tipo_movimentacao === 'pagamento')
        .reduce((sum, m) => sum + m.valor, 0);

      const total_acrescido_mes = movsMesAtual
        .filter(m => m.tipo_movimentacao === 'acrescimo')
        .reduce((sum, m) => sum + m.valor, 0);

      // Progresso da meta
      const meta = conta.meta_pagamento || 0;
      const progresso_meta = meta > 0 ? Math.min((total_pago_mes / meta) * 100, 100) : 0;

      // Última movimentação
      const ultimaMov = movimentacoes.find(m => m.conta_pagar_id === conta.id);
      const ultima_movimentacao = ultimaMov ? new Date(ultimaMov.data) : null;

      // Compromisso mensal: meta > pagamento_minimo > 0
      const compromisso_mensal = conta.meta_pagamento || conta.pagamento_minimo || 0;

      return {
        ...conta,
        parcelas_restantes: 0,
        valor_restante: saldoAtual,
        compromisso_mensal,
        parcelas_formatado: '-',
        variacao_mensal,
        total_pago_mes,
        total_acrescido_mes,
        progresso_meta,
        ultima_movimentacao,
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
    queryKey: ['contas_a_pagar', user?.id, historicoSaldo, movimentacoes],
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

  // Registrar movimentação de saldo
  const registrarMovimentacaoMutation = useMutation({
    mutationFn: async ({ 
      contaId, 
      tipo, 
      valor, 
      observacao 
    }: { 
      contaId: string; 
      tipo: TipoMovimentacaoSaldo; 
      valor: number; 
      observacao?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar saldo atual da conta
      const { data: conta, error: contaError } = await supabase
        .from('contas_a_pagar')
        .select('saldo_atual')
        .eq('id', contaId)
        .single();

      if (contaError) throw contaError;

      const saldoAnterior = conta.saldo_atual || 0;
      let saldoResultante: number;

      if (tipo === 'pagamento') {
        saldoResultante = Math.max(saldoAnterior - valor, 0);
      } else if (tipo === 'acrescimo') {
        saldoResultante = saldoAnterior + valor;
      } else {
        // Ajuste - valor é o novo saldo absoluto
        saldoResultante = valor;
      }

      // Registrar a movimentação
      const { error: movError } = await supabase
        .from('contas_saldo_movimentacoes')
        .insert({
          user_id: user.id,
          conta_pagar_id: contaId,
          data: format(new Date(), 'yyyy-MM-dd'),
          tipo_movimentacao: tipo,
          valor: tipo === 'ajuste' ? Math.abs(saldoResultante - saldoAnterior) : valor,
          saldo_anterior: saldoAnterior,
          saldo_resultante: saldoResultante,
          observacao: observacao || null,
        });

      if (movError) throw movError;

      // Atualizar histórico de saldo
      const competenciaAtual = getCompetenciaAtual();
      const { error: histError } = await supabase
        .from('contas_saldo_historico')
        .upsert({
          user_id: user.id,
          conta_pagar_id: contaId,
          competencia: competenciaAtual,
          saldo: saldoResultante,
        }, {
          onConflict: 'conta_pagar_id,competencia',
        });

      if (histError) throw histError;

      // Atualizar a conta principal
      const updateData: { saldo_atual: number; saldo_ultima_atualizacao: string; status?: string } = {
        saldo_atual: saldoResultante,
        saldo_ultima_atualizacao: new Date().toISOString(),
      };

      if (saldoResultante === 0) {
        updateData.status = 'quitado';
      }

      const { data: updatedConta, error } = await supabase
        .from('contas_a_pagar')
        .update(updateData)
        .eq('id', contaId)
        .select()
        .single();

      if (error) throw error;
      return { conta: updatedConta, tipo, saldoResultante };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_historico', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_movimentacoes', user?.id] });
      
      const tipoLabel = {
        pagamento: 'Pagamento registrado',
        acrescimo: 'Acréscimo registrado',
        ajuste: 'Saldo ajustado',
      }[data.tipo];

      if (data.conta.status === 'quitado') {
        toast.success(`${tipoLabel}! Conta quitada automaticamente.`);
      } else {
        toast.success(`${tipoLabel} com sucesso!`);
      }
    },
    onError: (error) => {
      console.error('Erro ao registrar movimentação:', error);
      toast.error('Erro ao registrar movimentação');
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
          saldo_inicial: novaConta.saldo_atual || null,
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

      // Se for modo saldo, criar registro inicial no histórico e movimentação inicial
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

        // Registrar movimentação inicial
        await supabase
          .from('contas_saldo_movimentacoes')
          .insert({
            user_id: user.id,
            conta_pagar_id: data.id,
            data: format(new Date(), 'yyyy-MM-dd'),
            tipo_movimentacao: 'ajuste',
            valor: novaConta.saldo_atual,
            saldo_anterior: 0,
            saldo_resultante: novaConta.saldo_atual,
            observacao: 'Saldo inicial',
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_historico', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_movimentacoes', user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_movimentacoes', user?.id] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    },
  });

  // Buscar movimentações de uma conta específica
  const getMovimentacoesConta = (contaId: string): MovimentacaoSaldo[] => {
    return movimentacoes.filter(m => m.conta_pagar_id === contaId);
  };

  // Buscar instituições únicas para filtro
  const instituicoes = [...new Set(contasAPagar.map((c) => c.instituicao))].sort();

  // Separar contas por modo
  const contasParceladas = contasAPagar.filter(c => c.modo === 'parcelada');
  const contasSaldo = contasAPagar.filter(c => c.modo === 'saldo');

  // Cálculos de resumo (apenas contas ativas)
  const contasAtivas = contasAPagar.filter((c) => c.status === 'ativo');
  const contasParceladasAtivas = contasAtivas.filter(c => c.modo === 'parcelada');
  const contasSaldoAtivas = contasAtivas.filter(c => c.modo === 'saldo');

  const totalEmAberto = contasAtivas.reduce((sum, c) => sum + c.valor_restante, 0);
  const compromissoMensal = contasAtivas.reduce((sum, c) => sum + c.compromisso_mensal, 0);
  const qtdAtivas = contasAtivas.length;
  
  // Resumo específico para contas saldo
  const totalSaldoAtual = contasSaldoAtivas.reduce((sum, c) => sum + (c.saldo_atual || 0), 0);
  const totalPagoMesSaldo = contasSaldoAtivas.reduce((sum, c) => sum + c.total_pago_mes, 0);
  const totalAcrescidoMesSaldo = contasSaldoAtivas.reduce((sum, c) => sum + c.total_acrescido_mes, 0);
  const variacaoTotalMes = contasSaldoAtivas.reduce((sum, c) => sum + c.variacao_mensal, 0);
  
  // Progresso médio das metas
  const contasComMeta = contasSaldoAtivas.filter(c => (c.meta_pagamento || 0) > 0);
  const progressoMedioMetas = contasComMeta.length > 0
    ? contasComMeta.reduce((sum, c) => sum + c.progresso_meta, 0) / contasComMeta.length
    : 0;

  // Resumo parceladas
  const totalParcelasEmAberto = contasParceladasAtivas.reduce((sum, c) => sum + c.valor_restante, 0);
  const compromissoMensalParceladas = contasParceladasAtivas.reduce((sum, c) => sum + c.compromisso_mensal, 0);

  return {
    contasAPagar,
    contasParceladas,
    contasSaldo,
    movimentacoes,
    getMovimentacoesConta,
    isLoading,
    error,
    refetch,
    processarBaixaAutomatica,
    createConta: createMutation.mutate,
    updateConta: updateMutation.mutate,
    quitarConta: quitarMutation.mutate,
    deleteConta: deleteMutation.mutate,
    registrarMovimentacao: registrarMovimentacaoMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isQuiting: quitarMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRegistrandoMovimentacao: registrarMovimentacaoMutation.isPending,
    instituicoes,
    resumo: {
      totalEmAberto,
      compromissoMensal,
      qtdAtivas,
      variacaoTotalMes,
      // Saldo específico
      totalSaldoAtual,
      totalPagoMesSaldo,
      totalAcrescidoMesSaldo,
      progressoMedioMetas,
      qtdContasSaldo: contasSaldoAtivas.length,
      // Parceladas específico
      totalParcelasEmAberto,
      compromissoMensalParceladas,
      qtdContasParceladas: contasParceladasAtivas.length,
    },
  };
}
