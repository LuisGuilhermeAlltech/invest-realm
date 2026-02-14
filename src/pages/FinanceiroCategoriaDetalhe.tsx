import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, FolderTree } from 'lucide-react';
import { useCategoriasFinanceiras, useGastosPorMesCategoria } from '@/hooks/useCategoriasFinanceiras';
import { useFinanceiroMensal, useFinanceiroDetalhe } from '@/hooks/useFinanceiroMensal';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function FinanceiroCategoriaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categorias, getSubcategorias, getSubcategoriasAtivas, createCategoria } = useCategoriasFinanceiras();
  const { meses } = useFinanceiroMensal();

  const categoria = categorias?.find(c => c.id === id);
  const subcategorias = id ? getSubcategorias(id) : [];
  const subcategoriasAtivas = id ? getSubcategoriasAtivas(id) : [];

  // Month selector
  const [selectedMesId, setSelectedMesId] = useState<string>(meses?.[0]?.id || '');
  const selectedMes = meses?.find(m => m.id === selectedMesId);

  // Gastos for this category in selected month
  const { data: gastosCategoria } = useGastosPorMesCategoria(selectedMesId || null, id || null);
  const { addGasto } = useFinanceiroDetalhe(selectedMesId || null);

  // Subcategoria filter
  const [filtroSubcategoria, setFiltroSubcategoria] = useState<string>('');

  // New gasto form
  const [showGastoForm, setShowGastoForm] = useState(false);
  const [novoGasto, setNovoGasto] = useState({ descricao: '', valor: '', subcategoria_id: '' });

  // New subcategoria form
  const [showSubForm, setShowSubForm] = useState(false);
  const [novaSubNome, setNovaSubNome] = useState('');
  const [novaSubLimite, setNovaSubLimite] = useState('');

  if (!categoria) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/financeiro/categorias')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-center py-8 text-muted-foreground">Categoria não encontrada.</div>
      </div>
    );
  }

  // Calculate totals for this category
  const totalGasto = gastosCategoria?.reduce((sum, g) => sum + Number(g.valor), 0) || 0;
  const limite = categoria.limite_mensal;
  const disponivel = limite > 0 ? limite - totalGasto : 0;
  const percentual = limite > 0 ? (totalGasto / limite) * 100 : 0;

  // Filter gastos by subcategoria
  const gastosFiltrados = filtroSubcategoria
    ? gastosCategoria?.filter(g => g.subcategoria_id === filtroSubcategoria)
    : gastosCategoria;

  const handleAddGasto = () => {
    if (!novoGasto.descricao || !novoGasto.valor || !selectedMesId) return;
    addGasto({
      descricao: novoGasto.descricao,
      valor: parseFloat(novoGasto.valor),
      categoria_id: id!,
      subcategoria_id: novoGasto.subcategoria_id || null,
    });
    setNovoGasto({ descricao: '', valor: '', subcategoria_id: '' });
    setShowGastoForm(false);
  };

  const handleAddSubcategoria = () => {
    if (!novaSubNome.trim()) return;
    createCategoria({
      nome: novaSubNome.trim(),
      tipo_id: categoria.tipo_id,
      limite_mensal: parseFloat(novaSubLimite) || 0,
      ativa: true,
      parent_id: id!,
    });
    setNovaSubNome('');
    setNovaSubLimite('');
    setShowSubForm(false);
  };

  const getSubcategoriaNome = (subId: string | null) => {
    if (!subId) return '—';
    return subcategorias.find(s => s.id === subId)?.nome || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro/categorias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="h-5 w-5" /> {categoria.nome}
          </h1>
          {categoria.parent_id && (
            <p className="text-muted-foreground text-sm">Subcategoria</p>
          )}
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Label>Mês:</Label>
        <Select value={selectedMesId} onValueChange={setSelectedMesId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
          <SelectContent>
            {meses?.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {MESES[m.mes - 1]} {m.ano}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Orçamento / Limite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {limite > 0 ? formatCurrency(limite, 'BRL') : 'Sem limite'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gasto no Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalGasto, 'BRL')}</div>
            {limite > 0 && (
              <>
                <Progress value={Math.min(percentual, 100)} className={cn("h-2 mt-2", percentual >= 90 ? '[&>div]:bg-red-500' : percentual >= 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500')} />
                <p className={cn("text-xs mt-1", percentual >= 90 ? 'text-red-600' : percentual >= 70 ? 'text-amber-600' : 'text-green-600')}>
                  {percentual.toFixed(0)}% utilizado
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", disponivel >= 0 ? "text-green-600" : "text-red-600")}>
              {limite > 0 ? formatCurrency(disponivel, 'BRL') : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowGastoForm(true)} disabled={!selectedMesId}>
          <Plus className="h-4 w-4 mr-2" /> Novo gasto nesta categoria
        </Button>
        <Button variant="outline" onClick={() => setShowSubForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova subcategoria
        </Button>
      </div>

      {/* Subcategorias section */}
      {subcategorias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subcategorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge
                variant={filtroSubcategoria === '' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFiltroSubcategoria('')}
              >
                Todas
              </Badge>
              {subcategorias.map((sub) => (
                <Badge
                  key={sub.id}
                  variant={filtroSubcategoria === sub.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFiltroSubcategoria(sub.id)}
                >
                  {sub.nome}
                  {sub.limite_mensal > 0 && ` (${formatCurrency(sub.limite_mensal, 'BRL')})`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lançamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Lançamentos {selectedMes && `— ${MESES[selectedMes.mes - 1]} ${selectedMes.ano}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedMesId ? (
            <div className="text-center py-8 text-muted-foreground">Selecione um mês para ver os lançamentos.</div>
          ) : !gastosFiltrados?.length ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum gasto nesta categoria para o mês selecionado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosFiltrados.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">{getSubcategoriaNome(g.subcategoria_id)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(Number(g.valor), 'BRL')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Novo gasto */}
      <Dialog open={showGastoForm} onOpenChange={(o) => !o && setShowGastoForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Gasto — {categoria.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={novoGasto.descricao} onChange={(e) => setNovoGasto({ ...novoGasto, descricao: e.target.value })} placeholder="Descrição do gasto" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" value={novoGasto.valor} onChange={(e) => setNovoGasto({ ...novoGasto, valor: e.target.value })} placeholder="0,00" step="0.01" />
            </div>
            {subcategoriasAtivas.length > 0 && (
              <div className="space-y-2">
                <Label>Subcategoria (opcional)</Label>
                <Select value={novoGasto.subcategoria_id} onValueChange={(v) => setNovoGasto({ ...novoGasto, subcategoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {subcategoriasAtivas.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleAddGasto} className="w-full" disabled={!novoGasto.descricao || !novoGasto.valor}>
              Adicionar Gasto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova subcategoria */}
      <Dialog open={showSubForm} onOpenChange={(o) => !o && setShowSubForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Subcategoria de {categoria.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={novaSubNome} onChange={(e) => setNovaSubNome(e.target.value)} placeholder="Ex: Parcela do carro" />
            </div>
            <div className="space-y-2">
              <Label>Limite Mensal (R$, opcional)</Label>
              <Input type="number" value={novaSubLimite} onChange={(e) => setNovaSubLimite(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <Button onClick={handleAddSubcategoria} className="w-full" disabled={!novaSubNome.trim()}>
              Criar Subcategoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
