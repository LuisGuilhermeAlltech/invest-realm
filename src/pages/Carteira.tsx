import { useState } from 'react';
import { useCarteira } from '@/hooks/useCarteira';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';
import { CLASSE_LABELS, ClasseAtivo, CarteiraAtual, Moeda } from '@/types/database';
import { RefreshCw, Edit2, Info, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [editingAtivo, setEditingAtivo] = useState<CarteiraAtual | null>(null);
  const [novoPreco, setNovoPreco] = useState('');
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const { toast } = useToast();

  const handleSavePreco = () => {
    if (!editingAtivo || !novoPreco) return;
    updatePreco({
      ativo_id: editingAtivo.ativo_id,
      preco_atual: parseFloat(novoPreco),
      moeda: editingAtivo.moeda_base as Moeda,
    });
    setEditingAtivo(null);
    setNovoPreco('');
  };

  const handleUpdatePrices = async () => {
    setIsUpdatingPrices(true);
    setUpdateResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('update-prices');
      
      if (error) throw error;
      
      const detalhes: UpdateResult[] = data.detalhes || [];
      setUpdateResults(detalhes);
      
      const successCount = detalhes.filter(d => d.success).length;
      const failCount = detalhes.filter(d => !d.success).length;
      
      if (successCount > 0 && failCount === 0) {
        toast({ 
          title: 'Preços atualizados!', 
          description: `${successCount} ativo(s) atualizado(s) com sucesso.` 
        });
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;
  }

  const ativosComPosicao = carteira.filter(a => a.quantidade_total > 0);

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
        <CardHeader><CardTitle className="text-lg">Posição por Ativo</CardTitle></CardHeader>
        <CardContent>
          {ativosComPosicao.length === 0 ? (
            <p className="text-muted-foreground text-sm">Cadastre ativos e movimentações para ver sua carteira.</p>
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ativosComPosicao.map((ativo) => {
                    const temPreco = hasValidPrice(ativo);
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
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingAtivo(ativo); setNovoPreco(ativo.preco_atual?.toString() || ''); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
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

      <Dialog open={!!editingAtivo} onOpenChange={() => setEditingAtivo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Preço - {editingAtivo?.ticker}</DialogTitle></DialogHeader>
          <Input type="number" step="0.01" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} placeholder="Novo preço" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAtivo(null)}>Cancelar</Button>
            <Button onClick={handleSavePreco}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    result.success ? "bg-positive/10 border-positive/20" : "bg-destructive/10 border-destructive/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-positive mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    )}
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
                      {result.success ? (
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
