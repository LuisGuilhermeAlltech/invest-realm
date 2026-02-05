import { useState, useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, Plus, CreditCard, Receipt } from 'lucide-react';
import { CardPurchase } from '@/types/cardPurchases';
import { formatCurrency } from '@/lib/formatters';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CardPurchaseModal } from './CardPurchaseModal';

interface CardPurchasesSectionProps {
  purchases: CardPurchase[];
  onCreatePurchase: (data: Omit<CardPurchase, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdatePurchase: (data: Partial<CardPurchase> & { id: string }) => void;
  onDeletePurchase: (id: string) => void;
  onMarkAsIncluded: (data: { id: string; statementMonth: string }) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  existingCards: string[];
  existingCategories: string[];
}

export function CardPurchasesSection({
  purchases,
  onCreatePurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onMarkAsIncluded,
  isCreating,
  isUpdating,
  isDeleting,
  existingCards,
  existingCategories,
}: CardPurchasesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<CardPurchase | null>(null);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [selectedCard, setSelectedCard] = useState<string>('todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Generate month options (last 12 months + current)
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

    return purchases.filter(p => {
      const inMonth = p.purchase_date >= monthStart && p.purchase_date <= monthEnd;
      const matchesCard = selectedCard === 'todos' || p.card_name === selectedCard;
      const matchesCategory = selectedCategory === 'todos' || p.category === selectedCategory;
      return inMonth && matchesCard && matchesCategory;
    });
  }, [purchases, selectedMonth, selectedCard, selectedCategory]);

  // Calculate total
  const monthlyTotal = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + Number(p.amount), 0);
  }, [filteredPurchases]);

  // Group by category for summary
  const byCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredPurchases.forEach(p => {
      grouped[p.category] = (grouped[p.category] || 0) + Number(p.amount);
    });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }, [filteredPurchases]);

  const handleEdit = (purchase: CardPurchase) => {
    setEditingPurchase(purchase);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPurchase(null);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'dd/MM/yyyy');
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Total do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">
            {formatCurrency(monthlyTotal, 'BRL')}
          </div>
          {byCategory.length > 0 && (
            <div className="mt-3 space-y-1">
              {byCategory.slice(0, 5).map(([cat, total]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cat}</span>
                  <span>{formatCurrency(total, 'BRL')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Mês</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {existingCards.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Cartão</Label>
            <Select value={selectedCard} onValueChange={setSelectedCard}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {existingCards.map((card) => (
                  <SelectItem key={card} value={card}>
                    {card}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {existingCategories.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {existingCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1" />

        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Compra
        </Button>
      </div>

      {/* Purchases Table */}
      {filteredPurchases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-md">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma compra encontrada neste período.</p>
          <Button variant="link" onClick={() => setModalOpen(true)}>
            Registrar primeira compra
          </Button>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Estabelecimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(purchase.purchase_date)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {purchase.description}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{purchase.category}</Badge>
                  </TableCell>
                  <TableCell>{purchase.card_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {purchase.store || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(purchase.amount), 'BRL')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(purchase)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Deseja realmente excluir esta compra?')) {
                            onDeletePurchase(purchase.id);
                          }
                        }}
                        title="Excluir"
                        disabled={isDeleting}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal */}
      <CardPurchaseModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        purchase={editingPurchase}
        existingCards={existingCards}
        existingCategories={existingCategories}
        onSave={onCreatePurchase}
        onUpdate={onUpdatePurchase}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
}
