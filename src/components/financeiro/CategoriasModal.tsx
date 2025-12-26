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
import { Plus, Pencil, Trash2, Check, X, Tags, Settings } from 'lucide-react';
import { useCategoriasFinanceiras, CategoriaFinanceira } from '@/hooks/useCategoriasFinanceiras';
import { useTiposGasto, TipoGasto } from '@/hooks/useTiposGasto';
import { formatCurrency } from '@/lib/formatters';
import TiposGastoModal from './TiposGastoModal';

interface CategoriasModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CategoriasModal({ open, onClose }: CategoriasModalProps) {
  const { categorias, isLoading, createCategoria, updateCategoria, deleteCategoria } = useCategoriasFinanceiras();
  const { tiposAtivos, createTipo } = useTiposGasto();
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo_id: '',
    limite_mensal: '',
    ativa: true,
  });
  const [showNovoTipo, setShowNovoTipo] = useState(false);
  const [novoTipoNome, setNovoTipoNome] = useState('');
  const [showTiposModal, setShowTiposModal] = useState(false);

  const resetForm = () => {
    setFormData({ nome: '', tipo_id: '', limite_mensal: '', ativa: true });
    setShowForm(false);
    setEditingId(null);
    setShowNovoTipo(false);
    setNovoTipoNome('');
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.tipo_id) return;

    const data = {
      nome: formData.nome,
      tipo_id: formData.tipo_id,
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
      tipo_id: cat.tipo_id || '',
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

  const handleCreateTipo = async () => {
    if (!novoTipoNome.trim()) return;
    try {
      const newTipo = await createTipo(novoTipoNome.trim());
      setFormData({ ...formData, tipo_id: newTipo.id });
      setShowNovoTipo(false);
      setNovoTipoNome('');
    } catch {
      // Error handled in hook
    }
  };

  const getTipoNome = (tipoId: string | null) => {
    if (!tipoId) return 'Sem tipo';
    const tipo = tiposAtivos.find(t => t.id === tipoId);
    return tipo?.nome || 'Tipo removido';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Categorias Financeiras
              </DialogTitle>
              <Button variant="outline" size="sm" onClick={() => setShowTiposModal(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Gerenciar Tipos
              </Button>
            </div>
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
                    {showNovoTipo ? (
                      <div className="flex gap-2">
                        <Input
                          value={novoTipoNome}
                          onChange={(e) => setNovoTipoNome(e.target.value)}
                          placeholder="Nome do tipo"
                          className="flex-1"
                        />
                        <Button size="icon" onClick={handleCreateTipo}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => setShowNovoTipo(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select
                          value={formData.tipo_id}
                          onValueChange={(v) => setFormData({ ...formData, tipo_id: v })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposAtivos.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                {tipo.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="outline" onClick={() => setShowNovoTipo(true)} title="Novo tipo">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
                  <Button onClick={handleSubmit} disabled={!formData.nome || !formData.tipo_id}>
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
                          <Badge variant="secondary">
                            {getTipoNome(cat.tipo_id)}
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

      <TiposGastoModal open={showTiposModal} onClose={() => setShowTiposModal(false)} />
    </>
  );
}
