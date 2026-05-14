import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ContaAPagar,
  ContaAPagarComCalculos,
  MovimentacaoSaldo,
  TipoMovimentacaoSaldo,
  ContaSaldoMetaMensal,
  TipoMetaMensalSaldo,
} from '@/types/contasAPagar';
import { startOfMonth, format, endOfMonth, subMonths } from 'date-fns';

interface RegistrarMovimentacaoPayload {
  contaId: string;
  tipo: TipoMovimentacaoSaldo;
  valor: number;
  observacao?: string;
  data?: string;
  empresaOrigem?: string;
  empresaDestino?: string;
  contaSaida?: string;
  contaEntrada?: string;
  comprovanteUrl?: string;
}

interface DefinirMetaMensalPayload {
  contaId: string;
  competencia: string;
  valorMeta: number;
  tipoMeta: TipoMetaMensalSaldo;
}

interface DefinirSaldoInicialMensalPayload {
  contaId: string;
  competencia: string;
  valorSaldoInicial: number;
  observacao?: string;
}

export interface ContaSaldoResumoMensalDetalhado {
  competencia: string;
  saldoInicial: number;
  saldoFinal: number;
  totalPagoMes: number;
  totalAcrescidoMes: number;
  variacaoMes: number;
  movimentacoesMes: MovimentacaoSaldo[];
  metaMensal: ContaSaldoMetaMensal | null;
}

function getVencimentoDoMes(ano: number, mes: number, diaVencimento: number): Date {
  const ultimoDiaMes = endOfMonth(new Date(ano, mes - 1)).getDate();
  const diaReal = Math.min(diaVencimento, ultimoDiaMes);
  return new Date(ano, mes - 1, diaReal);
}

