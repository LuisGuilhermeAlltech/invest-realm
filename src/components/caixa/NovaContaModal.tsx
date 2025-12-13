import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NovaContaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { nome: string; moeda: string }) => void;
}

export default function NovaContaModal({ open, onOpenChange, onSave }: NovaContaModalProps) {
  const [nome, setNome] = useState('');
  const [moeda, setMoeda] = useState<string>('BRL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    
    onSave({ nome: nome.trim(), moeda });
    setNome('');
    setMoeda('BRL');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Conta</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Nubank, Avenue, XP..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="moeda">Moeda</Label>
            <Select value={moeda} onValueChange={setMoeda}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL (Real)</SelectItem>
                <SelectItem value="USD">USD (Dólar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!nome.trim()}>
              Criar Conta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
