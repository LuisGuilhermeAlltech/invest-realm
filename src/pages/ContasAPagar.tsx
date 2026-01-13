import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useContasAPagar } from '@/hooks/useContasAPagar';
import { ContasAPagarResumo } from '@/components/contasAPagar/ContasAPagarResumo';
import { ContasAPagarFiltros } from '@/components/contasAPagar/ContasAPagarFiltros';
import { ContasAPagarTable } from '@/components/contasAPagar/ContasAPagarTable';
import { ContaAPagarModal } from '@/components/contasAPagar/ContaAPagarModal';
import { ContaAPagarComCalculos, StatusContaAPagar, TipoContaAPagar, ModoContaAPagar } from '@/types/contasAPagar';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContasAPagar() {
  const {
    contasAPagar,
    isLoading,
    processarBaixaAutomatica,
    createConta,
    updateConta,
    quitarConta,
    atualizarSaldo,
    isCreating,
    isUpdating,
    isQuiting,
    isAtualizandoSaldo,
    instituicoes,
    resumo,
  } = useContasAPagar();

  const [modalOpen, setModalOpen] = useState(false);
  const [contaEditando, setContaEditando] = useState<ContaAPagarComCalculos | null>(null);
  const [baixaProcessada, setBaixaProcessada] = useState(false);

  // Filtros
  const [statusFiltro, setStatusFiltro] = useState<StatusContaAPagar | 'todos'>('ativo');
  const [modoFiltro, setModoFiltro] = useState<ModoContaAPagar | 'todos'>('todos');
  const [tipoFiltro, setTipoFiltro] = useState<TipoContaAPagar | 'todos'>('todos');
  const [instituicaoFiltro, setInstituicaoFiltro] = useState<string>('todos');

  // Processar baixa automática ao entrar na aba
  useEffect(() => {
    if (!baixaProcessada && !isLoading) {
      processarBaixaAutomatica();
      setBaixaProcessada(true);
    }
  }, [isLoading, baixaProcessada, processarBaixaAutomatica]);

  // Aplicar filtros e ordenação
  const contasFiltradas = useMemo(() => {
    let resultado = [...contasAPagar];

    // Filtro de status
    if (statusFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.status === statusFiltro);
    }

    // Filtro de modo
    if (modoFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.modo === modoFiltro);
    }

    // Filtro de tipo
    if (tipoFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.tipo === tipoFiltro);
    }

    // Filtro de instituição
    if (instituicaoFiltro !== 'todos') {
      resultado = resultado.filter((c) => c.instituicao === instituicaoFiltro);
    }

    // Ordenar por valor restante (maior primeiro)
    resultado.sort((a, b) => b.valor_restante - a.valor_restante);

    return resultado;
  }, [contasAPagar, statusFiltro, modoFiltro, tipoFiltro, instituicaoFiltro]);

  const handleEdit = (conta: ContaAPagarComCalculos) => {
    setContaEditando(conta);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setContaEditando(null);
  };

  const handleAtualizarSaldo = (id: string, novoSaldo: number) => {
    atualizarSaldo({ id, novoSaldo });
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
            Controle de parcelas, empréstimos e saldos
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Cards de Resumo */}
      <ContasAPagarResumo
        totalEmAberto={resumo.totalEmAberto}
        compromissoMensal={resumo.compromissoMensal}
        qtdAtivas={resumo.qtdAtivas}
        variacaoTotalMes={resumo.variacaoTotalMes}
      />

      {/* Filtros */}
      <ContasAPagarFiltros
        statusFiltro={statusFiltro}
        setStatusFiltro={setStatusFiltro}
        modoFiltro={modoFiltro}
        setModoFiltro={setModoFiltro}
        tipoFiltro={tipoFiltro}
        setTipoFiltro={setTipoFiltro}
        instituicaoFiltro={instituicaoFiltro}
        setInstituicaoFiltro={setInstituicaoFiltro}
        instituicoes={instituicoes}
      />

      {/* Tabela */}
      <ContasAPagarTable
        contas={contasFiltradas}
        onEdit={handleEdit}
        onQuitar={quitarConta}
        onAtualizarSaldo={handleAtualizarSaldo}
        isQuiting={isQuiting}
        isAtualizandoSaldo={isAtualizandoSaldo}
      />

      {/* Modal */}
      <ContaAPagarModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        conta={contaEditando}
        onSave={createConta}
        onUpdate={updateConta}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
}