function parseIsoDate(dateISO: string): Date {
  const [ano, mes, dia] = dateISO.split('-').map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

function getCompetenciaAtual(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
}

function getCompetenciaAnterior(): string {
  return format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
}

function getCompetenciaFromDate(dateValue?: string | Date): string {
  if (!dateValue) {
    return getCompetenciaAtual();
  }

  const baseDate = typeof dateValue === 'string' ? parseIsoDate(dateValue) : dateValue;
  return format(startOfMonth(baseDate), 'yyyy-MM-dd');
}

function getMesInicioFim(ano: number, mes: number) {
  const baseDate = new Date(ano, mes - 1, 1);
  const inicio = startOfMonth(baseDate);
  const fim = endOfMonth(baseDate);

  return {
    inicio: format(inicio, 'yyyy-MM-dd'),
    fim: format(fim, 'yyyy-MM-dd'),
    competencia: format(inicio, 'yyyy-MM-dd'),
  };
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

function sortMovimentacoesAsc(movA: MovimentacaoSaldo, movB: MovimentacaoSaldo): number {
  if (movA.data !== movB.data) {
    return movA.data.localeCompare(movB.data);
  }

  return (movA.created_at || '').localeCompare(movB.created_at || '');
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

  // Buscar metas mensais (contas saldo)
  const fetchMetasMensais = async (): Promise<ContaSaldoMetaMensal[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('contas_saldo_metas_mensais')
      .select('*')
      .eq('user_id', user.id)
      .order('competencia', { ascending: false });

    if (error) throw error;
    return (data || []) as ContaSaldoMetaMensal[];
  };

  const { data: metasMensaisSaldo = [] } = useQuery({
    queryKey: ['contas_saldo_metas_mensais', user?.id],
    queryFn: fetchMetasMensais,
    enabled: !!user,
  });

  // Função para calcular campos derivados
  // NOTE: For 'parcelada' mode, all payment info comes from installments table
  // This hook only provides basic fields - real counts come from useInstallments
  const calcularCamposDerivados = (conta: ContaAPagar): ContaAPagarComCalculos => {
    const { inicio, fim } = getMesAtualInicioFim();

    if (conta.modo === 'parcelada') {
      const totalParcelas = conta.total_parcelas || 0;
      const valorParcela = conta.valor_parcela || 0;

      // These are placeholder values; real data comes from useInstallments
      return {
        ...conta,
        parcelas_restantes: totalParcelas,
        valor_restante: totalParcelas * valorParcela,
        compromisso_mensal: valorParcela,
        parcelas_formatado: `0/${totalParcelas}`,
        variacao_mensal: 0,
        total_pago_mes: 0,
        total_acrescido_mes: 0,
        progresso_meta: 0,
        ultima_movimentacao: null,
      };
    }

    // Modo saldo
    const saldoAtual = conta.saldo_atual || 0;
    const competenciaAnterior = getCompetenciaAnterior();
    const competenciaAtual = getCompetenciaAtual();

    const historicoMesAnterior = historicoSaldo.find(
      (h: { conta_pagar_id: string; competencia: string }) =>
        h.conta_pagar_id === conta.id && h.competencia === competenciaAnterior,
    );

    const saldoMesAnterior = historicoMesAnterior?.saldo || conta.saldo_inicial || saldoAtual;
    const variacao_mensal = saldoAtual - saldoMesAnterior;

    const movsMesAtual = movimentacoes.filter(
      (m) => m.conta_pagar_id === conta.id && m.data >= inicio && m.data <= fim,
    );

    const total_pago_mes = movsMesAtual
      .filter((m) => m.tipo_movimentacao === 'pagamento')
      .reduce((sum, m) => sum + m.valor, 0);

    const total_acrescido_mes = movsMesAtual
      .filter((m) => m.tipo_movimentacao === 'acrescimo')
      .reduce((sum, m) => sum + m.valor, 0);

    const metaMensalAtual = metasMensaisSaldo.find(
      (meta) => meta.conta_pagar_id === conta.id && meta.competencia === competenciaAtual,
    );

    const meta = metaMensalAtual?.valor_meta || conta.meta_pagamento || 0;
    const progresso_meta = meta > 0 ? Math.min((total_pago_mes / meta) * 100, 100) : 0;

    const ultimaMov = movimentacoes.find((m) => m.conta_pagar_id === conta.id);
    const ultima_movimentacao = ultimaMov ? parseIsoDate(ultimaMov.data) : null;

    const compromisso_mensal = meta || conta.pagamento_minimo || 0;

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
  };

  const fetchContasAPagar = async (): Promise<ContaAPagarComCalculos[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((conta) => calcularCamposDerivados(conta as ContaAPagar));
  };

  const {
    data: contasAPagar = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contas_a_pagar', user?.id, historicoSaldo, movimentacoes, metasMensaisSaldo],
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
      observacao,
      data,
      empresaOrigem,
      empresaDestino,
      contaSaida,
      contaEntrada,
      comprovanteUrl,
    }: RegistrarMovimentacaoPayload) => {
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

      const dataMovimentacao = data || format(new Date(), 'yyyy-MM-dd');

      const { error: movError } = await supabase
        .from('contas_saldo_movimentacoes')
        .insert({
          user_id: user.id,
          conta_pagar_id: contaId,
          data: dataMovimentacao,
          tipo_movimentacao: tipo,
          valor: tipo === 'ajuste' ? Math.abs(saldoResultante - saldoAnterior) : valor,
          saldo_anterior: saldoAnterior,
          saldo_resultante: saldoResultante,
          observacao: observacao || null,
          empresa_origem: empresaOrigem || null,
          empresa_destino: empresaDestino || null,
          conta_saida: contaSaida || null,
          conta_entrada: contaEntrada || null,
          comprovante_url: comprovanteUrl || null,
        });

      if (movError) throw movError;

      const competenciaMovimentacao = getCompetenciaFromDate(dataMovimentacao);
      const { error: histError } = await supabase
        .from('contas_saldo_historico')
        .upsert(
          {
            user_id: user.id,
            conta_pagar_id: contaId,
            competencia: competenciaMovimentacao,
            saldo: saldoResultante,
          },
          {
            onConflict: 'conta_pagar_id,competencia',
          },
        );

      if (histError) throw histError;

      const updateData: { saldo_atual: number; saldo_ultima_atualizacao: string; status?: string } = {
        saldo_atual: saldoResultante,
        saldo_ultima_atualizacao: new Date().toISOString(),
      };

      if (saldoResultante === 0) {
        updateData.status = 'quitado';
      } else {
        updateData.status = 'ativo';
      }

      const { data: updatedConta, error } = await supabase
        .from('contas_a_pagar')
        .update(updateData)
        .eq('id', contaId)
        .select()
        .single();

      if (error) throw error;
      return { conta: updatedConta, tipo };
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
    onError: (mutationError) => {
      console.error('Erro ao registrar movimentação:', mutationError);
      toast.error('Erro ao registrar movimentação');
    },
  });

  const definirMetaMensalMutation = useMutation({
    mutationFn: async ({ contaId, competencia, valorMeta, tipoMeta }: DefinirMetaMensalPayload) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error: upsertError } = await supabase
        .from('contas_saldo_metas_mensais')
        .upsert(
          {
            user_id: user.id,
            conta_pagar_id: contaId,
            competencia,
            valor_meta: valorMeta,
            tipo_meta: tipoMeta,
          },
          {
            onConflict: 'conta_pagar_id,competencia',
          },
        );

      if (upsertError) throw upsertError;

      return { competencia, valorMeta };
    },
    onSuccess: ({ competencia, valorMeta }) => {
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_metas_mensais', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success(`Meta mensal de ${format(parseIsoDate(competencia), 'MM/yyyy')} salva em ${valorMeta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
    },
    onError: (mutationError) => {
      console.error('Erro ao definir meta mensal:', mutationError);
      toast.error('Erro ao definir meta mensal');
    },
  });

  const definirSaldoInicialMensalMutation = useMutation({
    mutationFn: async ({ contaId, competencia, valorSaldoInicial, observacao }: DefinirSaldoInicialMensalPayload) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: conta, error: contaError } = await supabase
        .from('contas_a_pagar')
        .select('saldo_inicial')
        .eq('id', contaId)
        .single();

      if (contaError) throw contaError;

      const { data: movsAnteriores, error: prevMovsError } = await supabase
        .from('contas_saldo_movimentacoes')
        .select('saldo_resultante')
        .eq('user_id', user.id)
        .eq('conta_pagar_id', contaId)
        .lt('data', competencia)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (prevMovsError) throw prevMovsError;

      const saldoAnterior = movsAnteriores?.[0]?.saldo_resultante ?? conta.saldo_inicial ?? 0;

      const { data: movInicialExistente, error: movInicialError } = await supabase
        .from('contas_saldo_movimentacoes')
        .select('id')
        .eq('user_id', user.id)
        .eq('conta_pagar_id', contaId)
        .eq('data', competencia)
        .ilike('observacao', '[SALDO_INICIAL_MENSAL]%')
        .order('created_at', { ascending: true })
        .limit(1);

      if (movInicialError) throw movInicialError;

      const payloadMov = {
        user_id: user.id,
        conta_pagar_id: contaId,
        data: competencia,
        tipo_movimentacao: 'ajuste' as TipoMovimentacaoSaldo,
        valor: Math.abs(valorSaldoInicial - saldoAnterior),
        saldo_anterior: saldoAnterior,
        saldo_resultante: valorSaldoInicial,
        observacao: `[SALDO_INICIAL_MENSAL] ${observacao || 'Saldo inicial do mês definido manualmente'}`,
      };

      if (movInicialExistente && movInicialExistente.length > 0) {
        const { error: updateMovError } = await supabase
          .from('contas_saldo_movimentacoes')
          .update(payloadMov)
          .eq('id', movInicialExistente[0].id);

        if (updateMovError) throw updateMovError;
      } else {
        const { error: insertMovError } = await supabase
          .from('contas_saldo_movimentacoes')
          .insert(payloadMov);

        if (insertMovError) throw insertMovError;
      }

      const { error: historicoError } = await supabase
        .from('contas_saldo_historico')
        .upsert(
          {
            user_id: user.id,
            conta_pagar_id: contaId,
            competencia,
            saldo: valorSaldoInicial,
          },
          {
            onConflict: 'conta_pagar_id,competencia',
          },
        );

      if (historicoError) throw historicoError;

      return { competencia, valorSaldoInicial };
    },
    onSuccess: ({ competencia }) => {
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_historico', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_movimentacoes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success(`Saldo inicial de ${format(parseIsoDate(competencia), 'MM/yyyy')} salvo com sucesso.`);
    },
    onError: (mutationError) => {
      console.error('Erro ao definir saldo inicial mensal:', mutationError);
      toast.error('Erro ao definir saldo inicial mensal');
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

      // Se for modo parcelada, gerar parcelas
      if (novaConta.modo === 'parcelada' && novaConta.total_parcelas && novaConta.data_inicio) {
        const { error: installmentsError } = await supabase.rpc('generate_installments_for_conta', {
          p_conta_id: data.id,
          p_user_id: user.id,
          p_data_inicio: novaConta.data_inicio,
          p_dia_vencimento: novaConta.dia_vencimento!,
          p_total_parcelas: novaConta.total_parcelas,
          p_valor_parcela: novaConta.valor_parcela || 0,
          p_parcela_atual: 1,
        });

        if (installmentsError) {
          console.error('Erro ao gerar parcelas:', installmentsError);
        }
      }

      // Se for modo saldo, criar registro inicial no histórico e movimentação inicial
      if (novaConta.modo === 'saldo' && novaConta.saldo_atual) {
        const competenciaAtual = getCompetenciaAtual();

        await supabase.from('contas_saldo_historico').insert({
          user_id: user.id,
          conta_pagar_id: data.id,
          competencia: competenciaAtual,
          saldo: novaConta.saldo_atual,
        });

        await supabase.from('contas_saldo_movimentacoes').insert({
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
      queryClient.invalidateQueries({ queryKey: ['installments', user?.id] });
      toast.success('Conta a pagar criada com sucesso!');
    },
    onError: (mutationError) => {
      console.error('Erro ao criar conta:', mutationError);
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
    onError: (mutationError) => {
      console.error('Erro ao atualizar conta:', mutationError);
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
    onError: (mutationError) => {
      console.error('Erro ao quitar conta:', mutationError);
      toast.error('Erro ao quitar conta');
    },
  });

  // Deletar conta
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from('contas_a_pagar').delete().eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_historico', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_saldo_movimentacoes', user?.id] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (mutationError) => {
      console.error('Erro ao excluir conta:', mutationError);
      toast.error('Erro ao excluir conta');
    },
  });

  // Buscar movimentações de uma conta específica
  const getMovimentacoesConta = (contaId: string): MovimentacaoSaldo[] => {
    return movimentacoes.filter((m) => m.conta_pagar_id === contaId);
  };

  // Buscar instituições únicas para filtro
  const instituicoes = [...new Set(contasAPagar.map((c) => c.instituicao))].sort();

  // Separar contas por modo
  const contasParceladas = contasAPagar.filter((c) => c.modo === 'parcelada');
  const contasSaldo = contasAPagar.filter((c) => c.modo === 'saldo');

  const getMetaMensalConta = (contaId: string, ano: number, mes: number): ContaSaldoMetaMensal | null => {
    const competencia = getMesInicioFim(ano, mes).competencia;
    return metasMensaisSaldo.find((meta) => meta.conta_pagar_id === contaId && meta.competencia === competencia) || null;
  };

  const getResumoMensalContaSaldo = (
    contaId: string,
    ano: number,
    mes: number,
  ): ContaSaldoResumoMensalDetalhado | null => {
    const conta = contasSaldo.find((item) => item.id === contaId);
    if (!conta) return null;

    const { inicio, fim, competencia } = getMesInicioFim(ano, mes);
    const movsConta = movimentacoes
      .filter((mov) => mov.conta_pagar_id === contaId)
      .slice()
      .sort(sortMovimentacoesAsc);

    const movsMes = movsConta.filter((mov) => mov.data >= inicio && mov.data <= fim);
    const movsAntesDoMes = movsConta.filter((mov) => mov.data < inicio);

    const saldoInicialPadrao =
      movsAntesDoMes.length > 0
        ? movsAntesDoMes[movsAntesDoMes.length - 1].saldo_resultante
        : conta.saldo_inicial || 0;

    const primeiraMovimentacaoMes = movsMes[0];
    let saldoInicial = primeiraMovimentacaoMes ? primeiraMovimentacaoMes.saldo_anterior : saldoInicialPadrao;

    const ajusteSaldoInicial = movsMes.find(
      (mov) => mov.tipo_movimentacao === 'ajuste' && (mov.observacao || '').startsWith('[SALDO_INICIAL_MENSAL]'),
    );

    if (ajusteSaldoInicial) {
      saldoInicial = ajusteSaldoInicial.saldo_resultante;
    }

    const totalPagoMes = movsMes
      .filter((mov) => mov.tipo_movimentacao === 'pagamento')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const totalAcrescidoMes = movsMes
      .filter((mov) => mov.tipo_movimentacao === 'acrescimo')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const ultimaMovimentacaoNoMes = movsMes[movsMes.length - 1];
    const saldoFinal = ultimaMovimentacaoNoMes ? ultimaMovimentacaoNoMes.saldo_resultante : saldoInicial;
    const variacaoMes = saldoFinal - saldoInicial;

    return {
      competencia,
      saldoInicial,
      saldoFinal,
      totalPagoMes,
      totalAcrescidoMes,
      variacaoMes,
      movimentacoesMes: movsMes.slice().sort((a, b) => b.data.localeCompare(a.data)),
      metaMensal: getMetaMensalConta(contaId, ano, mes),
    };
  };

  // Cálculos de resumo (apenas contas ativas)
  const contasAtivas = contasAPagar.filter((c) => c.status === 'ativo');
  const contasParceladasAtivas = contasAtivas.filter((c) => c.modo === 'parcelada');
  const contasSaldoAtivas = contasAtivas.filter((c) => c.modo === 'saldo');

  const totalEmAberto = contasAtivas.reduce((sum, c) => sum + c.valor_restante, 0);
  const compromissoMensal = contasAtivas.reduce((sum, c) => sum + c.compromisso_mensal, 0);
  const qtdAtivas = contasAtivas.length;

  // Resumo específico para contas saldo
  const totalSaldoAtual = contasSaldoAtivas.reduce((sum, c) => sum + (c.saldo_atual || 0), 0);
  const totalPagoMesSaldo = contasSaldoAtivas.reduce((sum, c) => sum + c.total_pago_mes, 0);
  const totalAcrescidoMesSaldo = contasSaldoAtivas.reduce((sum, c) => sum + c.total_acrescido_mes, 0);
  const variacaoTotalMes = contasSaldoAtivas.reduce((sum, c) => sum + c.variacao_mensal, 0);

  // Progresso médio das metas
  const contasComMeta = contasSaldoAtivas.filter((c) => (c.meta_pagamento || 0) > 0 || !!getMetaMensalConta(c.id, new Date().getFullYear(), new Date().getMonth() + 1));
  const progressoMedioMetas =
    contasComMeta.length > 0
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
    metasMensaisSaldo,
    getMovimentacoesConta,
    getMetaMensalConta,
    getResumoMensalContaSaldo,
    isLoading,
    error,
    refetch,
    processarBaixaAutomatica,
    createConta: createMutation.mutate,
    updateConta: updateMutation.mutate,
    quitarConta: quitarMutation.mutate,
    deleteConta: deleteMutation.mutate,
    registrarMovimentacao: registrarMovimentacaoMutation.mutate,
    definirMetaMensalSaldo: definirMetaMensalMutation.mutate,
    definirSaldoInicialMensal: definirSaldoInicialMensalMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isQuiting: quitarMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRegistrandoMovimentacao: registrarMovimentacaoMutation.isPending,
    isDefinindoMetaMensal: definirMetaMensalMutation.isPending,
    isDefinindoSaldoInicialMensal: definirSaldoInicialMensalMutation.isPending,
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
