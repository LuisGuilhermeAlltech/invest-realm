import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Installment, InstallmentStatus, PaymentMethod } from '@/types/installments';
import { format, startOfMonth, endOfMonth, parseISO, isBefore, startOfDay } from 'date-fns';

export function useInstallments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all installments
  const fetchInstallments = async (): Promise<Installment[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as Installment[];
  };

  const {
    data: installments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['installments', user?.id],
    queryFn: fetchInstallments,
    enabled: !!user,
  });

  // Get installments for a specific bill
  const getInstallmentsForBill = (contaPagarId: string): Installment[] => {
    return installments.filter(i => i.conta_pagar_id === contaPagarId);
  };

  // Get next pending installment for a bill
  const getNextPendingInstallment = (contaPagarId: string): Installment | undefined => {
    return installments
      .filter(i => i.conta_pagar_id === contaPagarId && i.status !== 'paid')
      .sort((a, b) => a.installment_number - b.installment_number)[0];
  };

  // Calculate real-time status based on due_date
  const calculateCurrentStatus = (installment: Installment): InstallmentStatus => {
    if (installment.status === 'paid') return 'paid';
    
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(installment.due_date));
    
    if (isBefore(dueDate, today)) {
      return 'overdue';
    }
    return 'pending';
  };

  // Get installments for current month
  const getInstallmentsForMonth = (year: number, month: number): Installment[] => {
    const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    
    return installments.filter(i => 
      i.due_date >= monthStart && i.due_date <= monthEnd
    );
  };

  // Register a payment
  const payInstallmentMutation = useMutation({
    mutationFn: async ({
      installmentId,
      paidAt,
      paidAmount,
      paymentMethod,
      notes,
    }: {
      installmentId: string;
      paidAt: string;
      paidAmount?: number;
      paymentMethod?: PaymentMethod;
      notes?: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('installments')
        .update({
          status: 'paid',
          paid_at: paidAt,
          paid_amount: paidAmount || null,
          payment_method: paymentMethod || null,
          notes: notes || null,
        })
        .eq('id', installmentId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    },
  });

  // Undo a payment
  const undoPaymentMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('installments')
        .update({
          status: 'pending',
          paid_at: null,
          paid_amount: null,
          payment_method: null,
          notes: null,
        })
        .eq('id', installmentId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['contas_a_pagar', user?.id] });
      toast.success('Pagamento desfeito!');
    },
    onError: (error) => {
      console.error('Erro ao desfazer pagamento:', error);
      toast.error('Erro ao desfazer pagamento');
    },
  });

  // Generate installments for a new bill (called when creating a parcelada)
  const generateInstallmentsMutation = useMutation({
    mutationFn: async ({
      contaPagarId,
      dataInicio,
      diaVencimento,
      totalParcelas,
      valorParcela,
      parcelaAtual = 1,
    }: {
      contaPagarId: string;
      dataInicio: string;
      diaVencimento: number;
      totalParcelas: number;
      valorParcela: number;
      parcelaAtual?: number;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Call the database function
      const { error } = await supabase.rpc('generate_installments_for_conta', {
        p_conta_id: contaPagarId,
        p_user_id: user.id,
        p_data_inicio: dataInicio,
        p_dia_vencimento: diaVencimento,
        p_total_parcelas: totalParcelas,
        p_valor_parcela: valorParcela,
        p_parcela_atual: parcelaAtual,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments', user?.id] });
    },
    onError: (error) => {
      console.error('Erro ao gerar parcelas:', error);
      toast.error('Erro ao gerar parcelas');
    },
  });

  // Calculate summary for a bill based on installments
  const getBillSummary = (contaPagarId: string) => {
    const billInstallments = getInstallmentsForBill(contaPagarId);
    
    const pendingInstallments = billInstallments.filter(i => i.status !== 'paid');
    const paidInstallments = billInstallments.filter(i => i.status === 'paid');
    const overdueInstallments = pendingInstallments.filter(i => calculateCurrentStatus(i) === 'overdue');
    
    const nextPending = getNextPendingInstallment(contaPagarId);
    const totalRemaining = pendingInstallments.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalPaid = paidInstallments.reduce((sum, i) => sum + Number(i.paid_amount || i.amount), 0);

    return {
      totalInstallments: billInstallments.length,
      paidCount: paidInstallments.length,
      pendingCount: pendingInstallments.length,
      overdueCount: overdueInstallments.length,
      nextPending,
      totalRemaining,
      totalPaid,
      currentInstallment: nextPending?.installment_number || billInstallments.length,
      formattedProgress: nextPending 
        ? `${nextPending.installment_number}/${billInstallments.length}`
        : `${billInstallments.length}/${billInstallments.length}`,
    };
  };

  // Get monthly commitment (sum of pending installments due this month)
  const getMonthlyCommitment = (year: number, month: number): number => {
    const monthInstallments = getInstallmentsForMonth(year, month);
    return monthInstallments
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + Number(i.amount), 0);
  };

  // Get total pending across all bills
  const getTotalPending = (): number => {
    return installments
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + Number(i.amount), 0);
  };

  return {
    installments,
    isLoading,
    error,
    refetch,
    getInstallmentsForBill,
    getNextPendingInstallment,
    calculateCurrentStatus,
    getInstallmentsForMonth,
    getBillSummary,
    getMonthlyCommitment,
    getTotalPending,
    payInstallment: payInstallmentMutation.mutate,
    undoPayment: undoPaymentMutation.mutate,
    generateInstallments: generateInstallmentsMutation.mutate,
    isPaying: payInstallmentMutation.isPending,
    isUndoing: undoPaymentMutation.isPending,
    isGenerating: generateInstallmentsMutation.isPending,
  };
}
