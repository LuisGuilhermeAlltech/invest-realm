import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
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
    deleteReceita, deleteGasto,
  } = useFinanceiroDetalhe(id || null);

  const { categoriasAtivas, getSubcategoriasByTipo, createCategoria } = useCategoriasFinanceiras();
  const { tipos, tiposAtivos } = useTiposGasto();
  const { gastosTipoComLimites } = useGastosPorCategoriaComLimites(
    id || null,
    mes?.ano || new Date().getFullYear(),
    mes?.mes || new Date().getMonth() + 1
  );

  const [novaReceita, setNovaReceita] = useState({ descricao: '', valor: '' });
  
  // Gasto form state
  const [showGastoForm, setShowGastoForm] = useState(false);
  const [gastoFormTipoId, setGastoFormTipoId] = useState('');
  const [gastoFormCategoriaId, setGastoFormCategoriaId] = useState('');
  const [gastoFormDescricao, setGastoFormDescricao] = useState('');
  const [gastoFormValor, setGastoFormValor] = useState('');

  // New subcategoria form
  const [showSubForm, setShowSubForm] = useState(false);
  const [subFormTipoId, setSubFormTipoId] = useState('');
  const [subFormNome, setSubFormNome] = useState('');
  const [subFormLimite, setSubFormLimite] = useState('');

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

  const handleAddReceita = () => {
    if (!novaReceita.descricao || !novaReceita.valor) return;
    addReceita({ descricao: novaReceita.descricao, valor: parseFloat(novaReceita.valor) });
    setNovaReceita({ descricao: '', valor: '' });
  };

  const openGastoForm = (tipoId?: string, categoriaId?: string) => {
    setGastoFormTipoId(tipoId || '');
    setGastoFormCategoriaId(categoriaId || '');
    setGastoFormDescricao('');
    setGastoFormValor('');
    setShowGastoForm(true);
  };

  const handleAddGasto = () => {
    if (!gastoFormDescricao || !gastoFormValor || !gastoFormTipoId) return;
    addGasto({
      descricao: gastoFormDescricao,
      valor: parseFloat(gastoFormValor),
      tipo_id: gastoFormTipoId,
      categoria_id: gastoFormCategoriaId || null,
    });
    setShowGastoForm(false);
  };

  const openSubForm = (tipoId: string) => {
    setSubFormTipoId(tipoId);
    setSubFormNome('');
    setSubFormLimite('');
    setShowSubForm(true);
  };

  const handleAddSubcategoria = () => {
    if (!subFormNome.trim() || !subFormTipoId) return;
    createCategoria({
      nome: subFormNome.trim(),
      tipo_id: subFormTipoId,
      limite_mensal: parseFloat(subFormLimite) || 0,
      ativa: true,
    });
    setShowSubForm(false);
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

  // Group gastos by Macro (tipo), then by subcategoria within each macro
  const gastosByMacro = () => {
    if (!gastos || !tiposAtivos) return [];

    const grouped: Record<string, {
      tipoId: string;
      tipoNome: string;
      gastosDiretos: typeof gastos; // categoria_id is null
      subcategorias: Record<string, {
        categoriaId: string;
        categoriaNome: string;
        limiteMensal: number;
        gastos: typeof gastos;
      }>;
    }> = {};

    // Initialize with all active tipos
    for (const tipo of tiposAtivos) {
      grouped[tipo.id] = {
        tipoId: tipo.id,
        tipoNome: tipo.nome,
        gastosDiretos: [],
        subcategorias: {},
      };
    }

    for (const g of gastos) {
      const tipoId = g.tipo_id;
      if (!tipoId) continue;
      
      if (!grouped[tipoId]) {
        const tipo = tipos?.find(t => t.id === tipoId);
        grouped[tipoId] = {
          tipoId,
          tipoNome: tipo?.nome || 'Macro desconhecida',
          gastosDiretos: [],
          subcategorias: {},
        };
      }

      if (!g.categoria_id) {
        // Direct macro gasto
        grouped[tipoId].gastosDiretos.push(g);
      } else {
        // Subcategoria gasto
        if (!grouped[tipoId].subcategorias[g.categoria_id]) {
          const cat = categoriasAtivas.find(c => c.id === g.categoria_id);
          grouped[tipoId].subcategorias[g.categoria_id] = {
            categoriaId: g.categoria_id,
            categoriaNome: cat?.nome || 'Subcategoria',
            limiteMensal: cat?.limite_mensal || 0,
            gastos: [],
          };
        }
        grouped[tipoId].subcategorias[g.categoria_id].gastos.push(g);
      }
    }

    return Object.values(grouped).filter(g => 
      g.gastosDiretos.length > 0 || Object.keys(g.subcategorias).length > 0
    );
  };

  const getTotalMacro = (macro: ReturnType<typeof gastosByMacro>[0]) => {
    const diretos = macro.gastosDiretos.reduce((s, g) => s + Number(g.valor), 0);
    const subs = Object.values(macro.subcategorias).reduce(
      (s, sub) => s + sub.gastos.reduce((ss, g) => ss + Number(g.valor), 0), 0
    );
    return diretos + subs;
  };

  const subcategoriasForGastoForm = gastoFormTipoId ? getSubcategoriasByTipo(gastoFormTipoId) : [];

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

        {/* Quick gasto button */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" /> Novo Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => openGastoForm()} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Gasto
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Gastos organized by Macro */}
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoria Macro</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !gastos?.length ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum gasto cadastrado neste mês.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {gastosByMacro().map((macro) => (
                <AccordionItem key={macro.tipoId} value={macro.tipoId}>
                  <AccordionTrigger className="text-base font-semibold">
                    <span className="flex items-center gap-2">
                      {macro.tipoNome}
                      <Badge variant="secondary">
                        {formatCurrency(getTotalMacro(macro), 'BRL')}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pl-2">
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openGastoForm(macro.tipoId)}>
                        <Plus className="h-3 w-3 mr-1" /> Gasto em {macro.tipoNome}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openSubForm(macro.tipoId)}>
                        <Plus className="h-3 w-3 mr-1" /> Subcategoria
                      </Button>
                    </div>

                    {/* Direct gastos (sem subcategoria) */}
                    {macro.gastosDiretos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Gastos diretos (sem subcategoria)</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="text-right w-28">Valor</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {macro.gastosDiretos.map((g) => (
                              <TableRow key={g.id}>
                                <TableCell>{g.descricao}</TableCell>
                                <TableCell className="text-right text-red-600">{formatCurrency(Number(g.valor), 'BRL')}</TableCell>
                                <TableCell>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteGasto(g.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Subcategorias */}
                    {Object.values(macro.subcategorias).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Subcategorias</h4>
                        <Accordion type="multiple" className="w-full">
                          {Object.values(macro.subcategorias).map((sub) => {
                            const totalSub = sub.gastos.reduce((s, g) => s + Number(g.valor), 0);
                            return (
                              <AccordionItem key={sub.categoriaId} value={sub.categoriaId}>
                                <AccordionTrigger className="text-sm">
                                  <span className="flex items-center gap-2">
                                    {sub.categoriaNome}
                                    <Badge variant="outline" className="text-xs">
                                      {formatCurrency(totalSub, 'BRL')}
                                    </Badge>
                                    {sub.limiteMensal > 0 && (
                                      <Badge variant="secondary" className="text-xs">
                                        Limite: {formatCurrency(sub.limiteMensal, 'BRL')}
                                      </Badge>
                                    )}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="mb-2">
                                    <Button variant="ghost" size="sm" onClick={() => openGastoForm(macro.tipoId, sub.categoriaId)}>
                                      <Plus className="h-3 w-3 mr-1" /> Gasto em {sub.categoriaNome}
                                    </Button>
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
                                      {sub.gastos.map((g) => (
                                        <TableRow key={g.id}>
                                          <TableCell>{g.descricao}</TableCell>
                                          <TableCell className="text-right text-red-600">{formatCurrency(Number(g.valor), 'BRL')}</TableCell>
                                          <TableCell>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteGasto(g.id)}>
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Novo gasto */}
      <Dialog open={showGastoForm} onOpenChange={(o) => !o && setShowGastoForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Categoria Macro *</Label>
              <Select value={gastoFormTipoId} onValueChange={(v) => { setGastoFormTipoId(v); setGastoFormCategoriaId(''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a macro" /></SelectTrigger>
                <SelectContent>
                  {tiposAtivos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {gastoFormTipoId && subcategoriasForGastoForm.length > 0 && (
              <div className="space-y-2">
                <Label>Subcategoria (opcional)</Label>
                <Select value={gastoFormCategoriaId} onValueChange={setGastoFormCategoriaId}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma (gasto direto)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (gasto direto)</SelectItem>
                    {subcategoriasForGastoForm.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={gastoFormDescricao} onChange={(e) => setGastoFormDescricao(e.target.value)} placeholder="Descrição do gasto" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input type="number" value={gastoFormValor} onChange={(e) => setGastoFormValor(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <Button onClick={handleAddGasto} className="w-full" disabled={!gastoFormTipoId || !gastoFormDescricao || !gastoFormValor}>
              Adicionar Gasto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova subcategoria */}
      <Dialog open={showSubForm} onOpenChange={(o) => !o && setShowSubForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Subcategoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">Macro:</p>
              <p className="font-medium">{tiposAtivos.find(t => t.id === subFormTipoId)?.nome}</p>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={subFormNome} onChange={(e) => setSubFormNome(e.target.value)} placeholder="Ex: Parcela do carro" />
            </div>
            <div className="space-y-2">
              <Label>Limite Mensal (R$, opcional)</Label>
              <Input type="number" value={subFormLimite} onChange={(e) => setSubFormLimite(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <Button onClick={handleAddSubcategoria} className="w-full" disabled={!subFormNome.trim()}>
              Criar Subcategoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
