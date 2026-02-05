import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pencil, CheckCircle2, DollarSign, AlertCircle, Calendar } from 'lucide-react';
import { ContaAPagarComCalculos, TIPO_CONTA_LABELS, StatusContaAPagar, TipoContaAPagar } from '@/types/contasAPagar';
import { Installment, InstallmentStatus, PaymentMethod, INSTALLMENT_STATUS_COLORS } from '@/types/installments';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { RegistrarPagamentoParcelaModal } from './RegistrarPagamentoParcelaModal';

interface ContasParceladasTableProps {
  contas: ContaAPagarComCalculos[];
  onEdit: (conta: ContaAPagarComCalculos) => void;
  onQuitar: (id: string) => void;
  isQuiting?: boolean;
  statusFiltro: StatusContaAPagar | 'todos';
  setStatusFiltro: (value: StatusContaAPagar | 'todos') => void;
  tipoFiltro: TipoContaAPagar | 'todos';
  setTipoFiltro: (value: TipoContaAPagar | 'todos') => void;
  // New installment props
  getInstallmentsForBill: (contaPagarId: string) => Installment[];
  getBillSummary: (contaPagarId: string) => {
    totalInstallments: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    nextPending: Installment | undefined;
    totalRemaining: number;
    totalPaid: number;
    formattedProgress: string;
  };
  onPayInstallment: (data: {
    installmentId: string;
    paidAt: string;
    paidAmount?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
  }) => void;
  isPaying: boolean;
}

export function ContasParceladasTable({
  contas,
  onEdit,
  onQuitar,
  isQuiting = false,
  statusFiltro,
  setStatusFiltro,
  tipoFiltro,
  setTipoFiltro,
  getInstallmentsForBill,
  getBillSummary,
  onPayInstallment,
  isPaying,
}: ContasParceladasTableProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [selectedBillDescription, setSelectedBillDescription] = useState<string>('');

  const handleOpenPayment = (conta: ContaAPagarComCalculos) => {
    const summary = getBillSummary(conta.id);
    if (summary.nextPending) {
      setSelectedInstallment(summary.nextPending);
      setSelectedBillDescription(conta.descricao);
      setPaymentModalOpen(true);
    }
  };

  const calculateInstallmentStatus = (installment: Installment): InstallmentStatus => {
    if (installment.status === 'paid') return 'paid';
    
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(installment.due_date));
    
    if (isBefore(dueDate, today)) {
      return 'overdue';
    }
    return 'pending';
  };

  const formatDueDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'dd/MM/yyyy');
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={statusFiltro}
            onValueChange={(value) => setStatusFiltro(value as StatusContaAPagar | 'todos')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativas</SelectItem>
              <SelectItem value="quitado">Quitadas</SelectItem>
              <SelectItem value="todos">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select
            value={tipoFiltro}
            onValueChange={(value) => setTipoFiltro(value as TipoContaAPagar | 'todos')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(TIPO_CONTA_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      {contas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          Nenhuma conta parcelada encontrada.
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Instituição</TableHead>
                <TableHead className="text-center">Próx. Venc.</TableHead>
                <TableHead className="text-center">Parcelas</TableHead>
                <TableHead className="text-right">Valor Parcela</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((conta) => {
                const summary = getBillSummary(conta.id);
                const hasOverdue = summary.overdueCount > 0;
                const nextPending = summary.nextPending;
                const nextStatus = nextPending ? calculateInstallmentStatus(nextPending) : null;

                return (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {conta.descricao}
                        {hasOverdue && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TIPO_CONTA_LABELS[conta.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell>{conta.instituicao}</TableCell>
                    <TableCell className="text-center">
                      {nextPending ? (
                        <div className="flex flex-col items-center">
                          <span className={nextStatus === 'overdue' ? 'text-destructive font-medium' : ''}>
                            {formatDueDate(nextPending.due_date)}
                          </span>
                          {nextStatus === 'overdue' && (
                            <span className="text-xs text-destructive">Atrasada</span>
                          )}
                          {nextStatus === 'pending' && (
                            <span className="text-xs text-muted-foreground">Baixa automática</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-green-600">Quitado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={conta.status === 'quitado' || !nextPending ? 'text-green-600 font-medium' : ''}>
                        {summary.formattedProgress}
                      </span>
                      {summary.paidCount > 0 && summary.pendingCount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {summary.paidCount} pagas
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(conta.valor_parcela || 0, 'BRL')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {conta.status === 'quitado' || summary.pendingCount === 0 ? (
                        <span className="text-green-600">Quitado</span>
                      ) : (
                        <span className="text-destructive">
                          {formatCurrency(summary.totalRemaining, 'BRL')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {/* Show manual payment only for overdue installments */}
                        {conta.status === 'ativo' && nextPending && nextStatus === 'overdue' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPayment(conta)}
                            title="Registrar Pagamento Manual"
                            className="text-green-600 hover:text-green-700"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(conta)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        {conta.status === 'ativo' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Deseja realmente quitar esta conta?')) {
                                onQuitar(conta.id);
                              }
                            }}
                            title="Quitar"
                            disabled={isQuiting}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Payment Modal */}
      <RegistrarPagamentoParcelaModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        installment={selectedInstallment}
        billDescription={selectedBillDescription}
        onConfirm={onPayInstallment}
        isLoading={isPaying}
      />
    </div>
  );
}
