import { useState } from 'react';
import { useAtivos } from '@/hooks/useAtivos';
import { usePlataformas } from '@/hooks/usePlataformas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CLASSE_LABELS, ClasseAtivo, Moeda } from '@/types/database';
import { Plus, Trash2 } from 'lucide-react';

export default function Cadastros() {
  const { ativos, isLoading: loadingAtivos, createAtivo, deleteAtivo } = useAtivos();
  const { plataformas, isLoading: loadingPlat, createPlataforma, deletePlataforma } = usePlataformas();
  const [openAtivo, setOpenAtivo] = useState(false);
  const [openPlat, setOpenPlat] = useState(false);
  const [formAtivo, setFormAtivo] = useState({ ticker: '', nome: '', classe: 'acoes_br' as ClasseAtivo, moeda_base: 'BRL' as Moeda });
  const [formPlat, setFormPlat] = useState('');

  const handleCreateAtivo = () => { if (formAtivo.ticker) { createAtivo(formAtivo); setOpenAtivo(false); setFormAtivo({ ticker: '', nome: '', classe: 'acoes_br', moeda_base: 'BRL' }); } };
  const handleCreatePlat = () => { if (formPlat) { createPlataforma(formPlat); setOpenPlat(false); setFormPlat(''); } };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Cadastros</h1>
      <Tabs defaultValue="ativos">
        <TabsList><TabsTrigger value="ativos">Ativos</TabsTrigger><TabsTrigger value="plataformas">Plataformas</TabsTrigger></TabsList>
        <TabsContent value="ativos" className="mt-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Ativos</CardTitle>
              <Button size="sm" onClick={() => setOpenAtivo(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
            </CardHeader>
            <CardContent>
              {loadingAtivos ? <p>Carregando...</p> : ativos.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum ativo cadastrado.</p> : (
                <Table><TableHeader><TableRow><TableHead>Ticker</TableHead><TableHead>Nome</TableHead><TableHead>Classe</TableHead><TableHead>Moeda</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>{ativos.map((a) => (<TableRow key={a.id}><TableCell className="font-medium font-mono">{a.ticker}</TableCell><TableCell>{a.nome || '-'}</TableCell><TableCell>{CLASSE_LABELS[a.classe]}</TableCell><TableCell>{a.moeda_base}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => deleteAtivo(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plataformas" className="mt-4">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Plataformas</CardTitle>
              <Button size="sm" onClick={() => setOpenPlat(true)}><Plus className="h-4 w-4 mr-2" />Nova</Button>
            </CardHeader>
            <CardContent>
              {loadingPlat ? <p>Carregando...</p> : plataformas.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma plataforma cadastrada.</p> : (
                <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>{plataformas.map((p) => (<TableRow key={p.id}><TableCell className="font-medium">{p.nome}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => deletePlataforma(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={openAtivo} onOpenChange={setOpenAtivo}>
        <DialogContent><DialogHeader><DialogTitle>Novo Ativo</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>Ticker</Label><Input value={formAtivo.ticker} onChange={(e) => setFormAtivo({...formAtivo, ticker: e.target.value.toUpperCase()})} placeholder="Ex: PETR4" /></div>
            <div><Label>Nome</Label><Input value={formAtivo.nome} onChange={(e) => setFormAtivo({...formAtivo, nome: e.target.value})} placeholder="Petrobras PN" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Classe</Label><Select value={formAtivo.classe} onValueChange={(v) => setFormAtivo({...formAtivo, classe: v as ClasseAtivo})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CLASSE_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Moeda</Label><Select value={formAtivo.moeda_base} onValueChange={(v) => setFormAtivo({...formAtivo, moeda_base: v as Moeda})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenAtivo(false)}>Cancelar</Button><Button onClick={handleCreateAtivo}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openPlat} onOpenChange={setOpenPlat}>
        <DialogContent><DialogHeader><DialogTitle>Nova Plataforma</DialogTitle></DialogHeader>
          <div><Label>Nome</Label><Input value={formPlat} onChange={(e) => setFormPlat(e.target.value)} placeholder="Ex: XP Investimentos" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenPlat(false)}>Cancelar</Button><Button onClick={handleCreatePlat}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
