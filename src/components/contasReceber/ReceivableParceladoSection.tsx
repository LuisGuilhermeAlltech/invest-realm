import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, DollarSign, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { ReceivableWithCalculations, ReceivableInstallment, ReceivableStatus, RECEIVABLE_STATUS_LABELS, RECEIVABLE_INSTALLMENT_STATUS_LABELS, RECEIVABLE_INSTALLMENT_STATUS_COLORS } from '@/types/receivables';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegistrarRecebimentoParcelaModal } from './RegistrarRecebimentoParcelaModal';

interface ReceivableParceladoSectionProps {
  receivables: ReceivableWithCalculations[];
  installments: ReceivableInstallment[];
  onEdit: (receivable: ReceivableWithCalculations) => void;
  onClose: (id: string) => void;
  onRegisterPayment: (data: {
    receivable_id: string;
    receivable_installment_id?: string;
    paid_at: string;
    amount: number;
    method: 'pix' | 'dinheiro' | 'transferencia' | 'cartao' | 'boleto' | 'outro';
    notes?: string;
  }) => Promise<void>;
  isClosing: boolean;
  isRegistering: boolean;
  statusFiltro: ReceivableStatus | 'todos';
  setStatusFiltro: (status: ReceivableStatus | 'todos') => void;
}

export function ReceivableParceladoSection({
  receivables,
  installments,
  onEdit,
  onClose,
  onRegisterPayment,
  isClosing,
  isRegistering,
  statusFiltro,
  setStatusFiltro,
}: ReceivableParceladoSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableWithCalculations | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<ReceivableInstallment | null>(null);

  const handleOpenPaymentModal = (receivable: ReceivableWithCalculations, installment?: ReceivableInstallment) => {
    setSelectedReceivable(receivable);
    setSelectedInstallment(installment || null);
    setPaymentModalOpen(true);
  };

  const getReceivableInstallments = (receivableId: string) => {
    return installments.filter((i) => i.receivable_id === receivableId);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as ReceivableStatus | 'todos')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="closed">Encerradas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {receivables.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma conta parcelada a receber encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receivables.map((receivable) => {
            const recInstallments = getReceivableInstallments(receivable.id);
            const nextPending = recInstallments.find((i) => i.status !== 'received');
            
            return (
              <Card key={receivable.id} className={receivable.status === 'closed' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{receivable.description}</h3>
                        <Badge variant={receivable.status === 'active' ? 'default' : 'secondary'}>
                          {RECEIVABLE_STATUS_LABELS[receivable.status]}
                        </Badge>
                        {receivable.is_overdue && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Atrasado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{receivable.payer}</p>
                    </div>

                    <div className="text-center mx-4">
                      <div className="font-semibold">{receivable.progress}</div>
                      <div className="text-xs text-muted-foreground">Parcelas</div>
                    </div>

                    <div className="text-right mr-4">
                      <div className="font-semibold text-lg">
                        {formatCurrency(receivable.total_pending)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {nextPending ? (
                          <>Próx: {formatDate(nextPending.due_date)}</>
                        ) : (
                          'Concluído'
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {receivable.status === 'active' && nextPending && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentModal(receivable, nextPending)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Receber
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onEdit(receivable)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {receivable.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onClose(receivable.id)}
                          disabled={isClosing}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(expandedId === receivable.id ? null : receivable.id)}
                      >
                        {expandedId === receivable.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expandedId === receivable.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-3">Parcelas</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recInstallments.map((installment) => (
                          <div
                            key={installment.id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {installment.installment_number}/{recInstallments.length}
                              </span>
                              <span className="text-sm">{formatDate(installment.due_date)}</span>
                              <Badge
                                variant="outline"
                                className={RECEIVABLE_INSTALLMENT_STATUS_COLORS[installment.status]}
                              >
                                {RECEIVABLE_INSTALLMENT_STATUS_LABELS[installment.status]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-medium">{formatCurrency(installment.amount)}</div>
                                {installment.received_amount > 0 && installment.received_amount < installment.amount && (
                                  <div className="text-xs text-green-600">
                                    Recebido: {formatCurrency(installment.received_amount)}
                                  </div>
                                )}
                              </div>
                              {installment.status !== 'received' && receivable.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenPaymentModal(receivable, installment)}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {selectedReceivable && (
        <RegistrarRecebimentoParcelaModal
          open={paymentModalOpen}
          onOpenChange={(open) => {
            setPaymentModalOpen(open);
            if (!open) {
              setSelectedReceivable(null);
              setSelectedInstallment(null);
            }
          }}
          receivable={selectedReceivable}
          installment={selectedInstallment}
          allInstallments={selectedReceivable ? getReceivableInstallments(selectedReceivable.id) : []}
          onRegister={onRegisterPayment}
          isLoading={isRegistering}
        />
      )}
    </div>
  );
}
