import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContasAPagar } from '@/hooks/useContasAPagar';
import { useInstallments } from '@/hooks/useInstallments';
import { useCardPurchases } from '@/hooks/useCardPurchases';
import { useReceivables } from '@/hooks/useReceivables';
import { ContasAPagarResumo } from '@/components/contasAPagar/ContasAPagarResumo';
import { ContasParceladasTable } from '@/components/contasAPagar/ContasParceladasTable';
import { ContasSaldoSection } from '@/components/contasAPagar/ContasSaldoSection';
import { CardPurchasesSection } from '@/components/contasAPagar/CardPurchasesSection';
import { DebtPanoramaBlock } from '@/components/contasAPagar/DebtPanoramaBlock';
import { ContaAPagarModal } from '@/components/contasAPagar/ContaAPagarModal';
import { ContaSaldoDetalheDrawer } from '@/components/contasAPagar/ContaSaldoDetalheDrawer';
import { ReceivableSaldoSection } from '@/components/contasReceber/ReceivableSaldoSection';
import { ReceivableParceladoSection } from '@/components/contasReceber/ReceivableParceladoSection';
import { NovaContaReceberModal } from '@/components/contasReceber/NovaContaReceberModal';
import { ContaAPagarComCalculos, StatusContaAPagar, TipoContaAPagar } from '@/types/contasAPagar';
import { ReceivableWithCalculations, ReceivableStatus } from '@/types/receivables';
import { Skeleton } from '@/components/ui/skeleton';

type MainTab = 'pagar' | 'receber';
type PayableSubTab = 'saldo' | 'parceladas' | 'cartao';
type ReceivableSubTab = 'saldo' | 'parceladas';

