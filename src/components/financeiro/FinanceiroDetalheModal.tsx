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
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Check, X, TrendingUp, TrendingDown, Wallet, ArrowRight, AlertTriangle } from 'lucide-react';
import { FinanceiroMensal, useFinanceiroDetalhe } from '@/hooks/useFinanceiroMensal';
import { useCategoriasFinanceiras, useGastosPorCategoria, useGastosPorTipo } from '@/hooks/useCategoriasFinanceiras';
import { useTiposGasto } from '@/hooks/useTiposGasto';
import { useGastosPorCategoriaComLimites, checkLimiteExcedido } from '@/hooks/useLimitesTipoGasto';
import { GastosPorTipoChart, TotaisPorTipoCardsComLimites } from './FinanceiroCharts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface FinanceiroDetalheModalProps {
  mes: FinanceiroMensal | undefined;
  open: boolean;
  onClose: () => void;
  onConverterAporte?: (saldo: number, mesAno: string) => void;
}

export default function FinanceiroDetalheModal({ mes, open, onClose, onConverterAporte }: FinanceiroDetalheModalProps) {
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

  const { categoriasAtivas } = useCategoriasFinanceiras();
  const { data: gastosPorCategoria } = useGastosPorCategoria(mes?.id || null);
  const { data: gastosPorTipo } = useGastosPorTipo(mes?.id || null);
  const { gastosTipoComLimites } = useGastosPorCategoriaComLimites(
    mes?.id || null,
    mes?.ano || new Date().getFullYear(),
    mes?.mes || new Date().getMonth() + 1
  );
  const { toast } = useToast();

  const [novaReceita, setNovaReceita] = useState({ descricao: '', valor: '' });
  const [novoGasto, setNovoGasto] = useState({ descricao: '', valor: '', categoria_id: '' });
  const [editingReceita, setEditingReceita] = useState<string | null>(null);
  const [editingGasto, setEditingGasto] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ descricao: '', valor: '', categoria_id: '' });
  const [limiteWarning, setLimiteWarning] = useState<{ tipo: string; percentual: number } | null>(null);

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
    if (!novoGasto.descricao || !novoGasto.valor || !novoGasto.categoria_id) return;
    
    const valor = parseFloat(novoGasto.valor);
    
    // Get the categoria_tipo from the selected category
    const selectedCategoria = categoriasAtivas.find(c => c.id === novoGasto.categoria_id);
    if (selectedCategoria && selectedCategoria.tipo_id) {
      // Find tipo info
      const tipoInfo = gastosTipoComLimites.find(g => {
        // Match by tipo name since we don't have direct access to tipo_id mapping here
        const cat = categoriasAtivas.find(c => c.tipo_id === selectedCategoria.tipo_id);
        return cat && g.tipo_nome;
      });
      
      // Check if adding this gasto would exceed the limit
      if (tipoInfo && tipoInfo.limite_mensal > 0) {
        const totalApos = tipoInfo.total_gasto + valor;
        const percentualApos = (totalApos / tipoInfo.limite_mensal) * 100;
        
        if (percentualApos >= 90) {
          toast({
            title: percentualApos >= 100 ? '⚠️ Limite ultrapassado!' : '⚠️ Limite próximo',
            description: `${tipoInfo.tipo_nome}: ${formatCurrency(totalApos, 'BRL')} de ${formatCurrency(tipoInfo.limite_mensal, 'BRL')} (${percentualApos.toFixed(0)}%)`,
            variant: percentualApos >= 100 ? 'destructive' : 'default',
          });
        }
      }
    }
    
    addGasto({ 
      descricao: novoGasto.descricao, 
      valor, 
      categoria_id: novoGasto.categoria_id 
    });
    setNovoGasto({ descricao: '', valor: '', categoria_id: '' });
  };

  const startEditReceita = (id: string, descricao: string, valor: number) => {
    setEditingReceita(id);
    setEditValues({ descricao, valor: valor.toString(), categoria_id: '' });
  };

  const startEditGasto = (id: string, descricao: string, valor: number, categoria_id: string | null) => {
    setEditingGasto(id);
    setEditValues({ descricao, valor: valor.toString(), categoria_id: categoria_id || '' });
  };

  const saveEditReceita = () => {
    if (editingReceita && editValues.descricao && editValues.valor) {
      updateReceita({ id: editingReceita, descricao: editValues.descricao, valor: parseFloat(editValues.valor) });
      setEditingReceita(null);
    }
  };

  const saveEditGasto = () => {
    if (editingGasto && editValues.descricao && editValues.valor && editValues.categoria_id) {
      updateGasto({ 
        id: editingGasto, 
        descricao: editValues.descricao, 
        valor: parseFloat(editValues.valor),
        categoria_id: editValues.categoria_id
      });
      setEditingGasto(null);
    }
  };

  const getCategoriaInfo = (categoriaId: string | null) => {
    if (!categoriaId) return null;
    const cat = categoriasAtivas.find(c => c.id === categoriaId);
    return cat;
  };

  const handleConverterAporte = () => {
    if (saldoMes > 0 && onConverterAporte) {
      onConverterAporte(saldoMes, `${MESES[mes.mes - 1]} ${mes.ano}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {MESES[mes.mes - 1]} {mes.ano}
            </DialogTitle>
            {saldoMes > 0 && onConverterAporte && (
              <Button variant="outline" size="sm" onClick={handleConverterAporte}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Converter saldo em aporte
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-4">
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
                Saldo do Mês
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

        {/* Totais por Tipo com Limites */}
        {gastosTipoComLimites && gastosTipoComLimites.length > 0 && (
          <TotaisPorTipoCardsComLimites gastosTipoComLimites={gastosTipoComLimites} />
        )}

        {/* Limites por Categoria */}
        {gastosPorCategoria && gastosPorCategoria.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Limites por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {gastosPorCategoria.map((cat) => {
                const percentual = cat.limite_mensal > 0 
                  ? (Number(cat.total_gasto) / Number(cat.limite_mensal)) * 100 
                  : 0;
                const estourado = percentual > 100;
                
                return (
                  <div key={cat.categoria_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.categoria_nome}</span>
                      <span className={cn(
                        "font-mono",
                        estourado ? "text-red-600" : "text-green-600"
                      )}>
                        {formatCurrency(Number(cat.total_gasto), 'BRL')} / {formatCurrency(Number(cat.limite_mensal), 'BRL')}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(percentual, 100)} 
                      className={cn("h-2", estourado && "[&>div]:bg-red-500")}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
            <div className="space-y-2 mb-4">
              <div className="flex gap-2">
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
              </div>
              <div className="flex gap-2">
                <Select
                  value={novoGasto.categoria_id}
                  onValueChange={(v) => setNovoGasto({ ...novoGasto, categoria_id: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasAtivas.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" onClick={handleAddGasto} disabled={!novoGasto.categoria_id}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Lista */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right w-28">Valor</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gastos?.map((g) => {
                    const categoriaInfo = getCategoriaInfo(g.categoria_id);
                    return (
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
                              <Select
                                value={editValues.categoria_id}
                                onValueChange={(v) => setEditValues({ ...editValues, categoria_id: v })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categoriasAtivas.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                              onClick={() => startEditGasto(g.id, g.descricao, g.valor, g.categoria_id)}
                            >
                              {g.descricao}
                            </TableCell>
                            <TableCell>
                              {categoriaInfo && (
                                <Badge variant="secondary">
                                  {categoriaInfo.nome}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell 
                              className="text-right text-red-600 cursor-pointer"
                              onClick={() => startEditGasto(g.id, g.descricao, g.valor, g.categoria_id)}
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
                    );
                  })}
                  {!gastos?.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                        Nenhum gasto cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Gráfico de Gastos por Tipo */}
        {gastosPorTipo && gastosPorTipo.length > 0 && (
          <div className="mt-6">
            <GastosPorTipoChart gastosPorTipo={gastosPorTipo} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
