import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, XCircle, ChevronRight } from 'lucide-react';
import { AgentInputPerAsset, AgentDecision, AgentAction, ASSET_TYPE_LABELS } from '@/types/agenteAporte';
import { formatCurrency } from '@/lib/formatters';
import { Moeda } from '@/types/database';

interface Props {
  opportunities: (AgentInputPerAsset & { decision: AgentDecision })[];
  onAssetClick: (asset: AgentInputPerAsset) => void;
}

const ACTION_CONFIG: Record<AgentAction, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  comprar: { label: 'COMPRAR', color: 'bg-green-600', icon: TrendingUp },
  esperar: { label: 'ESPERAR', color: 'bg-yellow-600', icon: Clock },
  evitar: { label: 'EVITAR', color: 'bg-red-600', icon: XCircle },
};

export function TopOportunidadesCard({ opportunities, onAssetClick }: Props) {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Oportunidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma oportunidade disponivel. Configure valuations para seus ativos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Oportunidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {opportunities.map((item) => {
          const config = ACTION_CONFIG[item.decision.action];
          const Icon = config.icon;
          const margin = item.decision.metrics.margem_seguranca_pct;
          
          return (
            <div
              key={item.asset_code}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onAssetClick(item)}
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium">{item.asset_code}</div>
                  <div className="text-xs text-muted-foreground">
                    {ASSET_TYPE_LABELS[item.asset_type] || item.asset_type}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {margin !== undefined && (
                  <div className={`text-sm font-medium ${
                    margin >= 20 ? 'text-green-600' :
                    margin >= 5 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {margin.toFixed(1)}%
                  </div>
                )}
                
                {item.decision.metrics.current_rate !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    Taxa: {item.decision.metrics.current_rate.toFixed(2)}%
                  </div>
                )}
                
                <Badge className={`${config.color} text-white text-xs`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}