import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, ChevronRight, Tags, FolderTree, Settings } from 'lucide-react';
import { useCategoriasFinanceiras, CategoriaFinanceira } from '@/hooks/useCategoriasFinanceiras';
import { useTiposGasto } from '@/hooks/useTiposGasto';
import { formatCurrency } from '@/lib/formatters';
import TiposGastoModal from '@/components/financeiro/TiposGastoModal';

export default function FinanceiroCategorias() {
  const navigate = useNavigate();
  const { categorias, categoriasRaiz, getSubcategorias, isLoading, createCategoria, updateCategoria, deleteCategoria } = useCategoriasFinanceiras();
  const { tiposAtivos, createTipo } = useTiposGasto();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showTiposModal, setShowTiposModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo_id: '',
    limite_mensal: '',
    ativa: true,
    parent_id: '' as string,
  });

  const resetForm = () => {
    setFormData({ nome: '', tipo_id: '', limite_mensal: '', ativa: true, parent_id: '' });
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.tipo_id) return;
    createCategoria({
      nome: formData.nome,
      tipo_id: formData.tipo_id,
      limite_mensal: parseFloat(formData.limite_mensal) || 0,
      ativa: formData.ativa,
      parent_id: formData.parent_id || null,
    });
    resetForm();
  };

  const handleNewSubcategoria = (parentId: string) => {
    const parent = categoriasRaiz.find(c => c.id === parentId);
    setFormData({
      nome: '',
      tipo_id: parent?.tipo_id || '',
      limite_mensal: '',
      ativa: true,
      parent_id: parentId,
    });
    setShowForm(true);
  };

  // Group root categorias by tipo
  const categoriasByTipo = () => {
    const groups: Record<string, { tipoNome: string; tipoId: string; categorias: CategoriaFinanceira[] }> = {};
    
    for (const cat of categoriasRaiz) {
      if (search && !cat.nome.toLowerCase().includes(search.toLowerCase())) continue;
      const tipo = tiposAtivos.find(t => t.id === cat.tipo_id);
      const tipoKey = tipo?.id || 'sem_tipo';
      const tipoNome = tipo?.nome || 'Sem Tipo';
      
      if (!groups[tipoKey]) {
        groups[tipoKey] = { tipoNome, tipoId: tipoKey, categorias: [] };
      }
      groups[tipoKey].categorias.push(cat);
    }
    
    return Object.values(groups);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="h-6 w-6" /> Categorias Financeiras
          </h1>
          <p className="text-muted-foreground">Gerencie categorias e subcategorias de gastos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTiposModal(true)}>
            <Settings className="h-4 w-4 mr-2" /> Tipos
          </Button>
          <Button onClick={() => { setFormData({ ...formData, parent_id: '' }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Categoria
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Create/edit form dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formData.parent_id ? 'Nova Subcategoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {formData.parent_id && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground">Subcategoria de:</p>
                <p className="font-medium">{categoriasRaiz.find(c => c.id === formData.parent_id)?.nome}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Alimentação" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.tipo_id} onValueChange={(v) => setFormData({ ...formData, tipo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposAtivos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Limite Mensal (R$)</Label>
              <Input type="number" value={formData.limite_mensal} onChange={(e) => setFormData({ ...formData, limite_mensal: e.target.value })} placeholder="0,00" step="0.01" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.ativa} onCheckedChange={(checked) => setFormData({ ...formData, ativa: checked })} />
              <span className="text-sm text-muted-foreground">{formData.ativa ? 'Ativa' : 'Inativa'}</span>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={!formData.nome || !formData.tipo_id}>
              Criar {formData.parent_id ? 'Subcategoria' : 'Categoria'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Categories grouped by tipo */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : categoriasByTipo().length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            {search ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.'}
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={categoriasByTipo().map(g => g.tipoId)} className="space-y-3">
          {categoriasByTipo().map((group) => (
            <AccordionItem key={group.tipoId} value={group.tipoId} className="border rounded-lg px-4">
              <AccordionTrigger className="text-base font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  {group.tipoNome}
                  <Badge variant="secondary">{group.categorias.length}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-4">
                {group.categorias.map((cat) => {
                  const subcategorias = getSubcategorias(cat.id);
                  return (
                    <Card key={cat.id} className="border-l-4 border-l-primary/30">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1 cursor-pointer hover:opacity-80"
                            onClick={() => navigate(`/financeiro/categorias/${cat.id}`)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{cat.nome}</span>
                              {!cat.ativa && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                              {cat.limite_mensal > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Limite: {formatCurrency(cat.limite_mensal, 'BRL')}
                                </Badge>
                              )}
                            </div>
                            {subcategorias.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {subcategorias.map((sub) => (
                                  <Badge key={sub.id} variant="secondary" className="text-xs font-normal">
                                    {sub.nome}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleNewSubcategoria(cat.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Sub
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/financeiro/categorias/${cat.id}`)}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <TiposGastoModal open={showTiposModal} onClose={() => setShowTiposModal(false)} />
    </div>
  );
}