export default function ContasAPagar() {
  const {
    contasParceladas,
    contasSaldo,
    isLoading: isLoadingPayables,
    createConta,
    updateConta,
    quitarConta,
    registrarMovimentacao,
    definirMetaMensalSaldo,
    definirSaldoInicialMensal,
    getResumoMensalContaSaldo,
    getMovimentacoesConta,
    isCreating: isCreatingPayable,
    isUpdating: isUpdatingPayable,
    isQuiting,
    isRegistrandoMovimentacao,
    isDefinindoMetaMensal,
    isDefinindoSaldoInicialMensal,
    resumo,
  } = useContasAPagar();

  const {
    getBillSummary,
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

  const {
    receivablesSaldo,
    receivablesParcelado,
    installments: receivableInstallments,
    isLoading: isLoadingReceivables,
    createReceivable,
    updateReceivable,
    closeReceivable,
    registerPayment,
    isCreating: isCreatingReceivable,
    isUpdating: isUpdatingReceivable,
    isClosing,
    isRegistering,
  } = useReceivables();

  // Main tabs
  const [mainTab, setMainTab] = useState<MainTab>('pagar');
  const [payableSubTab, setPayableSubTab] = useState<PayableSubTab>('saldo');
  const [receivableSubTab, setReceivableSubTab] = useState<ReceivableSubTab>('parceladas');

  // Modals
  const [modalPayableOpen, setModalPayableOpen] = useState(false);
  const [contaEditando, setContaEditando] = useState<ContaAPagarComCalculos | null>(null);
  const [contaSaldoDetalhe, setContaSaldoDetalhe] = useState<ContaAPagarComCalculos | null>(null);
  
  const [modalReceivableOpen, setModalReceivableOpen] = useState(false);
  const [receivableEditando, setReceivableEditando] = useState<ReceivableWithCalculations | null>(null);

  // Filters - Payables
  const [statusFiltroPayable, setStatusFiltroPayable] = useState<StatusContaAPagar | 'todos'>('ativo');
  const [tipoFiltroPayable, setTipoFiltroPayable] = useState<TipoContaAPagar | 'todos'>('todos');
  
  // Filters - Receivables
  const [statusFiltroReceivable, setStatusFiltroReceivable] = useState<ReceivableStatus | 'todos'>('active');

  // Calculate real-time resumo based on installments
  const realTimeResumo = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    const compromissoMensalParceladas = getMonthlyCommitment(anoAtual, mesAtual);
    const totalParcelasEmAberto = getTotalPending();
    const totalCartaoMes = getMonthlyTotal(anoAtual, mesAtual);

    return {
      ...resumo,
      compromissoMensalParceladas,
      totalParcelasEmAberto,
      totalCartaoMes,
      totalEmAberto: totalParcelasEmAberto + resumo.totalSaldoAtual,
      compromissoMensal: compromissoMensalParceladas + resumo.compromissoMensal - resumo.compromissoMensalParceladas,
    };
  }, [resumo, getMonthlyCommitment, getTotalPending, getMonthlyTotal]);

  // Filter payables
  const contasParceladasFiltradas = useMemo(() => {
    let resultado = [...contasParceladas];
    if (statusFiltroPayable !== 'todos') {
      resultado = resultado.filter((c) => c.status === statusFiltroPayable);
    }
    if (tipoFiltroPayable !== 'todos') {
      resultado = resultado.filter((c) => c.tipo === tipoFiltroPayable);
    }
    resultado.sort((a, b) => b.valor_restante - a.valor_restante);
    return resultado;
  }, [contasParceladas, statusFiltroPayable, tipoFiltroPayable]);

  const contasSaldoFiltradas = useMemo(() => {
    let resultado = [...contasSaldo];
    if (statusFiltroPayable !== 'todos') {
      resultado = resultado.filter((c) => c.status === statusFiltroPayable);
    }
    if (tipoFiltroPayable !== 'todos') {
      resultado = resultado.filter((c) => c.tipo === tipoFiltroPayable);
    }
    resultado.sort((a, b) => b.valor_restante - a.valor_restante);
    return resultado;
  }, [contasSaldo, statusFiltroPayable, tipoFiltroPayable]);

  // Filter receivables
  const receivablesSaldoFiltradas = useMemo(() => {
    if (statusFiltroReceivable === 'todos') return receivablesSaldo;
    return receivablesSaldo.filter((r) => r.status === statusFiltroReceivable);
  }, [receivablesSaldo, statusFiltroReceivable]);

  const receivablesParceladoFiltradas = useMemo(() => {
    if (statusFiltroReceivable === 'todos') return receivablesParcelado;
    return receivablesParcelado.filter((r) => r.status === statusFiltroReceivable);
  }, [receivablesParcelado, statusFiltroReceivable]);

  const handleEditPayable = (conta: ContaAPagarComCalculos) => {
    setContaEditando(conta);
    setModalPayableOpen(true);
  };

  const handleClosePayableModal = () => {
    setModalPayableOpen(false);
    setContaEditando(null);
  };

  const handleEditReceivable = (receivable: ReceivableWithCalculations) => {
    setReceivableEditando(receivable);
    setModalReceivableOpen(true);
  };

  const handleCloseReceivableModal = () => {
    setModalReceivableOpen(false);
    setReceivableEditando(null);
  };

  const isLoading = isLoadingPayables || isLoadingReceivables;

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
      {/* Evolução mensal das dívidas (início do mês) */}
      <DebtPanoramaBlock />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Controle de contas a pagar e a receber
          </p>
        </div>
        <div className="flex gap-2">
          {mainTab === 'pagar' && (
            <Button onClick={() => setModalPayableOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta a Pagar
            </Button>
          )}
          {mainTab === 'receber' && (
            <Button onClick={() => setModalReceivableOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta a Receber
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
          <TabsTrigger value="receber">A Receber</TabsTrigger>
        </TabsList>

        {/* A Pagar Tab */}
        <TabsContent value="pagar" className="mt-6">
          <ContasAPagarResumo resumo={realTimeResumo} activeTab={payableSubTab} />
          
          <Tabs value={payableSubTab} onValueChange={(v) => setPayableSubTab(v as PayableSubTab)} className="mt-6">
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
                onEdit={handleEditPayable}
                onQuitar={quitarConta}
                onOpenDetalhe={setContaSaldoDetalhe}
                onRegistrarMovimentacao={registrarMovimentacao}
                onDefinirMetaMensal={definirMetaMensalSaldo}
                onDefinirSaldoInicialMensal={definirSaldoInicialMensal}
                getResumoMensalConta={getResumoMensalContaSaldo}
                getMovimentacoesConta={getMovimentacoesConta}
                isQuiting={isQuiting}
                isRegistrandoMovimentacao={isRegistrandoMovimentacao}
                isDefinindoMetaMensal={isDefinindoMetaMensal}
                isDefinindoSaldoInicialMensal={isDefinindoSaldoInicialMensal}
                statusFiltro={statusFiltroPayable}
                setStatusFiltro={setStatusFiltroPayable}
                tipoFiltro={tipoFiltroPayable}
                setTipoFiltro={setTipoFiltroPayable}
              />
            </TabsContent>

            <TabsContent value="parceladas" className="mt-6">
              <ContasParceladasTable
                contas={contasParceladasFiltradas}
                onEdit={handleEditPayable}
                onQuitar={quitarConta}
                isQuiting={isQuiting}
                statusFiltro={statusFiltroPayable}
                setStatusFiltro={setStatusFiltroPayable}
                tipoFiltro={tipoFiltroPayable}
                setTipoFiltro={setTipoFiltroPayable}
                getBillSummary={getBillSummary}
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
        </TabsContent>

        {/* A Receber Tab */}
        <TabsContent value="receber" className="mt-6">
          <Tabs value={receivableSubTab} onValueChange={(v) => setReceivableSubTab(v as ReceivableSubTab)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="parceladas" className="gap-2">
                Parceladas
                {receivablesParcelado.length > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {receivablesParcelado.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="saldo" className="gap-2">
                Contas Saldo
                {receivablesSaldo.length > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {receivablesSaldo.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="parceladas" className="mt-6">
              <ReceivableParceladoSection
                receivables={receivablesParceladoFiltradas}
                installments={receivableInstallments}
                onEdit={handleEditReceivable}
                onClose={closeReceivable}
                onRegisterPayment={registerPayment}
                isClosing={isClosing}
                isRegistering={isRegistering}
                statusFiltro={statusFiltroReceivable}
                setStatusFiltro={setStatusFiltroReceivable}
              />
            </TabsContent>

            <TabsContent value="saldo" className="mt-6">
              <ReceivableSaldoSection
                receivables={receivablesSaldoFiltradas}
                onEdit={handleEditReceivable}
                onClose={closeReceivable}
                onRegisterPayment={registerPayment}
                isClosing={isClosing}
                isRegistering={isRegistering}
                statusFiltro={statusFiltroReceivable}
                setStatusFiltro={setStatusFiltroReceivable}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Modals - Payables */}
      <ContaAPagarModal
        open={modalPayableOpen}
        onOpenChange={handleClosePayableModal}
        conta={contaEditando}
        onSave={createConta}
        onUpdate={updateConta}
        isLoading={isCreatingPayable || isUpdatingPayable}
      />

      <ContaSaldoDetalheDrawer
        conta={contaSaldoDetalhe}
        onClose={() => setContaSaldoDetalhe(null)}
        movimentacoes={contaSaldoDetalhe ? getMovimentacoesConta(contaSaldoDetalhe.id) : []}
        onRegistrarMovimentacao={registrarMovimentacao}
        isRegistrandoMovimentacao={isRegistrandoMovimentacao}
      />

      {/* Modals - Receivables */}
      <NovaContaReceberModal
        open={modalReceivableOpen}
        onOpenChange={handleCloseReceivableModal}
        receivable={receivableEditando}
        onSave={async (data) => { await createReceivable(data); }}
        onUpdate={async (data) => { await updateReceivable(data); }}
        isLoading={isCreatingReceivable || isUpdatingReceivable}
      />
    </div>
  );
}
