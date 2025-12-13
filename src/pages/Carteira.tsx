import { useState, useEffect, useMemo } from 'react';
import { useCarteira } from '@/hooks/useCarteira';
import { useCapitalLiquido } from '@/hooks/useCapitalLiquido';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';
import { CLASSE_LABELS, ClasseAtivo, CarteiraAtual, Moeda } from '@/types/database';
import { RefreshCw, Edit2, Info, Loader2, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

const STORAGE_KEY = 'carteira-filtro-classe';

interface UpdateResult {
  ticker: string;
  ticker_normalizado: string;
  classe: string;
  provider: string;
  success: boolean;
  preco?: number;
  error?: string;
}

export default function Carteira() {
  const { carteira, isLoading, updatePreco, refetch } = useCarteira();
  const { porAtivo: cliPorAtivo, isLoading: cliLoading } = useCapitalLiquido();
  const [editingAtivo, setEditingAtivo] = useState<CarteiraAtual | null>(null);
  const [novoPreco, setNovoPreco] = useState('');
  const [dataPreco, setDataPreco] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [isRendaFixaModal, setIsRendaFixaModal] = useState(false);
  const [filtroClasse, setFiltroClasse] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || 'todas';
  });
  const { toast } = useToast();

  // Persist filter to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, filtroClasse);
  }, [filtroClasse]);

  const handleSavePreco = () => {
    if (!editingAtivo || !novoPreco) return;
    updatePreco({
      ativo_id: editingAtivo.ativo_id,
      preco_atual: parseFloat(novoPreco),
      moeda: editingAtivo.moeda_base as Moeda,
    });
    setEditingAtivo(null);
    setNovoPreco('');
    setIsRendaFixaModal(false);
  };

  const openRendaFixaModal = (ativo: CarteiraAtual) => {
    setEditingAtivo(ativo);
    setNovoPreco(ativo.preco_atual?.toString() || '');
    setDataPreco(format(new Date(), 'yyyy-MM-dd'));
    setIsRendaFixaModal(true);
  };

  const openEditModal = (ativo: CarteiraAtual) => {
    setEditingAtivo(ativo);
    setNovoPreco(ativo.preco_atual?.toString() || '');
    setIsRendaFixaModal(false);
  };

  const handleUpdatePrices = async () => {
    setIsUpdatingPrices(true);
    setUpdateResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('update-prices');
      
      if (error) throw error;
      
      const detalhes: UpdateResult[] = data.detalhes || [];
      setUpdateResults(detalhes);
      
      // Separar resultados: sucesso, falhas reais, e manuais
      const successCount = detalhes.filter(d => d.success).length;
      const manualCount = detalhes.filter(d => d.provider === 'manual').length;
      const failCount = detalhes.filter(d => !d.success && d.provider !== 'manual').length;
      
      if (successCount > 0 && failCount === 0) {
        const manualNote = manualCount > 0 ? ` (${manualCount} manual)` : '';
        toast({ 
          title: 'Preços atualizados!', 
          description: `${successCount} ativo(s) atualizado(s) com sucesso.${manualNote}` 
        });
        if (manualCount > 0) {
          setShowResultsModal(true);
        }
      } else if (successCount > 0 && failCount > 0) {
        toast({ 
          title: `${successCount} atualizado(s), ${failCount} falha(s)`, 
          description: 'Clique em "Ver detalhes" para mais informações.',
        });
        setShowResultsModal(true);
      } else if (failCount > 0) {
        toast({ 
          title: 'Nenhum ativo atualizado', 
          description: 'Clique em "Ver detalhes" para ver os erros.',
          variant: 'destructive'
        });
        setShowResultsModal(true);
      } else if (manualCount > 0 && successCount === 0 && failCount === 0) {
        toast({ 
          title: 'Ativos manuais', 
          description: `${manualCount} ativo(s) requer(em) atualização manual.`
        });
        setShowResultsModal(true);
      }
      
      refetch();
    } catch (error) {
      console.error('Error updating prices:', error);
      toast({ 
        title: 'Erro ao atualizar preços', 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive' 
      });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const hasValidPrice = (ativo: CarteiraAtual) => {
    return ativo.preco_atual !== null && ativo.preco_atual !== undefined && ativo.preco_atual > 0;
  };

  const isRendaFixa = (classe: string) => classe === 'renda_fixa';

  const getResultStyle = (result: UpdateResult) => {
    if (result.provider === 'manual') {
      return "bg-muted/50 border-border";
    }
    return result.success 
      ? "bg-positive/10 border-positive/20" 
      : "bg-destructive/10 border-destructive/20";
  };

  const getResultIcon = (result: UpdateResult) => {
    if (result.provider === 'manual') {
      return <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />;
    }
    return result.success 
      ? <CheckCircle2 className="h-5 w-5 text-positive mt-0.5" />
      : <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />;
  };

  if (isLoading || cliLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;
  }

  // Helper to get CLI data for an asset
  const getCliData = (ativoId: string) => {
    return cliPorAtivo.find(c => c.ativo_id === ativoId);
  };

  const ativosComPosicao = carteira.filter(a => a.quantidade_total > 0);

  // Count assets per class
  const contagemPorClasse = useMemo(() => {
    const contagem: Record<string, number> = {};
    ativosComPosicao.forEach(a => {
      contagem[a.classe] = (contagem[a.classe] || 0) + 1;
    });
    return contagem;
  }, [ativosComPosicao]);

  // Filter assets by selected class
  const ativosFiltrados = useMemo(() => {
    if (filtroClasse === 'todas') return ativosComPosicao;
    return ativosComPosicao.filter(a => a.classe === filtroClasse);
  }, [ativosComPosicao, filtroClasse]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Carteira</h1>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">Os valores iniciais foram cadastrados como saldo histórico consolidado. O controle detalhado de compras passa a valer a partir da data de início do sistema.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          {updateResults.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowResultsModal(true)}
              className="text-muted-foreground"
            >
              Ver detalhes
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleUpdatePrices}
            disabled={isUpdatingPrices}
          >
            {isUpdatingPrices ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar Preços
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Posição por Ativo</CardTitle>
          <Select value={filtroClasse} onValueChange={setFiltroClasse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">
                Todas ({ativosComPosicao.length})
              </SelectItem>
              {Object.entries(CLASSE_LABELS).map(([key, label]) => {
                const count = contagemPorClasse[key] || 0;
                if (count === 0) return null;
                return (
                  <SelectItem key={key} value={key}>
                    {label} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {ativosComPosicao.length === 0 ? (
            <p className="text-muted-foreground text-sm">Cadastre ativos e movimentações para ver sua carteira.</p>
          ) : ativosFiltrados.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum ativo nesta categoria.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">PM</TableHead>
                    <TableHead className="text-right">Preço Atual</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-right">P/L R$</TableHead>
                    <TableHead className="text-right">P/L %</TableHead>
                    <TableHead className="text-right">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">CLI (BRL)</TooltipTrigger>
                        <TooltipContent><p>Capital Líquido Investido = Aportes − Proventos</p></TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-right">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">% Recup.</TooltipTrigger>
                        <TooltipContent><p>Proventos / Aportes</p></TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ativosFiltrados.map((ativo) => {
                    const temPreco = hasValidPrice(ativo);
                    const ehRendaFixa = isRendaFixa(ativo.classe);
                    const cli = getCliData(ativo.ativo_id);
                    return (
                      <TableRow key={ativo.ativo_id}>
                        <TableCell className="font-medium">{ativo.ticker}</TableCell>
                        <TableCell className="text-muted-foreground">{CLASSE_LABELS[ativo.classe as ClasseAtivo]}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(ativo.quantidade_total, 4)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(ativo.preco_medio, ativo.moeda_base as Moeda)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {temPreco ? formatCurrency(ativo.preco_atual, ativo.moeda_base as Moeda) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {temPreco ? formatCurrency(ativo.valor_atual, ativo.moeda_base as Moeda) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-right font-mono', temPreco && ativo.lucro_prejuizo >= 0 ? 'text-positive' : temPreco && ativo.lucro_prejuizo < 0 ? 'text-negative' : '')}>
                          {temPreco ? formatCurrency(ativo.lucro_prejuizo, ativo.moeda_base as Moeda) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-right font-mono', temPreco && ativo.lucro_prejuizo_pct >= 0 ? 'text-positive' : temPreco && ativo.lucro_prejuizo_pct < 0 ? 'text-negative' : '')}>
                          {temPreco ? formatPercent(ativo.lucro_prejuizo_pct) : '—'}
                        </TableCell>
                        <TableCell className={cn('text-right font-mono', cli && cli.cli_brl < 0 && 'text-positive')}>
                          {cli ? formatCurrency(cli.cli_brl) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {cli && cli.pct_recuperado !== null ? formatPercent(cli.pct_recuperado) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {ehRendaFixa ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => openRendaFixaModal(ativo)}
                                    className="text-xs"
                                  >
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Atualizar valor
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Renda Fixa: atualização manual do valor</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => openEditModal(ativo)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para edição simples de preço (não-renda fixa) */}
      <Dialog open={!!editingAtivo && !isRendaFixaModal} onOpenChange={() => setEditingAtivo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Preço - {editingAtivo?.ticker}</DialogTitle></DialogHeader>
          <Input type="number" step="0.01" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} placeholder="Novo preço" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAtivo(null)}>Cancelar</Button>
            <Button onClick={handleSavePreco}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Renda Fixa */}
      <Dialog open={!!editingAtivo && isRendaFixaModal} onOpenChange={() => { setEditingAtivo(null); setIsRendaFixaModal(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Valor - {editingAtivo?.ticker}</DialogTitle>
            <DialogDescription>
              Informe o preço unitário atual do título de Renda Fixa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dataPreco">Data de Referência</Label>
              <Input 
                id="dataPreco"
                type="date" 
                value={dataPreco} 
                onChange={(e) => setDataPreco(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precoUnitario">Preço Unitário Atual (R$)</Label>
              <Input 
                id="precoUnitario"
                type="number" 
                step="0.01" 
                value={novoPreco} 
                onChange={(e) => setNovoPreco(e.target.value)} 
                placeholder="Ex: 850.50" 
              />
            </div>
            {editingAtivo && novoPreco && (
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><span className="text-muted-foreground">Quantidade:</span> {formatNumber(editingAtivo.quantidade_total, 4)}</p>
                <p><span className="text-muted-foreground">Valor Atual Calculado:</span> {formatCurrency(editingAtivo.quantidade_total * parseFloat(novoPreco || '0'), editingAtivo.moeda_base as Moeda)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingAtivo(null); setIsRendaFixaModal(false); }}>Cancelar</Button>
            <Button onClick={handleSavePreco}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de resultados da atualização */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultado da Atualização de Preços</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {updateResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex items-start justify-between p-3 rounded-lg border",
                    getResultStyle(result)
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getResultIcon(result)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.ticker}</span>
                        <Badge variant="outline" className="text-xs">
                          {CLASSE_LABELS[result.classe as ClasseAtivo] || result.classe}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {result.provider}
                        </Badge>
                      </div>
                      {result.ticker !== result.ticker_normalizado && (
                        <p className="text-xs text-muted-foreground">
                          Ticker normalizado: {result.ticker_normalizado}
                        </p>
                      )}
                      {result.provider === 'manual' ? (
                        <p className="text-sm text-muted-foreground">{result.error || 'Atualize manualmente na tabela'}</p>
                      ) : result.success ? (
                        <p className="text-sm text-positive">
                          Preço atualizado: {formatCurrency(result.preco || 0, 'BRL')}
                        </p>
                      ) : (
                        <p className="text-sm text-destructive">{result.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowResultsModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
