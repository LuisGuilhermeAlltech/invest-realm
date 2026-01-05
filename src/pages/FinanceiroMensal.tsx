import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, ChevronRight, Trash2, TrendingUp, TrendingDown, Wallet, Tags, AlertCircle, Settings } from 'lucide-react';
import { useFinanceiroMensal } from '@/hooks/useFinanceiroMensal';
import { useCategoriasFinanceiras } from '@/hooks/useCategoriasFinanceiras';
import { useGastosPorCategoriaComLimites } from '@/hooks/useLimitesTipoGasto';
import { ReceitasGastosChart, TotaisPorTipoCardsComLimites } from '@/components/financeiro/FinanceiroCharts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import FinanceiroDetalheModal from '@/components/financeiro/FinanceiroDetalheModal';
import CategoriasModal from '@/components/financeiro/CategoriasModal';
import LimitesTipoModal from '@/components/financeiro/LimitesTipoModal';
import { useToast } from '@/hooks/use-toast';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function FinanceiroMensal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { meses, isLoading, createMes, deleteMes, canDeleteMes } = useFinanceiroMensal();
  const { categoriasAtivas } = useCategoriasFinanceiras();
  
  const [novoMesOpen, setNovoMesOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [limitesTipoOpen, setLimitesTipoOpen] = useState(false);
  const [selectedMesId, setSelectedMesId] = useState<string | null>(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  // Get gastos por tipo with limits for the last month
  const ultimoMes = meses?.[0];
  const { gastosTipoComLimites } = useGastosPorCategoriaComLimites(
    ultimoMes?.id || null,
    ultimoMes?.ano || new Date().getFullYear(),
    ultimoMes?.mes || new Date().getMonth() + 1
  );

  const handleCreateMes = () => {
    createMes({ ano, mes });
    setNovoMesOpen(false);
  };

  const handleDeleteMes = (id: string) => {
    if (!canDeleteMes(id)) {
      toast({
        title: 'Não é possível excluir',
        description: 'Só é possível excluir o último mês cadastrado para proteger o saldo acumulado.',
        variant: 'destructive',
      });
      return;
    }
    if (confirm('Deseja excluir este mês e todos os seus registros?')) {
      deleteMes(id);
    }
  };

  const handleConverterAporte = (saldo: number, mesAno: string) => {
    toast({
      title: 'Aporte manual sugerido',
      description: `Valor: ${formatCurrency(saldo, 'BRL')} | Origem: Financeiro Mensal - ${mesAno}. Acesse a página de Movimentações para registrar o aporte.`,
    });
    // Navigate to movimentacoes with params
    navigate('/movimentacoes');
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

  // Saldo acumulado é o do último mês (já calculado pela view)
  const saldoAcumulado = ultimoMes ? Number(ultimoMes.saldo_acumulado) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro Mensal</h1>
          <p className="text-muted-foreground">Controle de receitas e gastos pessoais</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoriasOpen(true)}>
            <Tags className="h-4 w-4 mr-2" />
            Categorias
          </Button>

          {ultimoMes && (
            <Button variant="outline" onClick={() => setLimitesTipoOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Limites
            </Button>
          )}
          
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
                {ultimoMes && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="text-muted-foreground">Saldo acumulado anterior:</p>
                    <p className={cn(
                      "font-bold",
                      saldoAcumulado >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(saldoAcumulado, 'BRL')}
                    </p>
                  </div>
                )}
                
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
                
                {categoriasAtivas.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>Crie categorias antes de adicionar gastos.</p>
                  </div>
                )}
                
                <Button onClick={handleCreateMes} className="w-full">
                  Criar Mês
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
              saldoAcumulado >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(saldoAcumulado, 'BRL')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Totais por Tipo do Último Mês com Limites */}
      {gastosTipoComLimites && gastosTipoComLimites.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Gastos por Tipo - {ultimoMes && `${MESES[ultimoMes.mes - 1]} ${ultimoMes.ano}`}
          </h3>
          <TotaisPorTipoCardsComLimites gastosTipoComLimites={gastosTipoComLimites} />
        </div>
      )}

      {/* Gráfico de Receitas x Gastos */}
      {meses && meses.length > 0 && (
        <ReceitasGastosChart meses={meses} />
      )}

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
                          disabled={!canDeleteMes(m.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMes(m.id);
                          }}
                          title={canDeleteMes(m.id) ? 'Excluir mês' : 'Só é possível excluir o último mês'}
                        >
                          <Trash2 className={cn(
                            "h-4 w-4",
                            canDeleteMes(m.id) ? "text-destructive" : "text-muted-foreground"
                          )} />
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
        onConverterAporte={handleConverterAporte}
      />

      {/* Modal de Categorias */}
      <CategoriasModal
        open={categoriasOpen}
        onClose={() => setCategoriasOpen(false)}
      />

      {/* Modal de Limites por Tipo */}
      {ultimoMes && (
        <LimitesTipoModal
          open={limitesTipoOpen}
          onClose={() => setLimitesTipoOpen(false)}
          ano={ultimoMes.ano}
          mes={ultimoMes.mes}
        />
      )}
    </div>
  );
}
