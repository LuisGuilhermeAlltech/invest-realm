import { useState } from 'react';
import { useCarteira } from '@/hooks/useCarteira';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';
import { CLASSE_LABELS, ClasseAtivo, CarteiraAtual, Moeda } from '@/types/database';
import { RefreshCw, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function Carteira() {
  const { carteira, isLoading, updatePreco } = useCarteira();
  const [editingAtivo, setEditingAtivo] = useState<CarteiraAtual | null>(null);
  const [novoPreco, setNovoPreco] = useState('');
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Carteira</h1>
        <Button variant="outline" size="sm" onClick={() => toast({ title: 'Em breve', description: 'Atualização automática de preços será implementada.' })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar Preços
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-lg">Posição por Ativo</CardTitle></CardHeader>
        <CardContent>
          {carteira.length === 0 ? (
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
                  {carteira.filter(a => a.quantidade_total > 0).map((ativo) => (
                    <TableRow key={ativo.ativo_id}>
                      <TableCell className="font-medium">{ativo.ticker}</TableCell>
                      <TableCell className="text-muted-foreground">{CLASSE_LABELS[ativo.classe as ClasseAtivo]}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(ativo.quantidade_total, 4)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(ativo.preco_medio, ativo.moeda_base as Moeda)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(ativo.preco_atual, ativo.moeda_base as Moeda)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(ativo.valor_atual, ativo.moeda_base as Moeda)}</TableCell>
                      <TableCell className={cn('text-right font-mono', ativo.lucro_prejuizo >= 0 ? 'text-positive' : 'text-negative')}>
                        {formatCurrency(ativo.lucro_prejuizo, ativo.moeda_base as Moeda)}
                      </TableCell>
                      <TableCell className={cn('text-right font-mono', ativo.lucro_prejuizo_pct >= 0 ? 'text-positive' : 'text-negative')}>
                        {formatPercent(ativo.lucro_prejuizo_pct)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingAtivo(ativo); setNovoPreco(ativo.preco_atual?.toString() || ''); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
    </div>
  );
}
