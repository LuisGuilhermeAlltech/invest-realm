import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContasAPagar } from '@/hooks/useContasAPagar';
import { useInstallments } from '@/hooks/useInstallments';
import { useCardPurchases } from '@/hooks/useCardPurchases';
import { ContasAPagarResumo } from '@/components/contasAPagar/ContasAPagarResumo';
import { ContasParceladasTable } from '@/components/contasAPagar/ContasParceladasTable';
import { ContasSaldoSection } from '@/components/contasAPagar/ContasSaldoSection';
import { CardPurchasesSection } from '@/components/contasAPagar/CardPurchasesSection';
import { ContaAPagarModal } from '@/components/contasAPagar/ContaAPagarModal';
import { ContaSaldoDetalheDrawer } from '@/components/contasAPagar/ContaSaldoDetalheDrawer';
import { ContaAPagarComCalculos, StatusContaAPagar, TipoContaAPagar } from '@/types/contasAPagar';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContasAPagar() {
  const {
    contasParceladas,
    contasSaldo,
    isLoading,
    processarBaixaAutomatica,
    createConta,
    updateConta,
    quitarConta,
    registrarMovimentacao,
    getMovimentacoesConta,
    isCreating,
    isUpdating,
    isQuiting,
    isRegistrandoMovimentacao,
    resumo,
  } = useContasAPagar();

  const {
    getInstallmentsForBill,
    getBillSummary,
    payInstallment,
    isPaying,
    getMonthlyCommitment,
    getTotalPending,
  } = useInstallments();

  const {
    cardPurchases,
    isLoading: isLoadingPurchases,
    createPurchase,
    updatePurchase,
    deletePurchase,
    markAsIncluded,
    isCreating: isCreatingPurchase,
    isUpdating: isUpdatingPurchase,
    isDeleting: isDeletingPurchase,
    getCardNames,
    getCategories,
    getMonthlyTotal,
  } = useCardPurchases();

  const [modalOpen, setModalOpen] = useState(false);
  const [contaEditando, setContaEditando] = useState<ContaAPagarComCalculos | null>(null);
  const [contaSaldoDetalhe, setContaSaldoDetalhe] = useState<ContaAPagarComCalculos | null>(null);
  const [baixaProcessada, setBaixaProcessada] = useState(false);
  const [activeTab, setActiveTab] = useState<'parceladas' | 'saldo' | 'cartao'>('saldo');

  // Filtros
  const [statusFiltro, setStatusFiltro] = useState<StatusContaAPagar | 'todos'>('ativo');
  const [tipoFiltro, setTipoFiltro] = useState<TipoContaAPagar | 'todos'>('todos');

  // Processar baixa automática ao entrar na aba (deprecated - now using installments)
  useEffect(() => {
    if (!baixaProcessada && !isLoading) {
      // No longer automatically processing - installments handle this
      setBaixaProcessada(true);
    }
  }, [isLoading, baixaProcessada]);

  // Calculate real-time resumo based on installments
  const realTimeResumo = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Use installments for parceladas calculations
    const compromissoMensalParceladas = getMonthlyCommitment(anoAtual, mesAtual);
    const totalParcelasEmAberto = getTotalPending();

    // Card purchases for current month
    const totalCartaoMes = getMonthlyTotal(anoAtual, mesAtual);

    return {
      ...resumo,
      compromissoMensalParceladas,
      totalParcelasEmAberto,
      totalCartaoMes,
      // Override total em aberto to use installments-based calculation
      totalEmAberto: totalParcelasEmAberto + resumo.totalSaldoAtual,
      compromissoMensal: compromissoMensalParceladas + resumo.compromissoMensal - resumo.compromissoMensalParceladas,
    };
  }, [resumo, getMonthlyCommitment, getTotalPending, getMonthlyTotal]);

  // Aplicar filtros para parceladas
  const contasParceladasFiltradas = useMemo(() => {
    let resultado = [...contasParceladas];

    if (statusFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.status === statusFiltro);
    }

    if (tipoFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.tipo === tipoFiltro);
    }

    resultado.sort((a, b) => b.valor_restante - a.valor_restante);
    return resultado;
  }, [contasParceladas, statusFiltro, tipoFiltro]);

  // Aplicar filtros para saldo
  const contasSaldoFiltradas = useMemo(() => {
    let resultado = [...contasSaldo];

    if (statusFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.status === statusFiltro);
    }

    if (tipoFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.tipo === tipoFiltro);
    }

    resultado.sort((a, b) => b.valor_restante - a.valor_restante);
    return resultado;
  }, [contasSaldo, statusFiltro, tipoFiltro]);

  const handleEdit = (conta: ContaAPagarComCalculos) => {
    setContaEditando(conta);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setContaEditando(null);
  };

  const handleOpenDetalhe = (conta: ContaAPagarComCalculos) => {
    setContaSaldoDetalhe(conta);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">
            Controle de parcelas, empréstimos, dívidas e compras no cartão
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Cards de Resumo */}
      <ContasAPagarResumo resumo={realTimeResumo} activeTab={activeTab} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'parceladas' | 'saldo' | 'cartao')}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="saldo" className="gap-2">
            Contas Saldo
            {resumo.qtdContasSaldo > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {resumo.qtdContasSaldo}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="parceladas" className="gap-2">
            Parceladas
            {resumo.qtdContasParceladas > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {resumo.qtdContasParceladas}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="cartao" className="gap-2">
            Cartão à Vista
            {cardPurchases.length > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {cardPurchases.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saldo" className="mt-6">
          <ContasSaldoSection
            contas={contasSaldoFiltradas}
            onEdit={handleEdit}
            onQuitar={quitarConta}
            onOpenDetalhe={handleOpenDetalhe}
            onRegistrarMovimentacao={registrarMovimentacao}
            isQuiting={isQuiting}
            isRegistrandoMovimentacao={isRegistrandoMovimentacao}
            statusFiltro={statusFiltro}
            setStatusFiltro={setStatusFiltro}
            tipoFiltro={tipoFiltro}
            setTipoFiltro={setTipoFiltro}
          />
        </TabsContent>

        <TabsContent value="parceladas" className="mt-6">
          <ContasParceladasTable
            contas={contasParceladasFiltradas}
            onEdit={handleEdit}
            onQuitar={quitarConta}
            isQuiting={isQuiting}
            statusFiltro={statusFiltro}
            setStatusFiltro={setStatusFiltro}
            tipoFiltro={tipoFiltro}
            setTipoFiltro={setTipoFiltro}
            getInstallmentsForBill={getInstallmentsForBill}
            getBillSummary={getBillSummary}
            onPayInstallment={payInstallment}
            isPaying={isPaying}
          />
        </TabsContent>

        <TabsContent value="cartao" className="mt-6">
          <CardPurchasesSection
            purchases={cardPurchases}
            onCreatePurchase={createPurchase}
            onUpdatePurchase={updatePurchase}
            onDeletePurchase={deletePurchase}
            onMarkAsIncluded={markAsIncluded}
            isCreating={isCreatingPurchase}
            isUpdating={isUpdatingPurchase}
            isDeleting={isDeletingPurchase}
            existingCards={getCardNames()}
            existingCategories={getCategories()}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Criar/Editar */}
      <ContaAPagarModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        conta={contaEditando}
        onSave={createConta}
        onUpdate={updateConta}
        isLoading={isCreating || isUpdating}
      />

      {/* Drawer de Detalhes da Conta Saldo */}
      <ContaSaldoDetalheDrawer
        conta={contaSaldoDetalhe}
        onClose={() => setContaSaldoDetalhe(null)}
        movimentacoes={contaSaldoDetalhe ? getMovimentacoesConta(contaSaldoDetalhe.id) : []}
        onRegistrarMovimentacao={registrarMovimentacao}
        isRegistrandoMovimentacao={isRegistrandoMovimentacao}
      />
    </div>
  );
}
