import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { StatusContaAPagar, TipoContaAPagar, TIPO_CONTA_LABELS, STATUS_CONTA_LABELS } from '@/types/contasAPagar';

interface ContasAPagarFiltrosProps {
  statusFiltro: StatusContaAPagar | 'todos';
  setStatusFiltro: (value: StatusContaAPagar | 'todos') => void;
  tipoFiltro: TipoContaAPagar | 'todos';
  setTipoFiltro: (value: TipoContaAPagar | 'todos') => void;
  instituicaoFiltro: string;
  setInstituicaoFiltro: (value: string) => void;
  instituicoes: string[];
}

export function ContasAPagarFiltros({
  statusFiltro,
  setStatusFiltro,
  tipoFiltro,
  setTipoFiltro,
  instituicaoFiltro,
  setInstituicaoFiltro,
  instituicoes,
}: ContasAPagarFiltrosProps) {
  return (
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

      <div className="space-y-1">
        <Label className="text-xs">Instituição</Label>
        <Select
          value={instituicaoFiltro}
          onValueChange={setInstituicaoFiltro}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {instituicoes.map((inst) => (
              <SelectItem key={inst} value={inst}>
                {inst}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
