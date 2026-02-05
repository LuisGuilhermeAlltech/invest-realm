import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, DollarSign, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ReceivableWithCalculations, ReceivableStatus, RECEIVABLE_STATUS_LABELS } from '@/types/receivables';
import { formatCurrency } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RegistrarRecebimentoModal } from './RegistrarRecebimentoModal';

interface ReceivableSaldoSectionProps {
  receivables: ReceivableWithCalculations[];
  onEdit: (receivable: ReceivableWithCalculations) => void;
  onClose: (id: string) => void;
  onRegisterPayment: (data: {
    receivable_id: string;
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

export function ReceivableSaldoSection({
  receivables,
  onEdit,
  onClose,
  onRegisterPayment,
  isClosing,
  isRegistering,
  statusFiltro,
  setStatusFiltro,
}: ReceivableSaldoSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableWithCalculations | null>(null);

  const handleOpenPaymentModal = (receivable: ReceivableWithCalculations) => {
    setSelectedReceivable(receivable);
    setPaymentModalOpen(true);
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
            Nenhuma conta saldo a receber encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receivables.map((receivable) => (
            <Card key={receivable.id} className={receivable.status === 'closed' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{receivable.description}</h3>
                      <Badge variant={receivable.status === 'active' ? 'default' : 'secondary'}>
                        {RECEIVABLE_STATUS_LABELS[receivable.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{receivable.payer}</p>
                  </div>

                  <div className="text-right mr-4">
                    <div className="font-semibold text-lg">
                      {formatCurrency(receivable.current_balance || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Recebido: {formatCurrency(receivable.total_received)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {receivable.status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPaymentModal(receivable)}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Receber
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(receivable)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onClose(receivable.id)}
                          disabled={isClosing}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Saldo Inicial:</span>
                        <p className="font-medium">{formatCurrency(receivable.initial_balance || 0)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Saldo Atual:</span>
                        <p className="font-medium">{formatCurrency(receivable.current_balance || 0)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Previsão Mensal:</span>
                        <p className="font-medium">{formatCurrency(receivable.expected_monthly || 0)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Recebido:</span>
                        <p className="font-medium text-green-600">{formatCurrency(receivable.total_received)}</p>
                      </div>
                    </div>
                    {receivable.notes && (
                      <div className="mt-2">
                        <span className="text-muted-foreground text-sm">Observações: </span>
                        <span className="text-sm">{receivable.notes}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {selectedReceivable && (
        <RegistrarRecebimentoModal
          open={paymentModalOpen}
          onOpenChange={(open) => {
            setPaymentModalOpen(open);
            if (!open) setSelectedReceivable(null);
          }}
          receivable={selectedReceivable}
          onRegister={onRegisterPayment}
          isLoading={isRegistering}
        />
      )}
    </div>
  );
}
