import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLimitesTipoGasto, ALL_TIPOS_CATEGORIA } from '@/hooks/useLimitesTipoGasto';
import { formatCurrency } from '@/lib/formatters';
import { Database } from '@/integrations/supabase/types';

type TipoCategoria = Database['public']['Enums']['tipo_categoria_financeira'];

const TIPOS_LABELS: Record<TipoCategoria, string> = {
  essencial: 'Essencial',
  nao_essencial: 'Não Essencial',
  lazer: 'Lazer',
  investimentos: 'Investimentos',
};

interface LimitesTipoModalProps {
  open: boolean;
  onClose: () => void;
  ano: number;
  mes: number;
}

export default function LimitesTipoModal({ open, onClose, ano, mes }: LimitesTipoModalProps) {
  const { limites, upsertLimite, getLimiteByTipo } = useLimitesTipoGasto(ano, mes);
  const [values, setValues] = useState<Record<TipoCategoria, string>>({
    essencial: '',
    nao_essencial: '',
    lazer: '',
    investimentos: '',
  });

  // Initialize values when limites load
  useEffect(() => {
    if (limites) {
      const newValues: Record<TipoCategoria, string> = {
        essencial: '',
        nao_essencial: '',
        lazer: '',
        investimentos: '',
      };
      
      for (const tipo of ALL_TIPOS_CATEGORIA) {
        const limite = getLimiteByTipo(tipo);
        newValues[tipo] = limite > 0 ? limite.toString() : '';
      }
      
      setValues(newValues);
    }
  }, [limites, getLimiteByTipo]);

  const handleSave = (tipo: TipoCategoria) => {
    const valor = parseFloat(values[tipo]) || 0;
    upsertLimite({ tipo, limite_mensal: valor });
  };

  const getMesNome = (mes: number) => {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return meses[mes - 1];
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Limites por Tipo - {getMesNome(mes)} {ano}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Defina limites mensais para cada tipo de gasto. Os limites são independentes dos limites por categoria.
          </p>

          {ALL_TIPOS_CATEGORIA.map((tipo) => (
            <div key={tipo} className="space-y-2">
              <Label>{TIPOS_LABELS[tipo]}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0,00"
                  value={values[tipo]}
                  onChange={(e) => setValues({ ...values, [tipo]: e.target.value })}
                  step="0.01"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={() => handleSave(tipo)}
                  disabled={values[tipo] === '' || parseFloat(values[tipo]) === getLimiteByTipo(tipo)}
                >
                  Salvar
                </Button>
              </div>
              {getLimiteByTipo(tipo) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Limite atual: {formatCurrency(getLimiteByTipo(tipo), 'BRL')}
                </p>
              )}
            </div>
          ))}

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
