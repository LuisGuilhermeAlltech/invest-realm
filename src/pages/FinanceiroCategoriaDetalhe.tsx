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
import { ArrowLeft, Plus, Trash2, Tags } from 'lucide-react';
import { useCategoriasFinanceiras } from '@/hooks/useCategoriasFinanceiras';
import { useTiposGasto } from '@/hooks/useTiposGasto';
import { useFinanceiroMensal, useFinanceiroDetalhe } from '@/hooks/useFinanceiroMensal';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function FinanceiroCategoriaDetalhe() {
  const { id: tipoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tipos } = useTiposGasto();
  const { categoriasAtivas, getSubcategoriasByTipo, createCategoria } = useCategoriasFinanceiras();
  const { meses } = useFinanceiroMensal();

  const tipo = tipos?.find(t => t.id === tipoId);
  const subcategorias = tipoId ? getSubcategoriasByTipo(tipoId) : [];

  // Month selector
  const [selectedMesId, setSelectedMesId] = useState<string>(meses?.[0]?.id || '');
  const selectedMes = meses?.find(m => m.id === selectedMesId);

  // Fetch gastos for this tipo in the selected month
  const { data: gastosTipo } = useQuery({
    queryKey: ['gastos-tipo-detalhe', selectedMesId, tipoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financeiro_gastos')
        .select('*')
        .eq('financeiro_mensal_id', selectedMesId)
        .eq('tipo_id', tipoId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedMesId && !!tipoId,
  });

  const { addGasto } = useFinanceiroDetalhe(selectedMesId || null);

  // Filter state
  const [filtroSubcategoria, setFiltroSubcategoria] = useState<string>('');

  // New gasto form
  const [showGastoForm, setShowGastoForm] = useState(false);
  const [novoGasto, setNovoGasto] = useState({ descricao: '', valor: '', categoria_id: '' });

  // New subcategoria form
  const [showSubForm, setShowSubForm] = useState(false);
  const [novaSubNome, setNovaSubNome] = useState('');
  const [novaSubLimite, setNovaSubLimite] = useState('');

  if (!tipo) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/financeiro/categorias')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-center py-8 text-muted-foreground">Macro não encontrada.</div>
      </div>
    );
  }

  const totalGasto = gastosTipo?.reduce((sum, g) => sum + Number(g.valor), 0) || 0;
  const gastosDiretos = gastosTipo?.filter(g => !g.categoria_id) || [];
  const gastosComSub = gastosTipo?.filter(g => !!g.categoria_id) || [];

  // Filter
  const gastosFiltrados = filtroSubcategoria === '__diretos__'
    ? gastosDiretos
    : filtroSubcategoria
      ? gastosTipo?.filter(g => g.categoria_id === filtroSubcategoria)
      : gastosTipo;

  const handleAddGasto = () => {
    if (!novoGasto.descricao || !novoGasto.valor || !selectedMesId) return;
    addGasto({
      descricao: novoGasto.descricao,
      valor: parseFloat(novoGasto.valor),
      tipo_id: tipoId!,
      categoria_id: novoGasto.categoria_id || null,
    });
    setNovoGasto({ descricao: '', valor: '', categoria_id: '' });
    setShowGastoForm(false);
  };

  const handleAddSubcategoria = () => {
    if (!novaSubNome.trim()) return;
    createCategoria({
      nome: novaSubNome.trim(),
      tipo_id: tipoId!,
      limite_mensal: parseFloat(novaSubLimite) || 0,
      ativa: true,
    });
    setNovaSubNome('');
    setNovaSubLimite('');
    setShowSubForm(false);
  };

  const getSubcategoriaNome = (catId: string | null) => {
    if (!catId) return 'Direto';
    return subcategorias.find(s => s.id === catId)?.nome || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro/categorias')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tags className="h-5 w-5" /> {tipo.nome}
          </h1>
          <p className="text-muted-foreground text-sm">Categoria Macro</p>
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalGasto, 'BRL')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gastos Diretos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(gastosDiretos.reduce((s, g) => s + Number(g.valor), 0), 'BRL')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subcategorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subcategorias.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowGastoForm(true)} disabled={!selectedMesId}>
          <Plus className="h-4 w-4 mr-2" /> Novo gasto em {tipo.nome}
        </Button>
        <Button variant="outline" onClick={() => setShowSubForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova subcategoria
        </Button>
      </div>

      {/* Filter badges */}
      {(subcategorias.length > 0 || gastosDiretos.length > 0) && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filtroSubcategoria === '' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFiltroSubcategoria('')}
          >
            Todos
          </Badge>
          <Badge
            variant={filtroSubcategoria === '__diretos__' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFiltroSubcategoria('__diretos__')}
          >
            Diretos
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
            <div className="text-center py-8 text-muted-foreground">Selecione um mês.</div>
          ) : !gastosFiltrados?.length ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum gasto nesta macro para o mês selecionado.</div>
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
                    <TableCell className="text-muted-foreground">{getSubcategoriaNome(g.categoria_id)}</TableCell>
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
            <DialogTitle>Novo Gasto — {tipo.nome}</DialogTitle>
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
            {subcategorias.length > 0 && (
              <div className="space-y-2">
                <Label>Subcategoria (opcional)</Label>
                <Select value={novoGasto.categoria_id} onValueChange={(v) => setNovoGasto({ ...novoGasto, categoria_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma (gasto direto)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (gasto direto)</SelectItem>
                    {subcategorias.map((sub) => (
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
            <DialogTitle>Nova Subcategoria de {tipo.nome}</DialogTitle>
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
