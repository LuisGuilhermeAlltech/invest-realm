import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, ChevronRight, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useFinanceiroMensal, useFinanceiroDetalhe } from '@/hooks/useFinanceiroMensal';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import FinanceiroDetalheModal from '@/components/financeiro/FinanceiroDetalheModal';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function FinanceiroMensal() {
  const { meses, isLoading, createMes, deleteMes } = useFinanceiroMensal();
  const [novoMesOpen, setNovoMesOpen] = useState(false);
  const [selectedMesId, setSelectedMesId] = useState<string | null>(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  const handleCreateMes = () => {
    createMes({ ano, mes });
    setNovoMesOpen(false);
  };

  const selectedMes = meses?.find(m => m.id === selectedMesId);

  // Calcular totais gerais
  const totais = meses?.reduce(
    (acc, m) => ({
      receitas: acc.receitas + Number(m.total_receitas),
      gastos: acc.gastos + Number(m.total_gastos),
    }),
    { receitas: 0, gastos: 0 }
  ) || { receitas: 0, gastos: 0 };

  const saldoTotal = totais.receitas - totais.gastos;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro Mensal</h1>
          <p className="text-muted-foreground">Controle de receitas e gastos pessoais</p>
        </div>
        
        <Dialog open={novoMesOpen} onOpenChange={setNovoMesOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Mês
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Mês</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select value={mes.toString()} onValueChange={(v) => setMes(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((nome, idx) => (
                        <SelectItem key={idx} value={(idx + 1).toString()}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={ano}
                    onChange={(e) => setAno(parseInt(e.target.value))}
                    min={2000}
                    max={2100}
                  />
                </div>
              </div>
              <Button onClick={handleCreateMes} className="w-full">
                Criar Mês
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totais.receitas, 'BRL')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totais.gastos, 'BRL')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Acumulado</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              saldoTotal >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(saldoTotal, 'BRL')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Meses */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !meses?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum mês cadastrado. Clique em "Novo Mês" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead className="text-right">Receitas</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Saldo Mês</TableHead>
                  <TableHead className="text-right">Saldo Acumulado</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meses.map((m) => (
                  <TableRow 
                    key={m.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => setSelectedMesId(m.id)}
                  >
                    <TableCell className="font-medium">
                      {MESES[m.mes - 1]} {m.ano}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(Number(m.total_receitas), 'BRL')}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(Number(m.total_gastos), 'BRL')}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      Number(m.saldo_mes) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(Number(m.saldo_mes), 'BRL')}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      Number(m.saldo_acumulado) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(Number(m.saldo_acumulado), 'BRL')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Deseja excluir este mês e todos os seus registros?')) {
                              deleteMes(m.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <FinanceiroDetalheModal
        mes={selectedMes}
        open={!!selectedMesId}
        onClose={() => setSelectedMesId(null)}
      />
    </div>
  );
}
