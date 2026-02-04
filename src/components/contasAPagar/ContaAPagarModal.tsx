import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContaAPagar, TIPO_CONTA_LABELS, ModoContaAPagar } from '@/types/contasAPagar';
import { useCaixa } from '@/hooks/useCaixa';
import { format } from 'date-fns';

interface ContaAPagarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta?: ContaAPagar | null;
  onSave: (data: Partial<ContaAPagar>) => void;
  onUpdate?: (data: Partial<ContaAPagar> & { id: string }) => void;
  isLoading?: boolean;
}

export function ContaAPagarModal({
  open,
  onOpenChange,
  conta,
  onSave,
  onUpdate,
  isLoading = false,
}: ContaAPagarModalProps) {
  const { accounts } = useCaixa();
  const isEditing = !!conta;

  const [modo, setModo] = useState<ModoContaAPagar>('parcelada');

  const [formData, setFormData] = useState({
    descricao: '',
    tipo: 'cartao' as 'cartao' | 'emprestimo' | 'outro',
    instituicao: '',
    conta_id: '' as string,
    // Parcelada
    valor_total: '',
    valor_parcela: '',
    total_parcelas: '',
    data_inicio: format(new Date(), 'yyyy-MM'),
    // Saldo
    saldo_atual: '',
    pagamento_minimo: '',
    meta_pagamento: '',
    // Comum
    dia_vencimento: '',
    observacoes: '',
  });

  const [calcMode, setCalcMode] = useState<'parcela' | 'total'>('parcela');

  useEffect(() => {
    if (conta) {
      setModo(conta.modo);
      setFormData({
        descricao: conta.descricao,
        tipo: conta.tipo,
        instituicao: conta.instituicao,
        conta_id: conta.conta_id || '',
        valor_total: conta.valor_total ? String(conta.valor_total) : '',
        valor_parcela: conta.valor_parcela ? String(conta.valor_parcela) : '',
        total_parcelas: conta.total_parcelas ? String(conta.total_parcelas) : '',
        data_inicio: conta.data_inicio ? conta.data_inicio.substring(0, 7) : format(new Date(), 'yyyy-MM'),
        saldo_atual: conta.saldo_atual ? String(conta.saldo_atual) : '',
        pagamento_minimo: conta.pagamento_minimo ? String(conta.pagamento_minimo) : '',
        meta_pagamento: conta.meta_pagamento ? String(conta.meta_pagamento) : '',
        dia_vencimento: String(conta.dia_vencimento),
        observacoes: conta.observacoes || '',
      });
    } else {
      setModo('saldo');
      setFormData({
        descricao: '',
        tipo: 'cartao',
        instituicao: '',
        conta_id: '',
        valor_total: '',
        valor_parcela: '',
        total_parcelas: '',
        data_inicio: format(new Date(), 'yyyy-MM'),
        saldo_atual: '',
        pagamento_minimo: '',
        meta_pagamento: '',
        dia_vencimento: '',
        observacoes: '',
      });
    }
  }, [conta, open]);

  // Auto-cálculo para modo parcelada
  useEffect(() => {
    if (modo !== 'parcelada') return;

    const valorTotal = parseFloat(formData.valor_total) || 0;
    const valorParcela = parseFloat(formData.valor_parcela) || 0;
    const totalParcelas = parseInt(formData.total_parcelas) || 0;

    if (calcMode === 'parcela' && valorTotal > 0 && totalParcelas > 0) {
      const calculado = (valorTotal / totalParcelas).toFixed(2);
      if (calculado !== formData.valor_parcela) {
        setFormData((prev) => ({ ...prev, valor_parcela: calculado }));
      }
    } else if (calcMode === 'total' && valorParcela > 0 && totalParcelas > 0) {
      const calculado = (valorParcela * totalParcelas).toFixed(2);
      if (calculado !== formData.valor_total) {
        setFormData((prev) => ({ ...prev, valor_total: calculado }));
      }
    }
  }, [formData.valor_total, formData.total_parcelas, formData.valor_parcela, calcMode, modo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const diaVencimento = parseInt(formData.dia_vencimento);

    if (!formData.descricao.trim()) {
      return;
    }

    if (diaVencimento < 1 || diaVencimento > 31) {
      return;
    }

    let dataToSave: Partial<ContaAPagar>;

    if (modo === 'parcelada') {
      const valorTotal = parseFloat(formData.valor_total);
      const valorParcela = parseFloat(formData.valor_parcela);
      const totalParcelas = parseInt(formData.total_parcelas);

      if (valorTotal <= 0 || valorParcela <= 0 || totalParcelas < 1) {
        return;
      }

      dataToSave = {
        descricao: formData.descricao.trim(),
        tipo: formData.tipo,
        instituicao: formData.instituicao.trim(),
        conta_id: formData.conta_id || null,
        modo: 'parcelada',
        valor_total: valorTotal,
        valor_parcela: valorParcela,
        total_parcelas: totalParcelas,
        data_inicio: `${formData.data_inicio}-01`,
        dia_vencimento: diaVencimento,
        saldo_atual: null,
        pagamento_minimo: null,
        meta_pagamento: null,
        observacoes: formData.observacoes.trim() || null,
      };
    } else {
      const saldoAtual = parseFloat(formData.saldo_atual);

      if (isNaN(saldoAtual) || saldoAtual < 0) {
        return;
      }

      dataToSave = {
        descricao: formData.descricao.trim(),
        tipo: formData.tipo,
        instituicao: formData.instituicao.trim(),
        conta_id: formData.conta_id || null,
        modo: 'saldo',
        valor_total: null,
        valor_parcela: null,
        total_parcelas: null,
        data_inicio: null,
        dia_vencimento: diaVencimento,
        saldo_atual: saldoAtual,
        pagamento_minimo: formData.pagamento_minimo ? parseFloat(formData.pagamento_minimo) : null,
        meta_pagamento: formData.meta_pagamento ? parseFloat(formData.meta_pagamento) : null,
        saldo_ultima_atualizacao: new Date().toISOString(),
        observacoes: formData.observacoes.trim() || null,
      };
    }

    if (isEditing && onUpdate && conta) {
      onUpdate({ id: conta.id, ...dataToSave });
    } else {
      onSave(dataToSave);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de modo - apenas na criação */}
          {!isEditing && (
            <Tabs value={modo} onValueChange={(v) => setModo(v as ModoContaAPagar)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="saldo">Conta Saldo</TabsTrigger>
                <TabsTrigger value="parcelada">Parcelada</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Campos comuns */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder={modo === 'parcelada' ? 'Ex: Levi\'s, Empréstimo XP' : 'Ex: Cartão Nubank, Financiamento'}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: 'cartao' | 'emprestimo' | 'outro') =>
                  setFormData({ ...formData, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_CONTA_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instituicao">Instituição *</Label>
              <Input
                id="instituicao"
                value={formData.instituicao}
                onChange={(e) => setFormData({ ...formData, instituicao: e.target.value })}
                placeholder="Ex: Nubank, Itaú"
                required
              />
            </div>
          </div>

          {accounts && accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="conta_id">Conta/Cartão (opcional)</Label>
              <Select
                value={formData.conta_id || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, conta_id: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nome} ({account.moeda})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Campos específicos para PARCELADA */}
          {modo === 'parcelada' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total *</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.valor_total}
                    onChange={(e) => {
                      setCalcMode('parcela');
                      setFormData({ ...formData, valor_total: e.target.value });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_parcelas">Parcelas *</Label>
                  <Input
                    id="total_parcelas"
                    type="number"
                    min="1"
                    value={formData.total_parcelas}
                    onChange={(e) => setFormData({ ...formData, total_parcelas: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor_parcela">Valor Parcela *</Label>
                  <Input
                    id="valor_parcela"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.valor_parcela}
                    onChange={(e) => {
                      setCalcMode('total');
                      setFormData({ ...formData, valor_parcela: e.target.value });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Mês/Ano 1ª Parcela *</Label>
                  <Input
                    id="data_inicio"
                    type="month"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dia_vencimento">Dia Vencimento *</Label>
                  <Input
                    id="dia_vencimento"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_vencimento}
                    onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                    placeholder="1-31"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Campos específicos para SALDO */}
          {modo === 'saldo' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="saldo_atual">
                    {isEditing ? 'Saldo Atual *' : 'Saldo Inicial *'}
                  </Label>
                  <Input
                    id="saldo_atual"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.saldo_atual}
                    onChange={(e) => setFormData({ ...formData, saldo_atual: e.target.value })}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dia_vencimento">Dia Vencimento *</Label>
                  <Input
                    id="dia_vencimento"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_vencimento}
                    onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                    placeholder="1-31"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pagamento_minimo">Pagamento Mínimo</Label>
                  <Input
                    id="pagamento_minimo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pagamento_minimo}
                    onChange={(e) => setFormData({ ...formData, pagamento_minimo: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_pagamento">Meta de Pagamento Mensal</Label>
                  <Input
                    id="meta_pagamento"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.meta_pagamento}
                    onChange={(e) => setFormData({ ...formData, meta_pagamento: e.target.value })}
                    placeholder="Quanto quer pagar por mês"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                A meta de pagamento define quanto você pretende pagar por mês. O sistema calculará automaticamente seu progresso.
              </p>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
