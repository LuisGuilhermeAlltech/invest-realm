import { useState, useEffect } from 'react';
import { useMetas } from '@/hooks/useMetas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CLASSE_LABELS, ClasseAtivo } from '@/types/database';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const CLASSES: ClasseAtivo[] = ['renda_fixa', 'fii', 'acoes_br', 'acoes_eua', 'cripto'];

export default function Metas() {
  const { metas, isLoading, saveMetas } = useMetas();
  const [values, setValues] = useState<Record<ClasseAtivo, string>>({} as Record<ClasseAtivo, string>);

  useEffect(() => {
    const initial: Record<ClasseAtivo, string> = {} as Record<ClasseAtivo, string>;
    CLASSES.forEach((c) => { initial[c] = metas.find((m) => m.classe === c)?.percentual_alvo?.toString() || '0'; });
    setValues(initial);
  }, [metas]);

  const total = Object.values(values).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  const isValid = Math.abs(total - 100) < 0.01;

  const handleSave = () => {
    if (!isValid) return;
    saveMetas(CLASSES.map((c) => ({ classe: c, percentual_alvo: parseFloat(values[c]) || 0 })));
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="text-muted-foreground">Carregando...</div></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Metas de Alocação</h1>
      <Card className="border-border max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg">Percentuais por Classe</CardTitle>
          <CardDescription>A soma deve ser 100%</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CLASSES.map((classe) => (
            <div key={classe} className="flex items-center gap-4">
              <Label className="w-32 text-sm">{CLASSE_LABELS[classe]}</Label>
              <Input type="number" min="0" max="100" step="0.1" className="w-24 font-mono" value={values[classe] || ''} onChange={(e) => setValues({ ...values, [classe]: e.target.value })} />
              <span className="text-muted-foreground">%</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-4 border-t border-border">
            <span className="text-sm font-medium">Total:</span>
            <span className={cn('font-mono font-bold', isValid ? 'text-positive' : 'text-negative')}>{total.toFixed(1)}%</span>
            {isValid ? <Check className="h-4 w-4 text-positive" /> : <AlertCircle className="h-4 w-4 text-negative" />}
          </div>
          {!isValid && <p className="text-sm text-negative">A soma deve ser exatamente 100%</p>}
          <Button onClick={handleSave} disabled={!isValid} className="w-full">Salvar Metas</Button>
        </CardContent>
      </Card>
    </div>
  );
}
