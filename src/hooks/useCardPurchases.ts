import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CardPurchase } from '@/types/cardPurchases';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function useCardPurchases() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all card purchases
  const fetchCardPurchases = async (): Promise<CardPurchase[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('card_purchases')
      .select('*')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false });

    if (error) throw error;
    return (data || []) as CardPurchase[];
  };

  const {
    data: cardPurchases = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['card_purchases', user?.id],
    queryFn: fetchCardPurchases,
    enabled: !!user,
  });

  // Get purchases for a specific month
  const getPurchasesForMonth = (year: number, month: number): CardPurchase[] => {
    const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    
    return cardPurchases.filter(p => 
      p.purchase_date >= monthStart && p.purchase_date <= monthEnd
    );
  };

  // Get purchases by card
  const getPurchasesByCard = (cardName: string): CardPurchase[] => {
    return cardPurchases.filter(p => p.card_name === cardName);
  };

  // Get purchases by category
  const getPurchasesByCategory = (category: string): CardPurchase[] => {
    return cardPurchases.filter(p => p.category === category);
  };

  // Get unique card names
  const getCardNames = (): string[] => {
    return [...new Set(cardPurchases.map(p => p.card_name))].sort();
  };

  // Get unique categories
  const getCategories = (): string[] => {
    return [...new Set(cardPurchases.map(p => p.category))].sort();
  };

  // Get total for a month
  const getMonthlyTotal = (year: number, month: number): number => {
    return getPurchasesForMonth(year, month).reduce((sum, p) => sum + Number(p.amount), 0);
  };

  // Create purchase
  const createMutation = useMutation({
    mutationFn: async (purchase: Omit<CardPurchase, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('card_purchases')
        .insert({
          ...purchase,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases', user?.id] });
      toast.success('Compra registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao registrar compra:', error);
      toast.error('Erro ao registrar compra');
    },
  });

  // Update purchase
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CardPurchase> & { id: string }) => {
      const { data, error } = await supabase
        .from('card_purchases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases', user?.id] });
      toast.success('Compra atualizada!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar compra:', error);
      toast.error('Erro ao atualizar compra');
    },
  });

  // Delete purchase
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('card_purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases', user?.id] });
      toast.success('Compra excluída!');
    },
    onError: (error) => {
      console.error('Erro ao excluir compra:', error);
      toast.error('Erro ao excluir compra');
    },
  });

  // Mark as included in statement
  const markAsIncludedMutation = useMutation({
    mutationFn: async ({ id, statementMonth }: { id: string; statementMonth: string }) => {
      const { data, error } = await supabase
        .from('card_purchases')
        .update({ included_in_statement_month: statementMonth })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card_purchases', user?.id] });
      toast.success('Compra marcada como incluída na fatura!');
    },
    onError: (error) => {
      console.error('Erro ao marcar compra:', error);
      toast.error('Erro ao marcar compra');
    },
  });

  return {
    cardPurchases,
    isLoading,
    error,
    refetch,
    getPurchasesForMonth,
    getPurchasesByCard,
    getPurchasesByCategory,
    getCardNames,
    getCategories,
    getMonthlyTotal,
    createPurchase: createMutation.mutate,
    updatePurchase: updateMutation.mutate,
    deletePurchase: deleteMutation.mutate,
    markAsIncluded: markAsIncludedMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
