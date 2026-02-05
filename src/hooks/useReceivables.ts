import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Receivable, 
  ReceivableInstallment, 
  ReceivablePayment,
  ReceivableWithCalculations,
  ReceivableType,
  ReceivableStatus,
  ReceivableInstallmentStatus,
  ReceivablePaymentMethod 
} from '@/types/receivables';

// Helper to get today in Brazil timezone
function getTodayBrazil(): Date {
  const now = new Date();
  const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  brazilTime.setHours(0, 0, 0, 0);
  return brazilTime;
}

function formatDateBrazil(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useReceivables() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all receivables
  const { data: receivables = [], isLoading: isLoadingReceivables } = useQuery({
    queryKey: ['receivables', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('receivables')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as Receivable[];
    },
    enabled: !!user?.id,
  });

  // Fetch all installments
  const { data: installments = [], isLoading: isLoadingInstallments } = useQuery({
    queryKey: ['receivable_installments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('receivable_installments')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as ReceivableInstallment[];
    },
    enabled: !!user?.id,
  });

  // Fetch all payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['receivable_payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('receivable_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('paid_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as ReceivablePayment[];
    },
    enabled: !!user?.id,
  });

  // Calculate receivables with calculations
  const receivablesWithCalculations: ReceivableWithCalculations[] = receivables.map((receivable) => {
    const today = getTodayBrazil();
    const todayStr = formatDateBrazil(today);
    
    if (receivable.type === 'parcelado') {
      const recInstallments = installments.filter((i) => i.receivable_id === receivable.id);
      const receivedInstallments = recInstallments.filter((i) => i.status === 'received');
      const pendingInstallments = recInstallments.filter((i) => i.status !== 'received');
      const overdueInstallments = pendingInstallments.filter((i) => i.due_date < todayStr);
      
      const totalPending = pendingInstallments.reduce((sum, i) => sum + (i.amount - i.received_amount), 0);
      const totalReceived = recInstallments.reduce((sum, i) => sum + i.received_amount, 0);
      
      const nextPending = pendingInstallments[0];
      
      return {
        ...receivable,
        total_pending: totalPending,
        total_received: totalReceived,
        next_due_date: nextPending ? new Date(nextPending.due_date) : null,
        progress: `${receivedInstallments.length}/${recInstallments.length}`,
        is_overdue: overdueInstallments.length > 0,
        installments_count: recInstallments.length,
        received_count: receivedInstallments.length,
      };
    } else {
      // Saldo type
      const recPayments = payments.filter((p) => p.receivable_id === receivable.id);
      const totalReceived = recPayments.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        ...receivable,
        total_pending: receivable.current_balance || 0,
        total_received: totalReceived,
        next_due_date: null,
        progress: '',
        is_overdue: false,
        installments_count: 0,
        received_count: 0,
      };
    }
  });

  // Split by type
  const receivablesSaldo = receivablesWithCalculations.filter((r) => r.type === 'saldo');
  const receivablesParcelado = receivablesWithCalculations.filter((r) => r.type === 'parcelado');

  // Create receivable mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      description: string;
      type: ReceivableType;
      payer: string;
      category?: string;
      notes?: string;
      // Parcelado fields
      total_amount?: number;
      total_installments?: number;
      installment_amount?: number;
      start_date?: string;
      due_day?: number;
      // Saldo fields
      initial_balance?: number;
      expected_monthly?: number;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const receivableData = {
        user_id: user.id,
        description: data.description,
        type: data.type,
        payer: data.payer,
        category: data.category || null,
        notes: data.notes || null,
        status: 'active' as ReceivableStatus,
        ...(data.type === 'parcelado' ? {
          total_amount: data.total_amount,
          total_installments: data.total_installments,
          installment_amount: data.installment_amount,
          start_date: data.start_date,
          due_day: data.due_day,
        } : {
          initial_balance: data.initial_balance,
          current_balance: data.initial_balance,
          expected_monthly: data.expected_monthly,
        }),
      };

      const { data: created, error } = await supabase
        .from('receivables')
        .insert(receivableData)
        .select()
        .single();

      if (error) throw error;

      // Generate installments for parcelado type
      if (data.type === 'parcelado' && data.start_date && data.due_day && data.total_installments && data.installment_amount) {
        const { error: rpcError } = await supabase.rpc('generate_receivable_installments', {
          p_receivable_id: created.id,
          p_user_id: user.id,
          p_start_date: data.start_date,
          p_due_day: data.due_day,
          p_total_installments: data.total_installments,
          p_installment_amount: data.installment_amount,
        });

        if (rpcError) throw rpcError;
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      toast.success('Conta a receber criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating receivable:', error);
      toast.error('Erro ao criar conta a receber');
    },
  });

  // Update receivable mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string } & Partial<Receivable>) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('receivables')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      toast.success('Conta a receber atualizada!');
    },
    onError: (error) => {
      console.error('Error updating receivable:', error);
      toast.error('Erro ao atualizar conta a receber');
    },
  });

  // Close receivable mutation
  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('receivables')
        .update({ status: 'closed' as ReceivableStatus })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      toast.success('Conta encerrada!');
    },
    onError: (error) => {
      console.error('Error closing receivable:', error);
      toast.error('Erro ao encerrar conta');
    },
  });

  // Register payment mutation
  const registerPaymentMutation = useMutation({
    mutationFn: async (data: {
      receivable_id: string;
      receivable_installment_id?: string;
      paid_at: string;
      amount: number;
      method: ReceivablePaymentMethod;
      account_in_id?: string;
      attachment_url?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const paymentData = {
        user_id: user.id,
        receivable_id: data.receivable_id,
        receivable_installment_id: data.receivable_installment_id || null,
        paid_at: data.paid_at,
        amount: data.amount,
        method: data.method,
        account_in_id: data.account_in_id || null,
        attachment_url: data.attachment_url || null,
        notes: data.notes || null,
      };

      const { error } = await supabase
        .from('receivable_payments')
        .insert(paymentData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_installments'] });
      queryClient.invalidateQueries({ queryKey: ['receivable_payments'] });
      toast.success('Recebimento registrado!');
    },
    onError: (error) => {
      console.error('Error registering payment:', error);
      toast.error('Erro ao registrar recebimento');
    },
  });

  // Get installments for a specific receivable
  const getInstallmentsForReceivable = (receivableId: string) => {
    return installments.filter((i) => i.receivable_id === receivableId);
  };

  // Get payments for a specific receivable
  const getPaymentsForReceivable = (receivableId: string) => {
    return payments.filter((p) => p.receivable_id === receivableId);
  };

  // Calculate summary for dashboard
  const getSummary = (year: number, month: number) => {
    const today = getTodayBrazil();
    const todayStr = formatDateBrazil(today);
    
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`;

    // A receber no mês (installments pending in the month)
    const toReceiveMonth = installments
      .filter((i) => 
        i.due_date >= monthStart && 
        i.due_date <= monthEnd && 
        i.status !== 'received'
      )
      .reduce((sum, i) => sum + (i.amount - i.received_amount), 0);

    // Recebido no mês (payments in the month)
    const receivedMonth = payments
      .filter((p) => p.paid_at >= monthStart && p.paid_at <= monthEnd)
      .reduce((sum, p) => sum + p.amount, 0);

    // Total em aberto (all pending)
    const totalPending = installments
      .filter((i) => i.status !== 'received')
      .reduce((sum, i) => sum + (i.amount - i.received_amount), 0) +
      receivablesSaldo
        .filter((r) => r.status === 'active')
        .reduce((sum, r) => sum + (r.current_balance || 0), 0);

    // Overdue count
    const overdueCount = installments
      .filter((i) => i.status !== 'received' && i.due_date < todayStr)
      .length;

    return {
      toReceiveMonth,
      receivedMonth,
      totalPending,
      overdueCount,
      activeReceivablesCount: receivablesWithCalculations.filter((r) => r.status === 'active').length,
      saldoCount: receivablesSaldo.filter((r) => r.status === 'active').length,
      parceladoCount: receivablesParcelado.filter((r) => r.status === 'active').length,
    };
  };

  // Get next receivables (for dashboard)
  const getNextReceivables = (limit: number = 5) => {
    const today = getTodayBrazil();
    const todayStr = formatDateBrazil(today);

    return installments
      .filter((i) => i.status !== 'received' && i.due_date >= todayStr)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, limit)
      .map((installment) => {
        const receivable = receivables.find((r) => r.id === installment.receivable_id);
        return {
          ...installment,
          description: receivable?.description || '',
          payer: receivable?.payer || '',
        };
      });
  };

  return {
    receivables: receivablesWithCalculations,
    receivablesSaldo,
    receivablesParcelado,
    installments,
    payments,
    isLoading: isLoadingReceivables || isLoadingInstallments || isLoadingPayments,
    createReceivable: createMutation.mutateAsync,
    updateReceivable: updateMutation.mutateAsync,
    closeReceivable: closeMutation.mutateAsync,
    registerPayment: registerPaymentMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isClosing: closeMutation.isPending,
    isRegistering: registerPaymentMutation.isPending,
    getInstallmentsForReceivable,
    getPaymentsForReceivable,
    getSummary,
    getNextReceivables,
  };
}
