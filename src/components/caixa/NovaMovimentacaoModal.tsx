import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TipoTransacaoCaixa, TIPO_TRANSACAO_LABELS, getRequiredFields, AccountWithBalance } from '@/hooks/useCaixa';
import { useAtivos } from '@/hooks/useAtivos';
import { format } from 'date-fns';

interface NovaMovimentacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    data: string;
    tipo: TipoTransacaoCaixa;
    valor: number;
    moeda: string;
    conta_origem_id?: string | null;
    conta_destino_id?: string | null;
    ativo_id?: string | null;
    descricao?: string | null;
  }) => void;
  accounts: AccountWithBalance[];
  isLoading?: boolean;
}

const TIPOS: TipoTransacaoCaixa[] = ['DEPOSITO', 'PROVENTO', 'TRANSFERENCIA', 'APLICACAO', 'RESGATE', 'SAQUE'];

export default function NovaMovimentacaoModal({ 
  open, 
  onOpenChange, 
  onSave, 
  accounts,
  isLoading 
}: NovaMovimentacaoModalProps) {
  const { ativos } = useAtivos();
  const [tipo, setTipo] = useState<TipoTransacaoCaixa>('DEPOSITO');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [valor, setValor] = useState('');
  const [contaOrigemId, setContaOrigemId] = useState<string>('');
  const [contaDestinoId, setContaDestinoId] = useState<string>('');
  const [ativoId, setAtivoId] = useState<string>('');
  const [descricao, setDescricao] = useState('');

  const requiredFields = getRequiredFields(tipo);

  // Get moeda based on selected account
  const getMoeda = () => {
    if (requiredFields.conta_origem && contaOrigemId) {
      const account = accounts.find(a => a.id === contaOrigemId);
      return account?.moeda || 'BRL';
    }
    if (requiredFields.conta_destino && contaDestinoId) {
      const account = accounts.find(a => a.id === contaDestinoId);
      return account?.moeda || 'BRL';
    }
    return 'BRL';
  };

  // Filter accounts by moeda for consistency
  const getFilteredAccountsForDestino = () => {
    if (tipo === 'TRANSFERENCIA' && contaOrigemId) {
      const origemAccount = accounts.find(a => a.id === contaOrigemId);
      return accounts.filter(a => a.id !== contaOrigemId && a.moeda === origemAccount?.moeda);
    }
    return accounts;
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTipo('DEPOSITO');
      setData(format(new Date(), 'yyyy-MM-dd'));
      setValor('');
      setContaOrigemId('');
      setContaDestinoId('');
      setAtivoId('');
      setDescricao('');
    }
  }, [open]);

  // Clear related fields when tipo changes
  useEffect(() => {
    setContaOrigemId('');
    setContaDestinoId('');
    setAtivoId('');
  }, [tipo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const moeda = getMoeda();
    
    onSave({
      data,
      tipo,
      valor: parseFloat(valor),
      moeda,
      conta_origem_id: requiredFields.conta_origem ? contaOrigemId : null,
      conta_destino_id: requiredFields.conta_destino ? contaDestinoId : null,
      ativo_id: requiredFields.ativo ? ativoId : null,
      descricao: descricao.trim() || null,
    });
    
    onOpenChange(false);
  };

  const isFormValid = () => {
    if (!valor || parseFloat(valor) <= 0) return false;
    if (requiredFields.conta_origem && !contaOrigemId) return false;
    if (requiredFields.conta_destino && !contaDestinoId) return false;
    if (requiredFields.ativo && !ativoId) return false;
    if (tipo === 'TRANSFERENCIA' && contaOrigemId === contaDestinoId) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Movimentação de Caixa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoTransacaoCaixa)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t} value={t}>{TIPO_TRANSACAO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
          </div>

          {requiredFields.conta_origem && (
            <div className="space-y-2">
              <Label htmlFor="conta_origem">Conta Origem</Label>
              <Select value={contaOrigemId} onValueChange={setContaOrigemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.ativo).map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome} ({account.moeda})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {requiredFields.conta_destino && (
            <div className="space-y-2">
              <Label htmlFor="conta_destino">Conta Destino</Label>
              <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredAccountsForDestino().filter(a => a.ativo).map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome} ({account.moeda})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {requiredFields.ativo && (
            <div className="space-y-2">
              <Label htmlFor="ativo">Ativo</Label>
              <Select value={ativoId} onValueChange={setAtivoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ativo" />
                </SelectTrigger>
                <SelectContent>
                  {ativos.filter(a => a.ativo).map(ativo => (
                    <SelectItem key={ativo.id} value={ativo.id}>
                      {ativo.ticker} - {ativo.nome || ativo.ticker}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="valor">Valor ({getMoeda()})</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Observações sobre a movimentação..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid() || isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
