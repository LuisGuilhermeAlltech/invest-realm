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
import { Plus, Pencil, Trash2, Check, X, Tags } from 'lucide-react';
import { 
  useCategoriasFinanceiras, 
  TipoCategoriaFinanceira, 
  CategoriaFinanceira,
  TIPOS_CATEGORIA 
} from '@/hooks/useCategoriasFinanceiras';
import { formatCurrency } from '@/lib/formatters';

interface CategoriasModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CategoriasModal({ open, onClose }: CategoriasModalProps) {
  const { categorias, isLoading, createCategoria, updateCategoria, deleteCategoria } = useCategoriasFinanceiras();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'essencial' as TipoCategoriaFinanceira,
    limite_mensal: '',
    ativa: true,
  });

  const resetForm = () => {
    setFormData({ nome: '', tipo: 'essencial', limite_mensal: '', ativa: true });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.nome) return;

    const data = {
      nome: formData.nome,
      tipo: formData.tipo,
      limite_mensal: parseFloat(formData.limite_mensal) || 0,
      ativa: formData.ativa,
    };

    if (editingId) {
      updateCategoria({ id: editingId, ...data });
    } else {
      createCategoria(data);
    }
    resetForm();
  };

  const startEdit = (cat: CategoriaFinanceira) => {
    setEditingId(cat.id);
    setFormData({
      nome: cat.nome,
      tipo: cat.tipo,
      limite_mensal: cat.limite_mensal.toString(),
      ativa: cat.ativa,
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir esta categoria?')) {
      deleteCategoria(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Categorias Financeiras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form */}
          {showForm ? (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Alimentação"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v as TipoCategoriaFinanceira })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPOS_CATEGORIA).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite Mensal (R$)</Label>
                  <Input
                    type="number"
                    value={formData.limite_mensal}
                    onChange={(e) => setFormData({ ...formData, limite_mensal: e.target.value })}
                    placeholder="0,00"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={formData.ativa}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          )}

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Limite</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : !categorias?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma categoria cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.nome}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          style={{ backgroundColor: TIPOS_CATEGORIA[cat.tipo].color + '20', color: TIPOS_CATEGORIA[cat.tipo].color }}
                        >
                          {TIPOS_CATEGORIA[cat.tipo].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(cat.limite_mensal, 'BRL')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cat.ativa ? 'default' : 'secondary'}>
                          {cat.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEdit(cat)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(cat.id)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
