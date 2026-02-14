import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Check, X, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { useFinanceiroMensal, useFinanceiroDetalhe } from '@/hooks/useFinanceiroMensal';
import { useCategoriasFinanceiras, useGastosPorCategoria } from '@/hooks/useCategoriasFinanceiras';
import { useTiposGasto } from '@/hooks/useTiposGasto';
import { useGastosPorCategoriaComLimites } from '@/hooks/useLimitesTipoGasto';
import { TotaisPorTipoCardsComLimites } from '@/components/financeiro/FinanceiroCharts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function FinanceiroMesDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { meses } = useFinanceiroMensal();
  const mes = meses?.find(m => m.id === id);

  const {
    receitas, gastos, isLoading,
    addReceita, addGasto,
    updateReceita, updateGasto,
    deleteReceita, deleteGasto,
  } = useFinanceiroDetalhe(id || null);

  const { categoriasRaizAtivas, getSubcategoriasAtivas } = useCategoriasFinanceiras();
  const { tipos } = useTiposGasto();
  const { data: gastosPorCategoria } = useGastosPorCategoria(id || null);
  const { gastosTipoComLimites } = useGastosPorCategoriaComLimites(
    id || null,
    mes?.ano || new Date().getFullYear(),
    mes?.mes || new Date().getMonth() + 1
  );

  const [novaReceita, setNovaReceita] = useState({ descricao: '', valor: '' });
  const [novoGasto, setNovoGasto] = useState({ descricao: '', valor: '', categoria_id: '', subcategoria_id: '' });
  const [editingReceita, setEditingReceita] = useState<string | null>(null);
  const [editingGasto, setEditingGasto] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ descricao: '', valor: '', categoria_id: '', subcategoria_id: '' });

  if (!mes) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/financeiro')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div className="text-center py-8 text-muted-foreground">Mês não encontrado.</div>
      </div>
    );
  }

  const totalReceitas = receitas?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;
  const totalGastos = gastos?.reduce((sum, g) => sum + Number(g.valor), 0) || 0;
  const saldoMes = totalReceitas - totalGastos;

  const subcategoriasForCategoria = novoGasto.categoria_id ? getSubcategoriasAtivas(novoGasto.categoria_id) : [];
  const editSubcategorias = editValues.categoria_id ? getSubcategoriasAtivas(editValues.categoria_id) : [];

  const handleAddReceita = () => {
    if (!novaReceita.descricao || !novaReceita.valor) return;
    addReceita({ descricao: novaReceita.descricao, valor: parseFloat(novaReceita.valor) });
    setNovaReceita({ descricao: '', valor: '' });
  };

  const handleAddGasto = () => {
    if (!novoGasto.descricao || !novoGasto.valor || !novoGasto.categoria_id) return;
    addGasto({
      descricao: novoGasto.descricao,
      valor: parseFloat(novoGasto.valor),
      categoria_id: novoGasto.categoria_id,
      subcategoria_id: novoGasto.subcategoria_id || null,
    });
    setNovoGasto({ descricao: '', valor: '', categoria_id: '', subcategoria_id: '' });
  };

  const handleConverterAporte = () => {
    if (saldoMes > 0) {
      toast({
        title: 'Aporte manual sugerido',
        description: `Valor: ${formatCurrency(saldoMes, 'BRL')} | Origem: Financeiro Mensal - ${MESES[mes.mes - 1]} ${mes.ano}. Acesse a página de Movimentações para registrar o aporte.`,
      });
      navigate('/movimentacoes');
    }
  };

  // Group gastos by tipo > categoria
  const gastosByTipoCategoria = () => {
    if (!gastos || !tipos) return [];
    
    const grouped: Record<string, {
      tipoNome: string;
      tipoId: string;
      categorias: Record<string, {
        categoriaNome: string;
        categoriaId: string;
        gastos: typeof gastos;
      }>;
    }> = {};

    for (const g of gastos) {
      const cat = categoriasRaizAtivas.find(c => c.id === g.categoria_id);
      if (!cat) continue;
      const tipo = tipos.find(t => t.id === cat.tipo_id);
      const tipoKey = tipo?.id || 'sem_tipo';
      const tipoNome = tipo?.nome || 'Sem Tipo';

      if (!grouped[tipoKey]) {
        grouped[tipoKey] = { tipoNome, tipoId: tipoKey, categorias: {} };
      }
      if (!grouped[tipoKey].categorias[cat.id]) {
        grouped[tipoKey].categorias[cat.id] = { categoriaNome: cat.nome, categoriaId: cat.id, gastos: [] };
      }
      grouped[tipoKey].categorias[cat.id].gastos.push(g);
    }

    return Object.values(grouped);
  };

  const getCategoriaInfo = (categoriaId: string | null) => {
    if (!categoriaId) return null;
    return categoriasRaizAtivas.find(c => c.id === categoriaId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{MESES[mes.mes - 1]} {mes.ano}</h1>
            <p className="text-muted-foreground">Detalhes do mês</p>
          </div>
        </div>
        {saldoMes > 0 && (
          <Button variant="outline" size="sm" onClick={handleConverterAporte}>
            <ArrowRight className="h-4 w-4 mr-2" /> Converter saldo em aporte
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas, 'BRL')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" /> Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalGastos, 'BRL')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Saldo do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", saldoMes >= 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(saldoMes, 'BRL')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Limites por tipo */}
      {gastosTipoComLimites.length > 0 && (
        <TotaisPorTipoCardsComLimites gastosTipoComLimites={gastosTipoComLimites} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receitas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-600 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Receitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Descrição" value={novaReceita.descricao} onChange={(e) => setNovaReceita({ ...novaReceita, descricao: e.target.value })} className="flex-1" />
              <Input type="number" placeholder="Valor" value={novaReceita.valor} onChange={(e) => setNovaReceita({ ...novaReceita, valor: e.target.value })} className="w-28" step="0.01" />
              <Button size="icon" onClick={handleAddReceita}><Plus className="h-4 w-4" /></Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right w-28">Valor</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.descricao}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(Number(r.valor), 'BRL')}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteReceita(r.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!receitas?.length && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhuma receita</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Gastos - form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" /> Novo Gasto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Descrição" value={novoGasto.descricao} onChange={(e) => setNovoGasto({ ...novoGasto, descricao: e.target.value })} className="flex-1" />
              <Input type="number" placeholder="Valor" value={novoGasto.valor} onChange={(e) => setNovoGasto({ ...novoGasto, valor: e.target.value })} className="w-28" step="0.01" />
            </div>
            <div className="flex gap-2">
              <Select value={novoGasto.categoria_id} onValueChange={(v) => setNovoGasto({ ...novoGasto, categoria_id: v, subcategoria_id: '' })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categoriasRaizAtivas.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subcategoriasForCategoria.length > 0 && (
                <Select value={novoGasto.subcategoria_id} onValueChange={(v) => setNovoGasto({ ...novoGasto, subcategoria_id: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Subcategoria (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {subcategoriasForCategoria.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button size="icon" onClick={handleAddGasto} disabled={!novoGasto.categoria_id}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gastos organized by Tipo > Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Tipo &gt; Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !gastos?.length ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum gasto cadastrado neste mês.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {gastosByTipoCategoria().map((tipoGroup) => (
                <AccordionItem key={tipoGroup.tipoId} value={tipoGroup.tipoId}>
                  <AccordionTrigger className="text-base font-semibold">
                    {tipoGroup.tipoNome}
                    <Badge variant="secondary" className="ml-2">
                      {formatCurrency(
                        Object.values(tipoGroup.categorias).reduce((sum, cat) => sum + cat.gastos.reduce((s, g) => s + Number(g.valor), 0), 0),
                        'BRL'
                      )}
                    </Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Accordion type="multiple" className="w-full pl-4">
                      {Object.values(tipoGroup.categorias).map((catGroup) => (
                        <AccordionItem key={catGroup.categoriaId} value={catGroup.categoriaId}>
                          <AccordionTrigger className="text-sm">
                            <span className="flex items-center gap-2">
                              {catGroup.categoriaNome}
                              <Badge variant="outline" className="text-xs">
                                {formatCurrency(catGroup.gastos.reduce((s, g) => s + Number(g.valor), 0), 'BRL')}
                              </Badge>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Subcategoria</TableHead>
                                  <TableHead className="text-right w-28">Valor</TableHead>
                                  <TableHead className="w-16"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {catGroup.gastos.map((g) => {
                                  const subcat = g.subcategoria_id ? getSubcategoriasAtivas(catGroup.categoriaId).find(s => s.id === g.subcategoria_id) : null;
                                  return (
                                    <TableRow key={g.id}>
                                      <TableCell>{g.descricao}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{subcat?.nome || '—'}</TableCell>
                                      <TableCell className="text-right text-red-600">{formatCurrency(Number(g.valor), 'BRL')}</TableCell>
                                      <TableCell>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteGasto(g.id)}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
