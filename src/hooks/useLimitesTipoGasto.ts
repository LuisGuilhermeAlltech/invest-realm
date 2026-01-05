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
  total_gasto: number;
  limite_mensal: number;
  percentual: number;
}

// Map from tipo_nome to enum value
function tipoNomeToEnum(tipoNome: string): TipoCategoria | null {
  const normalized = tipoNome.toLowerCase().trim();
  if (normalized === 'essencial') return 'essencial';
  if (normalized === 'não essencial' || normalized === 'nao essencial') return 'nao_essencial';
  if (normalized === 'lazer') return 'lazer';
  if (normalized === 'investimentos') return 'investimentos';
  return null;
}

export const ALL_TIPOS_CATEGORIA: TipoCategoria[] = ['essencial', 'nao_essencial', 'lazer', 'investimentos'];

const TIPOS_CATEGORIA_LABELS: Record<TipoCategoria, string> = {
  essencial: 'Essencial',
  nao_essencial: 'Não Essencial',
  lazer: 'Lazer',
  investimentos: 'Investimentos',
};

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
      queryClient.invalidateQueries({ queryKey: ['gastos-por-categoria-tipo'] });
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

// Hook to get gastos by tipo (from tipos_gasto table) with limits
export function useGastosPorCategoriaComLimites(
  financeiroMensalId: string | null,
  ano: number,
  mes: number
) {
  const { user } = useAuth();

  // Get gastos grouped by tipo_id from the corrected view
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

  // Combine gastos with limits, grouped by tipo_nome
  const gastosTipoComLimites: GastoTipoComLimite[] = [];
  
  if (gastosPorTipo) {
    // Group gastos by tipo_nome (from the view, which uses tipos_gasto table)
    const gastosAgrupados = gastosPorTipo.reduce((acc, g) => {
      const tipoNome = g.tipo_nome;
      if (tipoNome) {
        acc[tipoNome] = (acc[tipoNome] || 0) + Number(g.total_gasto);
      }
      return acc;
    }, {} as Record<string, number>);

    // Get unique tipo names
    const tipoNomes = [...new Set(gastosPorTipo.map(g => g.tipo_nome).filter(Boolean))];
    
    // Create combined data for each tipo
    for (const tipoNome of tipoNomes) {
      const totalGasto = gastosAgrupados[tipoNome as string] || 0;
      
      // Map tipo_nome to enum to find the limit
      const tipoEnum = tipoNomeToEnum(tipoNome as string);
      const limite = tipoEnum && limites 
        ? limites.find(l => l.tipo === tipoEnum)?.limite_mensal || 0 
        : 0;
      const percentual = limite > 0 ? (totalGasto / limite) * 100 : 0;

      // Only show if there are gastos or a limit set
      if (totalGasto > 0 || limite > 0) {
        gastosTipoComLimites.push({
          tipo_id: gastosPorTipo.find(g => g.tipo_nome === tipoNome)?.tipo_id || null,
          tipo_nome: tipoNome,
          total_gasto: totalGasto,
          limite_mensal: limite,
          percentual,
        });
      }
    }

    // Also add tipos that have limits but no gastos
    if (limites) {
      for (const limite of limites) {
        const tipoLabel = TIPOS_CATEGORIA_LABELS[limite.tipo];
        if (!gastosTipoComLimites.find(g => g.tipo_nome === tipoLabel)) {
          gastosTipoComLimites.push({
            tipo_id: null,
            tipo_nome: tipoLabel,
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

// Helper to check if a gasto exceeds the tipo limit
export function checkLimiteExcedido(
  gastosTipoComLimites: GastoTipoComLimite[],
  tipoNome: string | null,
  novoValor: number
): { excedido: boolean; percentualApos: number; limite: number } {
  if (!tipoNome) {
    return { excedido: false, percentualApos: 0, limite: 0 };
  }

  const tipoData = gastosTipoComLimites.find(g => g.tipo_nome === tipoNome);
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
