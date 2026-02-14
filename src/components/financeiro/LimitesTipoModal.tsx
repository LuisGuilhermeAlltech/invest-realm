import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLimitesTipoGasto } from '@/hooks/useLimitesTipoGasto';
import { useTiposGasto } from '@/hooks/useTiposGasto';
import { formatCurrency } from '@/lib/formatters';

interface LimitesTipoModalProps {
  open: boolean;
  onClose: () => void;
  ano: number;
  mes: number;
}

export default function LimitesTipoModal({ open, onClose, ano, mes }: LimitesTipoModalProps) {
  const { limites, upsertLimite, getLimiteByTipoId } = useLimitesTipoGasto(ano, mes);
  const { tiposAtivos } = useTiposGasto();
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (limites && tiposAtivos && !initialized) {
      const newValues: Record<string, string> = {};
      for (const tipo of tiposAtivos) {
        const limite = getLimiteByTipoId(tipo.id);
        newValues[tipo.id] = limite > 0 ? limite.toString() : '';
      }
      setValues(newValues);
      setInitialized(true);
    }
  }, [limites, tiposAtivos, initialized, getLimiteByTipoId]);

  useEffect(() => {
    if (!open) setInitialized(false);
  }, [open, ano, mes]);

  const handleSave = (tipoId: string) => {
    const valor = parseFloat(values[tipoId]) || 0;
    upsertLimite({ tipo_id: tipoId, limite_mensal: valor });
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
            Defina limites mensais para cada tipo de gasto.
          </p>

          {tiposAtivos.map((tipo) => (
            <div key={tipo.id} className="space-y-2">
              <Label>{tipo.nome}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0,00"
                  value={values[tipo.id] || ''}
                  onChange={(e) => setValues({ ...values, [tipo.id]: e.target.value })}
                  step="0.01"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => handleSave(tipo.id)}
                  disabled={!values[tipo.id] || parseFloat(values[tipo.id]) === getLimiteByTipoId(tipo.id)}
                >
                  Salvar
                </Button>
              </div>
              {getLimiteByTipoId(tipo.id) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Limite atual: {formatCurrency(getLimiteByTipoId(tipo.id), 'BRL')}
                </p>
              )}
            </div>
          ))}

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
