import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type TipoCategoria = Database['public']['Enums']['tipo_categoria_financeira'];

export interface LimiteTipoGasto {
  id: string;
  user_id: string;
  tipo: TipoCategoria;
  limite_mensal: number;
  ano: number;
  mes: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface GastoTipoComLimite {
  tipo_id: string | null;
  tipo_nome: string | null;
  categoria_tipo: TipoCategoria | null;
  total_gasto: number;
  limite_mensal: number;
  percentual: number;
}

const TIPOS_CATEGORIA_LABELS: Record<TipoCategoria, string> = {
  essencial: 'Essencial',
  nao_essencial: 'Não Essencial',
  lazer: 'Lazer',
  investimentos: 'Investimentos',
};

export const ALL_TIPOS_CATEGORIA: TipoCategoria[] = ['essencial', 'nao_essencial', 'lazer', 'investimentos'];

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
    mutationFn: async ({ tipo, limite_mensal }: { tipo: TipoCategoria; limite_mensal: number }) => {
      // Query directly to check if limit exists (don't rely on stale state)
      const { data: existingData, error: fetchError } = await supabase
        .from('limites_tipo_gasto')
        .select('id')
        .eq('tipo', tipo)
        .eq('ano', ano)
        .eq('mes', mes)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existingData) {
        // Update existing
        const { error } = await supabase
          .from('limites_tipo_gasto')
          .update({ limite_mensal })
          .eq('id', existingData.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('limites_tipo_gasto')
          .insert({ 
            user_id: user!.id, 
            tipo, 
            limite_mensal, 
            ano, 
            mes 
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limites-tipo-gasto', ano, mes] });
      toast({ title: 'Limite atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar limite', description: error.message, variant: 'destructive' });
    },
  });

  const getLimiteByTipo = (tipo: TipoCategoria): number => {
    return limites?.find(l => l.tipo === tipo)?.limite_mensal || 0;
  };

  return {
    limites,
    isLoading,
    upsertLimite: upsertLimite.mutate,
    getLimiteByTipo,
    tiposLabels: TIPOS_CATEGORIA_LABELS,
    allTipos: ALL_TIPOS_CATEGORIA,
  };
}

// Hook to get gastos by categoria_tipo with limits
export function useGastosPorCategoriaComLimites(
  financeiroMensalId: string | null,
  ano: number,
  mes: number
) {
  const { user } = useAuth();

  // Get gastos grouped by categoria_tipo (from vw_gastos_por_tipo)
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

  // Get limits for the month
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

  // Combine gastos with limits, grouped by categoria_tipo
  const gastosTipoComLimites: GastoTipoComLimite[] = [];
  
  if (gastosPorTipo && limites) {
    // Group gastos by categoria_tipo
    const gastosAgrupados = gastosPorTipo.reduce((acc, g) => {
      const tipo = g.categoria_tipo as TipoCategoria | null;
      if (tipo) {
        acc[tipo] = (acc[tipo] || 0) + Number(g.total_gasto);
      }
      return acc;
    }, {} as Record<TipoCategoria, number>);

    // Create combined data for each tipo that has gastos
    for (const tipo of ALL_TIPOS_CATEGORIA) {
      const totalGasto = gastosAgrupados[tipo] || 0;
      const limite = limites.find(l => l.tipo === tipo)?.limite_mensal || 0;
      const percentual = limite > 0 ? (totalGasto / limite) * 100 : 0;

      if (totalGasto > 0 || limite > 0) {
        gastosTipoComLimites.push({
          tipo_id: null,
          tipo_nome: TIPOS_CATEGORIA_LABELS[tipo],
          categoria_tipo: tipo,
          total_gasto: totalGasto,
          limite_mensal: limite,
          percentual,
        });
      }
    }
  }

  return {
    gastosTipoComLimites,
    isLoading: loadingGastos || loadingLimites,
  };
}

// Helper to check if a gasto exceeds the tipo limit
export function checkLimiteExcedido(
  gastosTipoComLimites: GastoTipoComLimite[],
  categoriaTipo: TipoCategoria | null,
  novoValor: number
): { excedido: boolean; percentualApos: number; limite: number } {
  if (!categoriaTipo) {
    return { excedido: false, percentualApos: 0, limite: 0 };
  }

  const tipoData = gastosTipoComLimites.find(g => g.categoria_tipo === categoriaTipo);
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
