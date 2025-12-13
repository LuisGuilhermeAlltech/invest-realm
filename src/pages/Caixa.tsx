import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Wallet, ArrowUpDown } from 'lucide-react';
import { useCaixa, TIPO_TRANSACAO_LABELS, TipoTransacaoCaixa } from '@/hooks/useCaixa';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Moeda } from '@/types/database';
import NovaContaModal from '@/components/caixa/NovaContaModal';
import NovaMovimentacaoModal from '@/components/caixa/NovaMovimentacaoModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TIPOS_FILTER: (TipoTransacaoCaixa | 'TODOS')[] = ['TODOS', 'DEPOSITO', 'PROVENTO', 'TRANSFERENCIA', 'APLICACAO', 'RESGATE', 'SAQUE'];

export default function Caixa() {
  const { 
    accounts, 
    transactions, 
    isLoading, 
    createAccount, 
    createTransaction, 
    deleteTransaction,
    deleteAccount,
    isCreatingTransaction,
  } = useCaixa();
  const { usdBrl, isLoading: isLoadingRate } = useExchangeRate();

  const [showNovaContaModal, setShowNovaContaModal] = useState(false);
  const [showNovaMovimentacaoModal, setShowNovaMovimentacaoModal] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  // Filters
  const [filterTipo, setFilterTipo] = useState<TipoTransacaoCaixa | 'TODOS'>('TODOS');
  const [filterConta, setFilterConta] = useState<string>('TODAS');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');

  // Calculate totals
  const totals = useMemo(() => {
    const totalBRL = accounts
      .filter(a => a.moeda === 'BRL')
      .reduce((sum, a) => sum + (a.saldo || 0), 0);
    
    const totalUSD = accounts
      .filter(a => a.moeda === 'USD')
      .reduce((sum, a) => sum + (a.saldo || 0), 0);

    const totalBRLConvertido = totalBRL + (totalUSD * (usdBrl || 0));

    return { totalBRL, totalUSD, totalBRLConvertido };
  }, [accounts, usdBrl]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterTipo !== 'TODOS' && t.tipo !== filterTipo) return false;
      if (filterConta !== 'TODAS') {
        if (t.conta_origem_id !== filterConta && t.conta_destino_id !== filterConta) return false;
      }
      if (filterDataInicio && t.data < filterDataInicio) return false;
      if (filterDataFim && t.data > filterDataFim) return false;
      return true;
    });
  }, [transactions, filterTipo, filterConta, filterDataInicio, filterDataFim]);

  const handleConfirmDeleteTransaction = () => {
    if (deleteTransactionId) {
      deleteTransaction(deleteTransactionId);
      setDeleteTransactionId(null);
    }
  };

  const handleConfirmDeleteAccount = () => {
    if (deleteAccountId) {
      deleteAccount(deleteAccountId);
      setDeleteAccountId(null);
    }
  };

  const getTipoBadgeVariant = (tipo: TipoTransacaoCaixa) => {
    switch (tipo) {
      case 'DEPOSITO':
      case 'PROVENTO':
      case 'RESGATE':
        return 'default';
      case 'SAQUE':
      case 'APLICACAO':
        return 'secondary';
      case 'TRANSFERENCIA':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Caixa / Contas</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowNovaContaModal(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
          <Button onClick={() => setShowNovaMovimentacaoModal(true)}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Nova Movimentação
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Caixa Total (BRL)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isLoadingRate ? '...' : formatCurrency(totals.totalBRLConvertido, 'BRL')}
            </div>
            {totals.totalUSD > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Inclui {formatCurrency(totals.totalUSD, 'USD')} convertido
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo em BRL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totals.totalBRL, 'BRL')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo em USD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totals.totalUSD, 'USD')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma conta cadastrada. Clique em "Nova Conta" para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Moeda</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map(account => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.moeda}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(account.saldo || 0, account.moeda as Moeda)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteAccountId(account.id)}
                        disabled={(account.saldo || 0) !== 0}
                        title={(account.saldo || 0) !== 0 ? 'Conta com saldo não pode ser excluída' : 'Excluir conta'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transactions with Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Movimentações de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as TipoTransacaoCaixa | 'TODOS')}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_FILTER.map(t => (
                    <SelectItem key={t} value={t}>
                      {t === 'TODOS' ? 'Todos os tipos' : TIPO_TRANSACAO_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterConta} onValueChange={setFilterConta}>
                <SelectTrigger>
                  <SelectValue placeholder="Conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as contas</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={filterDataInicio}
                onChange={(e) => setFilterDataInicio(e.target.value)}
                placeholder="Data inicial"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filterDataFim}
                onChange={(e) => setFilterDataFim(e.target.value)}
                placeholder="Data final"
              />
            </div>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma movimentação encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.data)}</TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadgeVariant(t.tipo)}>
                          {TIPO_TRANSACAO_LABELS[t.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.conta_origem?.nome || '—'}</TableCell>
                      <TableCell>{t.conta_destino?.nome || '—'}</TableCell>
                      <TableCell>{t.ativos?.ticker || '—'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(t.valor, t.moeda as Moeda)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {t.descricao || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTransactionId(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Modals */}
      <NovaContaModal
        open={showNovaContaModal}
        onOpenChange={setShowNovaContaModal}
        onSave={createAccount}
      />

      <NovaMovimentacaoModal
        open={showNovaMovimentacaoModal}
        onOpenChange={setShowNovaMovimentacaoModal}
        onSave={createTransaction}
        accounts={accounts}
        isLoading={isCreatingTransaction}
      />

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={!!deleteTransactionId} onOpenChange={() => setDeleteTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteTransaction}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteAccount}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
