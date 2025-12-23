import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Check, X, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { FinanceiroMensal, useFinanceiroDetalhe } from '@/hooks/useFinanceiroMensal';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface FinanceiroDetalheModalProps {
  mes: FinanceiroMensal | undefined;
  open: boolean;
  onClose: () => void;
}

export default function FinanceiroDetalheModal({ mes, open, onClose }: FinanceiroDetalheModalProps) {
  const {
    receitas,
    gastos,
    isLoading,
    addReceita,
    addGasto,
    updateReceita,
    updateGasto,
    deleteReceita,
    deleteGasto,
  } = useFinanceiroDetalhe(mes?.id || null);

  const [novaReceita, setNovaReceita] = useState({ descricao: '', valor: '' });
  const [novoGasto, setNovoGasto] = useState({ descricao: '', valor: '' });
  const [editingReceita, setEditingReceita] = useState<string | null>(null);
  const [editingGasto, setEditingGasto] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ descricao: '', valor: '' });

  if (!mes) return null;

  const totalReceitas = receitas?.reduce((sum, r) => sum + Number(r.valor), 0) || 0;
  const totalGastos = gastos?.reduce((sum, g) => sum + Number(g.valor), 0) || 0;
  const saldoMes = totalReceitas - totalGastos;

  const handleAddReceita = () => {
    if (!novaReceita.descricao || !novaReceita.valor) return;
    addReceita({ descricao: novaReceita.descricao, valor: parseFloat(novaReceita.valor) });
    setNovaReceita({ descricao: '', valor: '' });
  };

  const handleAddGasto = () => {
    if (!novoGasto.descricao || !novoGasto.valor) return;
    addGasto({ descricao: novoGasto.descricao, valor: parseFloat(novoGasto.valor) });
    setNovoGasto({ descricao: '', valor: '' });
  };

  const startEditReceita = (id: string, descricao: string, valor: number) => {
    setEditingReceita(id);
    setEditValues({ descricao, valor: valor.toString() });
  };

  const startEditGasto = (id: string, descricao: string, valor: number) => {
    setEditingGasto(id);
    setEditValues({ descricao, valor: valor.toString() });
  };

  const saveEditReceita = () => {
    if (editingReceita && editValues.descricao && editValues.valor) {
      updateReceita({ id: editingReceita, descricao: editValues.descricao, valor: parseFloat(editValues.valor) });
      setEditingReceita(null);
    }
  };

  const saveEditGasto = () => {
    if (editingGasto && editValues.descricao && editValues.valor) {
      updateGasto({ id: editingGasto, descricao: editValues.descricao, valor: parseFloat(editValues.valor) });
      setEditingGasto(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {MESES[mes.mes - 1]} {mes.ano}
          </DialogTitle>
        </DialogHeader>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Receitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(totalReceitas, 'BRL')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(totalGastos, 'BRL')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-xl font-bold",
                saldoMes >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(saldoMes, 'BRL')}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Receitas */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Receitas
            </h3>
            
            {/* Form para adicionar */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Descrição"
                value={novaReceita.descricao}
                onChange={(e) => setNovaReceita({ ...novaReceita, descricao: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Valor"
                value={novaReceita.valor}
                onChange={(e) => setNovaReceita({ ...novaReceita, valor: e.target.value })}
                className="w-28"
                step="0.01"
              />
              <Button size="icon" onClick={handleAddReceita}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right w-28">Valor</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitas?.map((r) => (
                    <TableRow key={r.id}>
                      {editingReceita === r.id ? (
                        <>
                          <TableCell>
                            <Input
                              value={editValues.descricao}
                              onChange={(e) => setEditValues({ ...editValues, descricao: e.target.value })}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editValues.valor}
                              onChange={(e) => setEditValues({ ...editValues, valor: e.target.value })}
                              className="h-8 w-24"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditReceita}>
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingReceita(null)}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => startEditReceita(r.id, r.descricao, r.valor)}
                          >
                            {r.descricao}
                          </TableCell>
                          <TableCell 
                            className="text-right text-green-600 cursor-pointer"
                            onClick={() => startEditReceita(r.id, r.descricao, r.valor)}
                          >
                            {formatCurrency(Number(r.valor), 'BRL')}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => deleteReceita(r.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {!receitas?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        Nenhuma receita cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Gastos */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Gastos
            </h3>
            
            {/* Form para adicionar */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Descrição"
                value={novoGasto.descricao}
                onChange={(e) => setNovoGasto({ ...novoGasto, descricao: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Valor"
                value={novoGasto.valor}
                onChange={(e) => setNovoGasto({ ...novoGasto, valor: e.target.value })}
                className="w-28"
                step="0.01"
              />
              <Button size="icon" onClick={handleAddGasto}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right w-28">Valor</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos?.map((g) => (
                    <TableRow key={g.id}>
                      {editingGasto === g.id ? (
                        <>
                          <TableCell>
                            <Input
                              value={editValues.descricao}
                              onChange={(e) => setEditValues({ ...editValues, descricao: e.target.value })}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editValues.valor}
                              onChange={(e) => setEditValues({ ...editValues, valor: e.target.value })}
                              className="h-8 w-24"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditGasto}>
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingGasto(null)}>
                                <X className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell 
                            className="cursor-pointer"
                            onClick={() => startEditGasto(g.id, g.descricao, g.valor)}
                          >
                            {g.descricao}
                          </TableCell>
                          <TableCell 
                            className="text-right text-red-600 cursor-pointer"
                            onClick={() => startEditGasto(g.id, g.descricao, g.valor)}
                          >
                            {formatCurrency(Number(g.valor), 'BRL')}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => deleteGasto(g.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {!gastos?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        Nenhum gasto cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
