import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Installment, PaymentMethod } from '@/types/installments';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

// Helper to get today's date in Brazil timezone (YYYY-MM-DD)
const getTodayBrazil = (): string => {
  const now = new Date();
  // Format in Brazil timezone
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Returns YYYY-MM-DD
};

// Compare dates as strings (YYYY-MM-DD format)
const isDatePastOrToday = (dateStr: string): boolean => {
  const today = getTodayBrazil();
  return dateStr <= today;
};

const isDateFuture = (dateStr: string): boolean => {
  const today = getTodayBrazil();
  return dateStr > today;
};

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

  // Get next pending installment (first one with due_date > today, sorted by due_date)
  const getNextPendingInstallment = (contaPagarId: string): Installment | undefined => {
    return installments
      .filter(i => i.conta_pagar_id === contaPagarId && isDateFuture(i.due_date))
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  };

  // Derive status from date comparison - NO status field dependency
  // paid = due_date <= today, pending = due_date > today
  const deriveInstallmentStatus = (installment: Installment): 'paid' | 'pending' => {
    return isDatePastOrToday(installment.due_date) ? 'paid' : 'pending';
  };

  // Get installments for a specific month
  const getInstallmentsForMonth = (year: number, month: number): Installment[] => {
    const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    
    return installments.filter(i => 
      i.due_date >= monthStart && i.due_date <= monthEnd
    );
  };

  // Generate installments for a new bill
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

  // Calculate summary based ONLY on date comparison (due_date vs today)
  const getBillSummary = (contaPagarId: string) => {
    const billInstallments = getInstallmentsForBill(contaPagarId);
    const today = getTodayBrazil();
    
    // Count based on date comparison only
    // Paid = due_date <= today (already passed or today)
    // Pending = due_date > today (future)
    const paidInstallments = billInstallments.filter(i => i.due_date <= today);
    const pendingInstallments = billInstallments.filter(i => i.due_date > today);
    
    // Next pending: first future installment by due_date
    const nextPending = pendingInstallments
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
    
    const totalRemaining = pendingInstallments.reduce((sum, i) => sum + Number(i.amount), 0);
    const totalPaid = paidInstallments.reduce((sum, i) => sum + Number(i.amount), 0);

    const paidCount = paidInstallments.length;
    const totalCount = billInstallments.length;

    return {
      totalInstallments: totalCount,
      paidCount,
      pendingCount: pendingInstallments.length,
      overdueCount: 0, // No overdue concept - everything is automatic
      nextPending,
      totalRemaining,
      totalPaid,
      formattedProgress: `${paidCount}/${totalCount}`,
    };
  };

  // Get monthly commitment: sum of installments due in the selected month that are still pending (due_date > today)
  const getMonthlyCommitment = (year: number, month: number): number => {
    const monthInstallments = getInstallmentsForMonth(year, month);
    const today = getTodayBrazil();
    
    // Only count installments that haven't "passed" yet
    return monthInstallments
      .filter(i => i.due_date > today)
      .reduce((sum, i) => sum + Number(i.amount), 0);
  };

  // Get total pending across all bills (all future installments)
  const getTotalPending = (): number => {
    const today = getTodayBrazil();
    return installments
      .filter(i => i.due_date > today)
      .reduce((sum, i) => sum + Number(i.amount), 0);
  };

  // Get next due installments for dashboard (with bill info)
  const getNextDueInstallments = (limit: number = 5) => {
    const today = getTodayBrazil();
    return installments
      .filter(i => i.due_date > today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, limit);
  };

  return {
    installments,
    isLoading,
    error,
    refetch,
    getInstallmentsForBill,
    getNextPendingInstallment,
    deriveInstallmentStatus,
    getInstallmentsForMonth,
    getBillSummary,
    getMonthlyCommitment,
    getTotalPending,
    getNextDueInstallments,
    generateInstallments: generateInstallmentsMutation.mutate,
    isGenerating: generateInstallmentsMutation.isPending,
  };
}
