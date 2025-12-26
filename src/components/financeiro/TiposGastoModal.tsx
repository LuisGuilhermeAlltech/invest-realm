import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Check, X, Layers } from 'lucide-react';
import { useTiposGasto, TipoGasto } from '@/hooks/useTiposGasto';

interface TiposGastoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TiposGastoModal({ open, onClose }: TiposGastoModalProps) {
  const { tipos, isLoading, createTipo, updateTipo, deleteTipo } = useTiposGasto();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState('');

  const resetForm = () => {
    setFormNome('');
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formNome.trim()) return;

    if (editingId) {
      updateTipo({ id: editingId, nome: formNome.trim() });
    } else {
      try {
        await createTipo(formNome.trim());
      } catch {
        // Error handled in hook
      }
    }
    resetForm();
  };

  const startEdit = (tipo: TipoGasto) => {
    setEditingId(tipo.id);
    setFormNome(tipo.nome);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir este tipo?')) {
      deleteTipo(id);
    }
  };

  const handleToggleAtivo = (tipo: TipoGasto) => {
    updateTipo({ id: tipo.id, ativo: !tipo.ativo });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Tipos de Gasto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form */}
          {showForm ? (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="space-y-2">
                <Input
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Nome do tipo (ex: Essencial, Lazer)"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={!formNome.trim()}>
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Tipo
            </Button>
          )}

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : !tipos?.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhum tipo cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  tipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.nome}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={tipo.ativo}
                            onCheckedChange={() => handleToggleAtivo(tipo)}
                          />
                          <Badge variant={tipo.ativo ? 'default' : 'secondary'} className="w-16 justify-center">
                            {tipo.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEdit(tipo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(tipo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Tipos inativos não aparecem ao criar categorias, mas categorias já vinculadas continuam funcionando.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
