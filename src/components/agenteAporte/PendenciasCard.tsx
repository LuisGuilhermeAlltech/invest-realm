import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Settings } from 'lucide-react';
import { PendingCounts } from '@/types/agenteAporte';

interface Props {
  counts: PendingCounts;
  onResolve: () => void;
}

export function PendenciasCard({ counts, onResolve }: Props) {
  const total = counts.sem_mapeamento + counts.sem_valuation + counts.sem_preco;
  
  if (total === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Pendencias ({total})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          {counts.sem_mapeamento > 0 && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">
              {counts.sem_mapeamento} sem mapeamento
            </Badge>
          )}
          {counts.sem_valuation > 0 && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">
              {counts.sem_valuation} sem valuation
            </Badge>
          )}
          {counts.sem_preco > 0 && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">
              {counts.sem_preco} sem preco
            </Badge>
          )}
        </div>
        <Button onClick={onResolve} size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Resolver agora
        </Button>
      </CardContent>
    </Card>
  );
}