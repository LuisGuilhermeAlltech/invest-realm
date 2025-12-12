import { useState } from 'react';
import { useProventos } from '@/hooks/useProventos';
import { useAtivos } from '@/hooks/useAtivos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { TIPO_PROVENTO_LABELS, TipoProvento, Moeda } from '@/types/database';
import { Plus, Trash2 } from 'lucide-react';

export default function Proventos() {
  const { proventos, isLoading, createProvento, deleteProvento } = useProventos();
  const { ativos } = useAtivos();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ data: '', ativo_id: '', tipo: 'dividendo' as TipoProvento, valor: '', moeda: 'BRL' as Moeda, observacao: '' });

  const handleSubmit = () => {
    if (!form.data || !form.ativo_id || !form.valor) return;
    createProvento({ ...form, valor: parseFloat(form.valor) });
    setOpen(false);
    setForm({ data: '', ativo_id: '', tipo: 'dividendo', valor: '', moeda: 'BRL', observacao: '' });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Proventos</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Provento</Button>
      </div>
      <Card className="border-border">
        <CardHeader><CardTitle className="text-lg">Histórico</CardTitle></CardHeader>
        <CardContent>
          {proventos.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum provento registrado.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Ativo</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {proventos.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.data)}</TableCell>
                    <TableCell className="font-medium">{p.ativos?.ticker}</TableCell>
                    <TableCell>{TIPO_PROVENTO_LABELS[p.tipo as TipoProvento]}</TableCell>
                    <TableCell className="text-right font-mono text-positive">{formatCurrency(p.valor, p.moeda)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deleteProvento(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Provento</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({...form, data: e.target.value})} /></div>
              <div><Label>Tipo</Label><Select value={form.tipo} onValueChange={(v) => setForm({...form, tipo: v as TipoProvento})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TIPO_PROVENTO_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Ativo</Label><Select value={form.ativo_id} onValueChange={(v) => setForm({...form, ativo_id: v})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{ativos.map((a) => <SelectItem key={a.id} value={a.id}>{a.ticker}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({...form, valor: e.target.value})} /></div>
              <div><Label>Moeda</Label><Select value={form.moeda} onValueChange={(v) => setForm({...form, moeda: v as Moeda})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSubmit}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
