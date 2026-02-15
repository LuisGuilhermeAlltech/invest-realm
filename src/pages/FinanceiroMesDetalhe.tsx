import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Wallet, ArrowRight, ChevronDown } from 'lucide-react';
import { useFinanceiroMensal, useFinanceiroDetalhe } from '@/hooks/useFinanceiroMensal';
import { useCategoriasFinanceiras } from '@/hooks/useCategoriasFinanceiras';
import { useTiposGasto } from '@/hooks/useTiposGasto';
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

  const [novaReceita, setNovaReceita] = useState({ descricao: '', valor: '' });
  
  // Gasto sheet state
  const [showGastoSheet, setShowGastoSheet] = useState(false);
  const [gastoFormTipoId, setGastoFormTipoId] = useState('');
  const [gastoFormCategoriaId, setGastoFormCategoriaId] = useState('');
  const [gastoFormDescricao, setGastoFormDescricao] = useState('');
  const [gastoFormValor, setGastoFormValor] = useState('');

  // Subcategoria dialog state
  const [showSubDialog, setShowSubDialog] = useState(false);
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

  const openGastoSheet = (tipoId?: string, categoriaId?: string) => {
    setGastoFormTipoId(tipoId || '');
    setGastoFormCategoriaId(categoriaId || '');
    setGastoFormDescricao('');
    setGastoFormValor('');
    setShowGastoSheet(true);
  };

  const handleAddGasto = () => {
    if (!gastoFormDescricao || !gastoFormValor || !gastoFormTipoId) return;
    addGasto({
      descricao: gastoFormDescricao,
      valor: parseFloat(gastoFormValor),
      tipo_id: gastoFormTipoId,
      categoria_id: gastoFormCategoriaId || null,
    });
    setShowGastoSheet(false);
  };

  const openSubDialog = (tipoId?: string) => {
    setSubFormTipoId(tipoId || '');
    setSubFormNome('');
    setSubFormLimite('');
    setShowSubDialog(true);
  };

  const handleAddSubcategoria = () => {
    if (!subFormNome.trim() || !subFormTipoId) return;
    createCategoria({
      nome: subFormNome.trim(),
      tipo_id: subFormTipoId,
      limite_mensal: parseFloat(subFormLimite) || 0,
      ativa: true,
    });
    setShowSubDialog(false);
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

  // Group gastos by Macro
  const gastosByMacro = () => {
    if (!gastos || !tiposAtivos) return [];

    const grouped: Record<string, {
      tipoId: string;
      tipoNome: string;
      gastosDiretos: typeof gastos;
      subcategorias: Record<string, {
        categoriaId: string;
        categoriaNome: string;
        limiteMensal: number;
        gastos: typeof gastos;
      }>;
    }> = {};

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
        grouped[tipoId].gastosDiretos.push(g);
      } else {
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

  const getLancamentosCount = (macro: ReturnType<typeof gastosByMacro>[0]) => {
    return macro.gastosDiretos.length + Object.values(macro.subcategorias).reduce((s, sub) => s + sub.gastos.length, 0);
  };

  const subcategoriasForGastoForm = gastoFormTipoId ? getSubcategoriasByTipo(gastoFormTipoId) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/financeiro')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">{MESES[mes.mes - 1]} {mes.ano}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saldoMes > 0 && (
            <Button variant="ghost" size="sm" onClick={handleConverterAporte}>
              <ArrowRight className="h-4 w-4 mr-1" /> Aporte
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => openSubDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Subcategoria
          </Button>
          <Button size="sm" onClick={() => openGastoSheet()}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar gasto
          </Button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Receitas</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(totalReceitas, 'BRL')}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Gastos</p>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(totalGastos, 'BRL')}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo</p>
          <p className={cn("text-lg font-semibold", saldoMes >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(saldoMes, 'BRL')}
          </p>
        </div>
      </div>

      {/* Receitas section - compact */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full group">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            <TrendingUp className="h-4 w-4 text-green-500" />
            Receitas ({receitas?.length || 0})
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Descrição" value={novaReceita.descricao} onChange={(e) => setNovaReceita({ ...novaReceita, descricao: e.target.value })} className="flex-1 h-9" />
              <Input type="number" placeholder="Valor" value={novaReceita.valor} onChange={(e) => setNovaReceita({ ...novaReceita, valor: e.target.value })} className="w-28 h-9" step="0.01" />
              <Button size="sm" onClick={handleAddReceita}><Plus className="h-4 w-4" /></Button>
            </div>
            {receitas?.length ? (
              <div className="space-y-1">
                {receitas.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group">
                    <span className="text-sm">{r.descricao}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600">{formatCurrency(Number(r.valor), 'BRL')}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteReceita(r.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">Nenhuma receita</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Gastos by Macro - clean accordion */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : !gastos?.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum gasto cadastrado neste mês.
        </div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-1">
          {gastosByMacro().map((macro) => {
            const total = getTotalMacro(macro);
            const count = getLancamentosCount(macro);
            return (
              <AccordionItem key={macro.tipoId} value={macro.tipoId} className="border rounded-lg px-3">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{macro.tipoNome}</span>
                    <Badge variant="secondary" className="font-normal text-xs">
                      {formatCurrency(total, 'BRL')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{count} lançamento{count !== 1 ? 's' : ''}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="space-y-3">
                    {/* Quick action */}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openGastoSheet(macro.tipoId)}>
                      <Plus className="h-3 w-3 mr-1" /> Gasto em {macro.tipoNome}
                    </Button>

                    {/* Direct gastos */}
                    {macro.gastosDiretos.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Diretos</p>
                        <div className="space-y-0.5">
                          {macro.gastosDiretos.map((g) => (
                            <div key={g.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group">
                              <span className="text-sm">{g.descricao}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-red-600">{formatCurrency(Number(g.valor), 'BRL')}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteGasto(g.id)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subcategorias - collapsible inline */}
                    {Object.values(macro.subcategorias).map((sub) => {
                      const totalSub = sub.gastos.reduce((s, g) => s + Number(g.valor), 0);
                      return (
                        <Collapsible key={sub.categoriaId}>
                          <div className="flex items-center justify-between">
                            <CollapsibleTrigger asChild>
                              <button className="flex items-center gap-2 text-sm hover:text-foreground transition-colors group py-1">
                                <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                                <span className="font-medium">{sub.categoriaNome}</span>
                                <span className="text-xs text-muted-foreground">{formatCurrency(totalSub, 'BRL')}</span>
                                {sub.limiteMensal > 0 && (
                                  <span className={cn(
                                    "text-xs",
                                    totalSub > sub.limiteMensal ? "text-red-500" : "text-muted-foreground"
                                  )}>
                                    / {formatCurrency(sub.limiteMensal, 'BRL')}
                                  </span>
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => openGastoSheet(macro.tipoId, sub.categoriaId)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <CollapsibleContent>
                            <div className="ml-5 space-y-0.5 pt-1">
                              {sub.gastos.map((g) => (
                                <div key={g.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group">
                                  <span className="text-sm">{g.descricao}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-red-600">{formatCurrency(Number(g.valor), 'BRL')}</span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteGasto(g.id)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Sheet: Novo gasto */}
      <Sheet open={showGastoSheet} onOpenChange={setShowGastoSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Novo Gasto</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={gastoFormDescricao} onChange={(e) => setGastoFormDescricao(e.target.value)} placeholder="Descrição do gasto" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" value={gastoFormValor} onChange={(e) => setGastoFormValor(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Macro</Label>
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
                <Label>Subcategoria</Label>
                <Select value={gastoFormCategoriaId} onValueChange={setGastoFormCategoriaId}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {subcategoriasForGastoForm.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowGastoSheet(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleAddGasto} disabled={!gastoFormTipoId || !gastoFormDescricao || !gastoFormValor}>
                Salvar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog: Nova subcategoria */}
      <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Subcategoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Macro</Label>
              <Select value={subFormTipoId} onValueChange={setSubFormTipoId}>
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
              <Input value={subFormNome} onChange={(e) => setSubFormNome(e.target.value)} placeholder="Ex: Carro, Farmácia" />
            </div>
            <div className="space-y-2">
              <Label>Limite mensal (opcional)</Label>
              <Input type="number" value={subFormLimite} onChange={(e) => setSubFormLimite(e.target.value)} placeholder="0,00" step="0.01" />
            </div>
            <Button onClick={handleAddSubcategoria} className="w-full" disabled={!subFormNome.trim() || !subFormTipoId}>
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
