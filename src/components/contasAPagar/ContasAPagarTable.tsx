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
import { Pencil, CheckCircle2 } from 'lucide-react';
import { ContaAPagarComCalculos, TIPO_CONTA_LABELS } from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';

interface ContasAPagarTableProps {
  contas: ContaAPagarComCalculos[];
  onEdit: (conta: ContaAPagarComCalculos) => void;
  onQuitar: (id: string) => void;
  isQuiting?: boolean;
}

export function ContasAPagarTable({
  contas,
  onEdit,
  onQuitar,
  isQuiting = false,
}: ContasAPagarTableProps) {
  if (contas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma conta encontrada com os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Instituição</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">Valor Parcela</TableHead>
            <TableHead className="text-center">Parcelas</TableHead>
            <TableHead className="text-center">Venc.</TableHead>
            <TableHead className="text-center">Restantes</TableHead>
            <TableHead className="text-right">Valor Restante</TableHead>
            <TableHead>Obs.</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contas.map((conta) => (
            <TableRow key={conta.id}>
              <TableCell className="font-medium">{conta.descricao}</TableCell>
              <TableCell>
                <Badge variant={conta.tipo === 'cartao' ? 'default' : 'secondary'}>
                  {TIPO_CONTA_LABELS[conta.tipo]}
                </Badge>
              </TableCell>
              <TableCell>{conta.instituicao}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(conta.valor_total, 'BRL')}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(conta.valor_parcela, 'BRL')}
              </TableCell>
              <TableCell className="text-center">
                <span className={conta.status === 'quitado' ? 'text-green-600' : ''}>
                  {conta.parcelas_formatado}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {conta.dia_vencimento}
              </TableCell>
              <TableCell className="text-center">
                {conta.status === 'quitado' ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Quitada
                  </Badge>
                ) : (
                  conta.parcelas_restantes
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {conta.status === 'quitado' ? (
                  <span className="text-green-600">R$ 0,00</span>
                ) : (
                  formatCurrency(conta.valor_restante, 'BRL')
                )}
              </TableCell>
              <TableCell className="max-w-[150px] truncate" title={conta.observacoes || ''}>
                {conta.observacoes || '-'}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-1">
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
