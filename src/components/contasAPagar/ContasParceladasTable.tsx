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
import { Pencil, CheckCircle2 } from 'lucide-react';
import { ContaAPagarComCalculos, TIPO_CONTA_LABELS, StatusContaAPagar, TipoContaAPagar } from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';

interface ContasParceladasTableProps {
  contas: ContaAPagarComCalculos[];
  onEdit: (conta: ContaAPagarComCalculos) => void;
  onQuitar: (id: string) => void;
  isQuiting?: boolean;
  statusFiltro: StatusContaAPagar | 'todos';
  setStatusFiltro: (value: StatusContaAPagar | 'todos') => void;
  tipoFiltro: TipoContaAPagar | 'todos';
  setTipoFiltro: (value: TipoContaAPagar | 'todos') => void;
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
}: ContasParceladasTableProps) {
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
                <TableHead className="text-center">Venc.</TableHead>
                <TableHead className="text-center">Parcelas</TableHead>
                <TableHead className="text-right">Valor Parcela</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">{conta.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TIPO_CONTA_LABELS[conta.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell>{conta.instituicao}</TableCell>
                  <TableCell className="text-center">
                    Dia {conta.dia_vencimento}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={conta.status === 'quitado' ? 'text-green-600 font-medium' : ''}>
                      {conta.parcelas_formatado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(conta.valor_parcela || 0, 'BRL')}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {conta.status === 'quitado' ? (
                      <span className="text-green-600">Quitado</span>
                    ) : (
                      <span className="text-destructive">
                        {formatCurrency(conta.valor_restante, 'BRL')}
                      </span>
                    )}
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
      )}
    </div>
  );
}
