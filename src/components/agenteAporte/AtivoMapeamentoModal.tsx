import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAgenteAporte } from '@/hooks/useAgenteAporte';
import { AgentInputPerAsset, ASSET_TYPE_LABELS } from '@/types/agenteAporte';
import { Save, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  asset?: AgentInputPerAsset | null;
  embedded?: boolean;
}

const ASSET_TYPES = [
  { value: 'acao_br', label: 'Acao BR' },
  { value: 'acao_us', label: 'Acao US' },
  { value: 'etf', label: 'ETF' },
  { value: 'fii', label: 'FII' },
  { value: 'cripto', label: 'Cripto' },
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'outros', label: 'Outros' },
];

const CURRENCIES = [
  { value: 'BRL', label: 'BRL' },
  { value: 'USD', label: 'USD' },
];

export function AtivoMapeamentoModal({ open, onClose, asset, embedded = false }: Props) {
  const { assets, agentInputs, updateAsset, isLoading } = useAgenteAporte();
  
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    asset_type: '',
    currency: '',
    symbol_public: '',
    exchange: '',
  });

  useEffect(() => {
    if (asset) {
      setEditingAsset(asset.asset_code);
      setFormData({
        asset_type: asset.asset_type,
        currency: asset.asset_currency,
        symbol_public: asset.symbol_public || '',
        exchange: asset.exchange || '',
      });
    }
  }, [asset]);

  const handleEdit = (assetInput: AgentInputPerAsset) => {
    setEditingAsset(assetInput.asset_code);
    setFormData({
      asset_type: assetInput.asset_type,
      currency: assetInput.asset_currency,
      symbol_public: assetInput.symbol_public || '',
      exchange: assetInput.exchange || '',
    });
  };

  const handleSave = () => {
    if (!editingAsset) return;
    
    updateAsset({
      asset_code: editingAsset,
      asset_type: formData.asset_type as any,
      currency: formData.currency,
      symbol_public: formData.symbol_public || null,
      exchange: formData.exchange || null,
    });
    
    setEditingAsset(null);
  };

  const handleCancel = () => {
    setEditingAsset(null);
    if (asset) {
      onClose();
    }
  };

  const content = (
    <div className="space-y-4">
      {editingAsset && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Editando: {editingAsset}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="asset_type">Tipo de Ativo</Label>
                <Select
                  value={formData.asset_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, asset_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Moeda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="symbol_public">Simbolo Publico</Label>
                <Input
                  id="symbol_public"
                  value={formData.symbol_public}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbol_public: e.target.value }))}
                  placeholder="Ex: BBAS3.SA, AAPL"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Simbolo usado na API (Yahoo Finance, CoinGecko)
                </p>
              </div>

              <div>
                <Label htmlFor="exchange">Bolsa</Label>
                <Input
                  id="exchange"
                  value={formData.exchange}
                  onChange={(e) => setFormData(prev => ({ ...prev, exchange: e.target.value }))}
                  placeholder="Ex: B3, NYSE, CRYPTO"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!asset && (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead>Simbolo Publico</TableHead>
                <TableHead>Bolsa</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentInputs.map((item) => (
                <TableRow key={item.asset_code}>
                  <TableCell className="font-medium">{item.asset_code}</TableCell>
                  <TableCell>{ASSET_TYPE_LABELS[item.asset_type] || item.asset_type}</TableCell>
                  <TableCell>{item.asset_currency}</TableCell>
                  <TableCell>{item.symbol_public || '—'}</TableCell>
                  <TableCell>{item.exchange || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      disabled={editingAsset === item.asset_code}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {agentInputs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum ativo mapeado. Sincronize sua carteira primeiro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asset ? `Editar Mapeamento: ${asset.asset_code}` : 'Mapeamento de Ativos'}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
