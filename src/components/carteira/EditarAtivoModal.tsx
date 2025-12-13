import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CLASSE_LABELS, ClasseAtivo, CarteiraAtual } from '@/types/database';

interface EditarAtivoModalProps {
  ativo: CarteiraAtual | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: { classe: ClasseAtivo; nome?: string }) => void;
}

export function EditarAtivoModal({ ativo, open, onOpenChange, onSave }: EditarAtivoModalProps) {
  const [classe, setClasse] = useState<ClasseAtivo>('acoes_br');
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (ativo) {
      setClasse(ativo.classe);
      setNome(ativo.nome || '');
    }
  }, [ativo]);

  const handleSave = () => {
    if (!ativo) return;
    onSave(ativo.ativo_id, { 
      classe, 
      nome: nome.trim() || undefined 
    });
    onOpenChange(false);
  };

  if (!ativo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Ativo</DialogTitle>
          <DialogDescription>
            Altere os dados do ativo. Preço médio e quantidades não podem ser editados aqui.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ticker</Label>
            <Input value={ativo.ticker} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input 
              id="nome"
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
              placeholder="Nome do ativo (opcional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="classe">Categoria / Classe</Label>
            <Select value={classe} onValueChange={(v) => setClasse(v as ClasseAtivo)}>
              <SelectTrigger id="classe">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLASSE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
