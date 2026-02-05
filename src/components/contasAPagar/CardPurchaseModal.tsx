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
import { CardPurchase, DEFAULT_CATEGORIES } from '@/types/cardPurchases';
import { format } from 'date-fns';

interface CardPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase?: CardPurchase | null;
  existingCards: string[];
  existingCategories: string[];
  onSave: (data: Omit<CardPurchase, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onUpdate?: (data: Partial<CardPurchase> & { id: string }) => void;
  isLoading?: boolean;
}

export function CardPurchaseModal({
  open,
  onOpenChange,
  purchase,
  existingCards,
  existingCategories,
  onSave,
  onUpdate,
  isLoading = false,
}: CardPurchaseModalProps) {
  const isEditing = !!purchase;
  
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    card_name: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    store: '',
    notes: '',
  });

  const [newCard, setNewCard] = useState('');
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    if (purchase) {
      setFormData({
        description: purchase.description,
        category: purchase.category,
        card_name: purchase.card_name,
        purchase_date: purchase.purchase_date,
        amount: String(purchase.amount),
        store: purchase.store || '',
        notes: purchase.notes || '',
      });
    } else if (open) {
      setFormData({
        description: '',
        category: '',
        card_name: existingCards[0] || '',
        purchase_date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        store: '',
        notes: '',
      });
      setShowNewCard(false);
      setShowNewCategory(false);
      setNewCard('');
      setNewCategory('');
    }
  }, [purchase, open, existingCards]);

  // Combine existing categories with defaults
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCategories])].sort();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cardName = showNewCard ? newCard.trim() : formData.card_name;
    const category = showNewCategory ? newCategory.trim() : formData.category;

    if (!formData.description.trim() || !cardName || !category || !formData.amount) {
      return;
    }

    const dataToSave = {
      description: formData.description.trim(),
      category,
      card_name: cardName,
      purchase_date: formData.purchase_date,
      amount: parseFloat(formData.amount),
      store: formData.store.trim() || null,
      notes: formData.notes.trim() || null,
      receipt_url: purchase?.receipt_url || null,
      included_in_statement_month: purchase?.included_in_statement_month || null,
    };

    if (isEditing && onUpdate && purchase) {
      onUpdate({ id: purchase.id, ...dataToSave });
    } else {
      onSave(dataToSave);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Compra' : 'Nova Compra no Cartão'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Almoço, Gasolina, Mercado..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Data *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Card selection */}
          <div className="space-y-2">
            <Label>Cartão *</Label>
            {showNewCard ? (
              <div className="flex gap-2">
                <Input
                  value={newCard}
                  onChange={(e) => setNewCard(e.target.value)}
                  placeholder="Nome do cartão"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewCard(false);
                    setNewCard('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.card_name}
                  onValueChange={(value) => setFormData({ ...formData, card_name: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCards.map((card) => (
                      <SelectItem key={card} value={card}>
                        {card}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCard(true)}
                >
                  + Novo
                </Button>
              </div>
            )}
          </div>

          {/* Category selection */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            {showNewCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nova categoria"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategory('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategory(true)}
                >
                  + Nova
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="store">Estabelecimento</Label>
            <Input
              id="store"
              value={formData.store}
              onChange={(e) => setFormData({ ...formData, store: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Opcional..."
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
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
