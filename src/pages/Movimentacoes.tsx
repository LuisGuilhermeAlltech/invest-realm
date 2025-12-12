import { useState } from 'react';
import { useMovimentacoes } from '@/hooks/useMovimentacoes';
import { useAtivos } from '@/hooks/useAtivos';
import { usePlataformas } from '@/hooks/usePlataformas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters';
import { TIPO_MOVIMENTACAO_LABELS, TipoMovimentacao, Moeda } from '@/types/database';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface FormState {
  id?: string;
  data: string;
  ativo_id: string;
  plataforma_id: string;
  tipo: TipoMovimentacao;
  quantidade: string;
  preco_unitario: string;
  moeda: Moeda;
  taxas: string;
  observacao: string;
}

const emptyForm: FormState = {
  data: '',
  ativo_id: '',
  plataforma_id: '',
  tipo: 'compra',
  quantidade: '',
  preco_unitario: '',
  moeda: 'BRL',
  taxas: '',
  observacao: '',
};

export default function Movimentacoes() {
  const { movimentacoes, isLoading, createMovimentacao, updateMovimentacao, deleteMovimentacao } = useMovimentacoes();
  const { ativos } = useAtivos();
  const { plataformas } = usePlataformas();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const handleOpenNew = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setOpen(true);
  };

  const handleOpenEdit = (mov: any) => {
    setForm({
      id: mov.id,
      data: mov.data,
      ativo_id: mov.ativo_id,
      plataforma_id: mov.plataforma_id || '',
      tipo: mov.tipo,
      quantidade: mov.quantidade.toString(),
      preco_unitario: mov.preco_unitario.toString(),
      moeda: mov.moeda,
      taxas: mov.taxas?.toString() || '',
      observacao: mov.observacao || '',
    });
    setIsEditing(true);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.data || !form.ativo_id || !form.quantidade || !form.preco_unitario) return;
    
    const payload = {
      data: form.data,
      ativo_id: form.ativo_id,
      plataforma_id: form.plataforma_id || undefined,
      tipo: form.tipo,
      quantidade: parseFloat(form.quantidade),
      preco_unitario: parseFloat(form.preco_unitario),
      moeda: form.moeda,
      taxas: form.taxas ? parseFloat(form.taxas) : 0,
      observacao: form.observacao || undefined,
    };

    if (isEditing && form.id) {
      updateMovimentacao({ id: form.id, ...payload });
    } else {
      createMovimentacao(payload);
    }
    
    setOpen(false);
    setForm(emptyForm);
    setIsEditing(false);
  };

  const handleClose = () => {
    setOpen(false);
    setForm(emptyForm);
    setIsEditing(false);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Movimentações</h1>
        <Button onClick={handleOpenNew}><Plus className="h-4 w-4 mr-2" />Nova Movimentação</Button>
      </div>
      <Card className="border-border">
        <CardHeader><CardTitle className="text-lg">Histórico</CardTitle></CardHeader>
        <CardContent>
          {movimentacoes.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma movimentação registrada.</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.data)}</TableCell>
                      <TableCell className="font-medium">{m.ativos?.ticker}</TableCell>
                      <TableCell>{TIPO_MOVIMENTACAO_LABELS[m.tipo as TipoMovimentacao]}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(m.quantidade, 4)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(m.preco_unitario, m.moeda)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(m.quantidade * m.preco_unitario, m.moeda)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(m)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMovimentacao(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Movimentação' : 'Nova Movimentação'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({...form, data: e.target.value})} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({...form, tipo: v as TipoMovimentacao})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_MOVIMENTACAO_LABELS).map(([k,v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Ativo</Label>
              <Select value={form.ativo_id} onValueChange={(v) => setForm({...form, ativo_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {ativos.map((a) => <SelectItem key={a.id} value={a.id}>{a.ticker}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantidade</Label>
                <Input type="number" step="0.0001" value={form.quantidade} onChange={(e) => setForm({...form, quantidade: e.target.value})} />
              </div>
              <div>
                <Label>Preço Unitário</Label>
                <Input type="number" step="0.01" value={form.preco_unitario} onChange={(e) => setForm({...form, preco_unitario: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Moeda</Label>
                <Select value={form.moeda} onValueChange={(v) => setForm({...form, moeda: v as Moeda})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Taxas</Label>
                <Input type="number" step="0.01" value={form.taxas} onChange={(e) => setForm({...form, taxas: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit}>{isEditing ? 'Atualizar' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
