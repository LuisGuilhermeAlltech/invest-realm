import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Clock, XCircle, AlertCircle, Search } from 'lucide-react';
import { AgentInputPerAsset, AgentDecision, AgentAction, ASSET_TYPE_LABELS } from '@/types/agenteAporte';
import { formatCurrency } from '@/lib/formatters';
import { Moeda } from '@/types/database';

interface Props {
  assets: (AgentInputPerAsset & { decision: AgentDecision })[];
  onAssetClick: (asset: AgentInputPerAsset) => void;
}

const ACTION_CONFIG: Record<AgentAction, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  comprar: { label: 'COMPRAR', color: 'bg-green-600', icon: TrendingUp },
  esperar: { label: 'ESPERAR', color: 'bg-yellow-600', icon: Clock },
  evitar: { label: 'EVITAR', color: 'bg-red-600', icon: XCircle },
};

export function TodosAtivosTab({ assets, onAssetClick }: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showOnlyOpportunities, setShowOnlyOpportunities] = useState(false);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // Search filter
      if (search && !asset.asset_code.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && asset.asset_type !== filterType) {
        return false;
      }

      // Opportunities filter
      if (showOnlyOpportunities) {
        const hasOpportunity = asset.decision.action === 'comprar' || 
          (asset.decision.metrics.margem_seguranca_pct !== undefined && 
           asset.decision.metrics.margem_seguranca_pct >= 5);
        if (!hasOpportunity) return false;
      }

      // Pending filter
      if (showOnlyPending) {
        const hasPending = !asset.valuation_type || 
          (!asset.price_current && asset.asset_type !== 'renda_fixa');
        if (!hasPending) return false;
      }

      return true;
    });
  }, [assets, search, filterType, showOnlyOpportunities, showOnlyPending]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="search" className="sr-only">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Buscar ativo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-w-[150px]">
          <Label htmlFor="type-filter" className="text-xs text-muted-foreground mb-1 block">
            Tipo
          </Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger id="type-filter">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(ASSET_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="opportunities"
              checked={showOnlyOpportunities}
              onCheckedChange={(checked) => setShowOnlyOpportunities(!!checked)}
            />
            <Label htmlFor="opportunities" className="text-sm cursor-pointer">
              Oportunidades
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="pending"
              checked={showOnlyPending}
              onCheckedChange={(checked) => setShowOnlyPending(!!checked)}
            />
            <Label htmlFor="pending" className="text-sm cursor-pointer">
              Pendencias
            </Label>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredAssets.length} ativo(s)
      </p>

      {/* Assets grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAssets.map(asset => {
          const config = ACTION_CONFIG[asset.decision.action];
          const Icon = config.icon;
          const hasPriceIssue = !asset.price_current && asset.asset_type !== 'renda_fixa';
          const hasValuationIssue = !asset.valuation_type;

          return (
            <Card
              key={asset.asset_code}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onAssetClick(asset)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{asset.asset_code}</h3>
                    <p className="text-xs text-muted-foreground">
                      {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}
                    </p>
                  </div>
                  <Badge className={`${config.color} text-white text-xs`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Preco:</span>
                    <p className="font-medium">
                      {asset.price_current
                        ? formatCurrency(asset.price_current, (asset.price_currency || 'BRL') as Moeda)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Justo:</span>
                    <p className="font-medium">
                      {asset.fair_value
                        ? formatCurrency(asset.fair_value, (asset.valuation_currency || 'BRL') as Moeda)
                        : '—'}
                    </p>
                  </div>
                </div>

                {asset.decision.metrics.margem_seguranca_pct !== undefined && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs text-muted-foreground">Margem:</span>
                    <span className={`text-sm font-medium ${
                      asset.decision.metrics.margem_seguranca_pct >= 20 ? 'text-green-600' :
                      asset.decision.metrics.margem_seguranca_pct >= 5 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {asset.decision.metrics.margem_seguranca_pct.toFixed(1)}%
                    </span>
                  </div>
                )}

                <p className="text-xs text-muted-foreground line-clamp-1">
                  {asset.decision.rationale}
                </p>

                {(hasPriceIssue || hasValuationIssue) && (
                  <div className="flex gap-1 mt-2">
                    {hasPriceIssue && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Preco
                      </Badge>
                    )}
                    {hasValuationIssue && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Valuation
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAssets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum ativo encontrado com os filtros selecionados.
        </div>
      )}
    </div>
  );
}