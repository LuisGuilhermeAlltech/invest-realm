import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTiposGasto } from '@/hooks/useTiposGasto';

export interface LimiteTipoGasto {
  id: string;
  user_id: string;
  tipo_id: string | null;
  tipo: string | null; // legacy enum, kept for compatibility
  limite_mensal: number;
  ano: number;
  mes: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface GastoTipoComLimite {
  tipo_id: string | null;
  tipo_nome: string | null;
  total_gasto: number;
  limite_mensal: number;
  percentual: number;
}

export function useLimitesTipoGasto(ano: number, mes: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: limites, isLoading } = useQuery({
    queryKey: ['limites-tipo-gasto', ano, mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('limites_tipo_gasto')
        .select('*')
        .eq('ano', ano)
        .eq('mes', mes);
      
      if (error) throw error;
      return data as LimiteTipoGasto[];
    },
    enabled: !!user && !!ano && !!mes,
  });

  const upsertLimite = useMutation({
    mutationFn: async ({ tipo_id, limite_mensal }: { tipo_id: string; limite_mensal: number }) => {
      // Check if limit exists for this tipo_id
      const { data: existingData, error: fetchError } = await supabase
        .from('limites_tipo_gasto')
        .select('id')
        .eq('tipo_id', tipo_id)
        .eq('ano', ano)
        .eq('mes', mes)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existingData) {
        const { error } = await supabase
          .from('limites_tipo_gasto')
          .update({ limite_mensal })
          .eq('id', existingData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('limites_tipo_gasto')
          .insert({ 
            user_id: user!.id, 
            tipo_id,
            tipo: 'essencial' as const, // legacy, required by DB
            limite_mensal, 
            ano, 
            mes 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limites-tipo-gasto', ano, mes] });
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria-tipo'] });
      toast({ title: 'Limite atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar limite', description: error.message, variant: 'destructive' });
    },
  });

  const getLimiteByTipoId = (tipoId: string): number => {
    return limites?.find(l => l.tipo_id === tipoId)?.limite_mensal || 0;
  };

  return {
    limites,
    isLoading,
    upsertLimite: upsertLimite.mutate,
    getLimiteByTipoId,
  };
}

// Hook to get gastos by tipo with limits - now using tipo_id directly
export function useGastosPorCategoriaComLimites(
  financeiroMensalId: string | null,
  ano: number,
  mes: number
) {
  const { user } = useAuth();

  const { data: gastosPorTipo, isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos-por-categoria-tipo', financeiroMensalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_gastos_por_tipo')
        .select('*')
        .eq('financeiro_mensal_id', financeiroMensalId!);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!financeiroMensalId,
  });

  const { data: limites, isLoading: loadingLimites } = useQuery({
    queryKey: ['limites-tipo-gasto', ano, mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('limites_tipo_gasto')
        .select('*')
        .eq('ano', ano)
        .eq('mes', mes);
      
      if (error) throw error;
      return data as LimiteTipoGasto[];
    },
    enabled: !!user && !!ano && !!mes,
  });

  const gastosTipoComLimites: GastoTipoComLimite[] = [];
  
  if (gastosPorTipo) {
    // Group by tipo_id directly
    const gastosAgrupados = gastosPorTipo.reduce((acc, g) => {
      const key = g.tipo_id || 'sem_tipo';
      acc[key] = {
        total: (acc[key]?.total || 0) + Number(g.total_gasto),
        nome: g.tipo_nome || 'Sem tipo',
        tipo_id: g.tipo_id,
      };
      return acc;
    }, {} as Record<string, { total: number; nome: string; tipo_id: string | null }>);

    for (const [, value] of Object.entries(gastosAgrupados)) {
      // Match limit by tipo_id directly
      const limite = value.tipo_id && limites 
        ? limites.find(l => l.tipo_id === value.tipo_id)?.limite_mensal || 0 
        : 0;
      const percentual = limite > 0 ? (value.total / limite) * 100 : 0;

      if (value.total > 0 || limite > 0) {
        gastosTipoComLimites.push({
          tipo_id: value.tipo_id,
          tipo_nome: value.nome,
          total_gasto: value.total,
          limite_mensal: limite,
          percentual,
        });
      }
    }

    // Add tipos that have limits but no gastos
    if (limites) {
      for (const limite of limites) {
        if (limite.tipo_id && !gastosTipoComLimites.find(g => g.tipo_id === limite.tipo_id)) {
          // Find tipo name
          const tipoGasto = gastosPorTipo?.find(g => g.tipo_id === limite.tipo_id);
          gastosTipoComLimites.push({
            tipo_id: limite.tipo_id,
            tipo_nome: tipoGasto?.tipo_nome || 'Tipo',
            total_gasto: 0,
            limite_mensal: limite.limite_mensal,
            percentual: 0,
          });
        }
      }
    }
  }

  return {
    gastosTipoComLimites,
    isLoading: loadingGastos || loadingLimites,
  };
}

export function checkLimiteExcedido(
  gastosTipoComLimites: GastoTipoComLimite[],
  tipoId: string | null,
  novoValor: number
): { excedido: boolean; percentualApos: number; limite: number } {
  if (!tipoId) {
    return { excedido: false, percentualApos: 0, limite: 0 };
  }

  const tipoData = gastosTipoComLimites.find(g => g.tipo_id === tipoId);
  if (!tipoData || tipoData.limite_mensal === 0) {
    return { excedido: false, percentualApos: 0, limite: 0 };
  }

  const totalApos = tipoData.total_gasto + novoValor;
  const percentualApos = (totalApos / tipoData.limite_mensal) * 100;

  return {
    excedido: percentualApos >= 100,
    percentualApos,
    limite: tipoData.limite_mensal,
  };
}
