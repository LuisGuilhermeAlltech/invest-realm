import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Search, Tags, FolderTree, Settings, Trash2 } from 'lucide-react';
import { useCategoriasFinanceiras, CategoriaFinanceira } from '@/hooks/useCategoriasFinanceiras';
import { useTiposGasto } from '@/hooks/useTiposGasto';
import { formatCurrency } from '@/lib/formatters';
import TiposGastoModal from '@/components/financeiro/TiposGastoModal';

export default function FinanceiroCategorias() {
  const navigate = useNavigate();
  const { categorias, categoriasAtivas, isLoading, createCategoria, updateCategoria, deleteCategoria, checkGastosVinculados } = useCategoriasFinanceiras();
  const { tiposAtivos } = useTiposGasto();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTiposModal, setShowTiposModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo_id: '',
    limite_mensal: '',
    ativa: true,
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string; count: number } | null>(null);

  const resetForm = () => {
    setFormData({ nome: '', tipo_id: '', limite_mensal: '', ativa: true });
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.tipo_id) return;
    createCategoria({
      nome: formData.nome,
      tipo_id: formData.tipo_id,
      limite_mensal: parseFloat(formData.limite_mensal) || 0,
      ativa: formData.ativa,
    });
    resetForm();
  };

  const handleNewSubInMacro = (tipoId: string) => {
    setFormData({ nome: '', tipo_id: tipoId, limite_mensal: '', ativa: true });
    setShowForm(true);
  };

  const handleDeleteClick = async (cat: CategoriaFinanceira) => {
    try {
      const count = await checkGastosVinculados(cat.id);
      if (count > 0) {
        setDeleteConfirm({ id: cat.id, nome: cat.nome, count });
      } else {
        deleteCategoria(cat.id);
      }
    } catch {
      deleteCategoria(cat.id);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    deleteCategoria(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  // Group subcategorias by Macro
  const subcategoriasByMacro = () => {
    const groups: Record<string, { tipoNome: string; tipoId: string; subcategorias: CategoriaFinanceira[] }> = {};
    
    const allCats = categorias || [];
    for (const cat of allCats) {
      if (search && !cat.nome.toLowerCase().includes(search.toLowerCase())) continue;
      const tipo = tiposAtivos.find(t => t.id === cat.tipo_id);
      const tipoKey = tipo?.id || 'sem_tipo';
      const tipoNome = tipo?.nome || 'Sem Macro';
      
      if (!groups[tipoKey]) {
        groups[tipoKey] = { tipoNome, tipoId: tipoKey, subcategorias: [] };
      }
      groups[tipoKey].subcategorias.push(cat);
    }
    
    return Object.values(groups);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="h-6 w-6" /> Categorias & Subcategorias
          </h1>
          <p className="text-muted-foreground">Gerencie macros (tipos) e subcategorias de gastos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTiposModal(true)}>
            <Settings className="h-4 w-4 mr-2" /> Macros
          </Button>
          <Button onClick={() => { setFormData({ nome: '', tipo_id: '', limite_mensal: '', ativa: true }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Subcategoria
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar subcategoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Create form dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Subcategoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Macro (Tipo)</Label>
              <Select value={formData.tipo_id} onValueChange={(v) => setFormData({ ...formData, tipo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione a macro" /></SelectTrigger>
                <SelectContent>
                  {tiposAtivos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Carro, Farmácia" />
            </div>
            <div className="space-y-2">
              <Label>Limite Mensal (R$, opcional)</Label>
              <Input type="number" value={formData.limite_mensal} onChange={(e) => setFormData({ ...formData, limite_mensal: e.target.value })} placeholder="0,00 (sem limite)" step="0.01" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.ativa} onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })} />
              <span className="text-sm text-muted-foreground">{formData.ativa ? 'Ativa' : 'Inativa'}</span>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={!formData.nome || !formData.tipo_id}>
              Criar Subcategoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir subcategoria</DialogTitle>
            <DialogDescription>
              A subcategoria <strong>{deleteConfirm?.nome}</strong> possui{' '}
              <strong>{deleteConfirm?.count}</strong> gasto{(deleteConfirm?.count || 0) !== 1 ? 's' : ''} vinculado{(deleteConfirm?.count || 0) !== 1 ? 's' : ''}.
              Ao excluir, eles serão movidos para "Sem subcategoria" (gastos diretos na mesma Macro).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategorias grouped by Macro */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : subcategoriasByMacro().length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            {search ? 'Nenhuma subcategoria encontrada.' : 'Nenhuma subcategoria cadastrada. Crie macros em "Macros" e depois adicione subcategorias.'}
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={subcategoriasByMacro().map(g => g.tipoId)} className="space-y-3">
          {subcategoriasByMacro().map((group) => (
            <AccordionItem key={group.tipoId} value={group.tipoId} className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  {group.tipoNome}
                  <Badge variant="secondary">{group.subcategorias.length} subcategorias</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-4">
                <Button variant="ghost" size="sm" onClick={() => handleNewSubInMacro(group.tipoId)} className="mb-2">
                  <Plus className="h-3 w-3 mr-1" /> Nova subcategoria em {group.tipoNome}
                </Button>
                {group.subcategorias.map((cat) => (
                  <Card key={cat.id} className="border-l-4 border-l-primary/30">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cat.nome}</span>
                            {!cat.ativa && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                            {cat.limite_mensal > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Limite: {formatCurrency(cat.limite_mensal, 'BRL')}
                              </Badge>
                            )}
                            {cat.limite_mensal === 0 && (
                              <Badge variant="secondary" className="text-xs font-normal">Sem limite</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteClick(cat)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <TiposGastoModal open={showTiposModal} onClose={() => setShowTiposModal(false)} />
    </div>
  );
}
