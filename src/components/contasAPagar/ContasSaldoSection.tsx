import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CircleArrowDown,
  CircleArrowUp,
  CircleDot,
  CircleEqual,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  ContaAPagarComCalculos,
  StatusContaAPagar,
  TipoContaAPagar,
  TipoMovimentacaoSaldo,
  TIPO_MOVIMENTACAO_COLORS,
} from '@/types/contasAPagar';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ContaSaldoResumoMensalDetalhado } from '@/hooks/useContasAPagar';

interface ContasSaldoSectionProps {
  contas: ContaAPagarComCalculos[];
  onEdit: (conta: ContaAPagarComCalculos) => void;
  onQuitar: (id: string) => void;
  onOpenDetalhe: (conta: ContaAPagarComCalculos) => void;
  onRegistrarMovimentacao: (params: {
    contaId: string;
    tipo: TipoMovimentacaoSaldo;
    valor: number;
    observacao?: string;
    data?: string;
    empresaOrigem?: string;
    empresaDestino?: string;
    contaSaida?: string;
    contaEntrada?: string;
    comprovanteUrl?: string;
  }) => void;
  onDefinirMetaMensal: (params: {
    contaId: string;
    competencia: string;
    valorMeta: number;
    tipoMeta: 'reducao' | 'aumento';
  }) => void;
  onDefinirSaldoInicialMensal: (params: {
    contaId: string;
    competencia: string;
    valorSaldoInicial: number;
    observacao?: string;
  }) => void;
  getResumoMensalConta: (
    contaId: string,
    ano: number,
    mes: number,
  ) => ContaSaldoResumoMensalDetalhado | null;
  isQuiting?: boolean;
  isRegistrandoMovimentacao?: boolean;
  isDefinindoMetaMensal?: boolean;
  isDefinindoSaldoInicialMensal?: boolean;
  statusFiltro: StatusContaAPagar | 'todos';
  setStatusFiltro: (value: StatusContaAPagar | 'todos') => void;
  tipoFiltro: TipoContaAPagar | 'todos';
  setTipoFiltro: (value: TipoContaAPagar | 'todos') => void;
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const NOME_DEVEDORA_EXIBICAO = 'Guilherme';

function getCompetencia(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`;
}

function getTipoLinha(tipo: TipoMovimentacaoSaldo) {
  if (tipo === 'pagamento') return 'Pagou';
  if (tipo === 'acrescimo') return 'Pegou';
  return 'Ajuste';
}

function getTipoIcon(tipo: TipoMovimentacaoSaldo) {
  if (tipo === 'pagamento') return <CircleArrowDown className="h-3 w-3" />;
  if (tipo === 'acrescimo') return <CircleArrowUp className="h-3 w-3" />;
  return <CircleEqual className="h-3 w-3" />;
}

export function ContasSaldoSection({
  contas,
  onEdit,
  onQuitar,
  onOpenDetalhe,
  onRegistrarMovimentacao,
  onDefinirMetaMensal,
  onDefinirSaldoInicialMensal,
  getResumoMensalConta,
  isQuiting = false,
  isRegistrandoMovimentacao = false,
  isDefinindoMetaMensal = false,
  isDefinindoSaldoInicialMensal = false,
}: ContasSaldoSectionProps) {
  const hoje = new Date();

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [contaSelecionadaId, setContaSelecionadaId] = useState<string>('');

  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaValor, setMetaValor] = useState('');
  const [metaReducao, setMetaReducao] = useState(true);

  const [saldoInicialModalOpen, setSaldoInicialModalOpen] = useState(false);
  const [saldoInicialValor, setSaldoInicialValor] = useState('');

  const [novoLancamentoOpen, setNovoLancamentoOpen] = useState(false);
  const [lancamentoTipo, setLancamentoTipo] = useState<TipoMovimentacaoSaldo>('acrescimo');
  const [lancamentoData, setLancamentoData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lancamentoValor, setLancamentoValor] = useState('');
  const [lancamentoEmpresaOrigem, setLancamentoEmpresaOrigem] = useState('');
  const [lancamentoEmpresaDestino, setLancamentoEmpresaDestino] = useState('');
  const [lancamentoContaSaida, setLancamentoContaSaida] = useState('');
  const [lancamentoContaEntrada, setLancamentoContaEntrada] = useState('');
  const [lancamentoDescricao, setLancamentoDescricao] = useState('');
  const [lancamentoComprovanteUrl, setLancamentoComprovanteUrl] = useState('');

  useEffect(() => {
    if (!contas.length) {
      setContaSelecionadaId('');
      return;
    }

    const existeSelecionada = contas.some((conta) => conta.id === contaSelecionadaId);
    if (!contaSelecionadaId || !existeSelecionada) {
      setContaSelecionadaId(contas[0].id);
    }
  }, [contas, contaSelecionadaId]);

  const contaSelecionada = useMemo(
    () => contas.find((conta) => conta.id === contaSelecionadaId) || null,
    [contas, contaSelecionadaId],
  );

  const resumoMensal = useMemo(() => {
    if (!contaSelecionada) return null;
    return getResumoMensalConta(contaSelecionada.id, ano, mes);
  }, [contaSelecionada, getResumoMensalConta, ano, mes]);

  useEffect(() => {
    if (!contaSelecionada || !resumoMensal) return;

    setLancamentoEmpresaOrigem(resumoMensal.movimentacoesMes[0]?.empresa_origem || contaSelecionada.instituicao);
    setLancamentoEmpresaDestino(
      resumoMensal.movimentacoesMes[0]?.empresa_destino || NOME_DEVEDORA_EXIBICAO,
    );
    setSaldoInicialValor(resumoMensal.saldoInicial.toString());
  }, [contaSelecionada, resumoMensal]);

  if (contas.length === 0 || !contaSelecionada) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-md">
        Nenhuma conta de saldo encontrada.
      </div>
    );
  }

  const competencia = getCompetencia(ano, mes);
  const saldoInicial = resumoMensal?.saldoInicial || 0;
  const totalPegouMes = resumoMensal?.totalAcrescidoMes || 0;
  const totalPagouMes = resumoMensal?.totalPagoMes || 0;
  const variacaoMes = resumoMensal?.variacaoMes || 0;
  const saldoFinal = resumoMensal?.saldoFinal || saldoInicial;
  const movimentacoesMes = resumoMensal?.movimentacoesMes || [];
  const metaMensal = resumoMensal?.metaMensal || null;

  const progressoMeta = metaMensal
    ? Math.min((totalPagouMes / metaMensal.valor_meta) * 100, 100)
    : 0;

  const textoResumoVariacao =
    variacaoMes > 0 ? 'Dívida aumentou' : variacaoMes < 0 ? 'Dívida reduziu' : 'Sem variação';

  const handleSalvarMetaMensal = () => {
    if (!contaSelecionada) return;

    const valorMeta = Number(metaValor);
    if (!valorMeta || valorMeta <= 0) return;

    onDefinirMetaMensal({
      contaId: contaSelecionada.id,
      competencia,
      valorMeta,
      tipoMeta: metaReducao ? 'reducao' : 'aumento',
    });

    setMetaModalOpen(false);
    setMetaValor('');
  };

  const handleSalvarSaldoInicialMensal = () => {
    if (!contaSelecionada) return;

    const valorSaldoInicial = Number(saldoInicialValor);
    if (Number.isNaN(valorSaldoInicial) || valorSaldoInicial < 0) return;

    onDefinirSaldoInicialMensal({
      contaId: contaSelecionada.id,
      competencia,
      valorSaldoInicial,
      observacao: 'Saldo inicial mensal definido pela tela de contas saldo',
    });

    setSaldoInicialModalOpen(false);
  };

  const handleSalvarLancamento = () => {
    if (!contaSelecionada) return;

    const valor = Number(lancamentoValor);
    if (!valor || valor <= 0) return;

    onRegistrarMovimentacao({
      contaId: contaSelecionada.id,
      tipo: lancamentoTipo,
      valor,
      data: lancamentoData,
      observacao: lancamentoDescricao || undefined,
      empresaOrigem: lancamentoEmpresaOrigem || undefined,
      empresaDestino: lancamentoEmpresaDestino || undefined,
      contaSaida: lancamentoContaSaida || undefined,
      contaEntrada: lancamentoContaEntrada || undefined,
      comprovanteUrl: lancamentoComprovanteUrl || undefined,
    });

    setNovoLancamentoOpen(false);
    setLancamentoValor('');
    setLancamentoDescricao('');
    setLancamentoContaSaida('');
    setLancamentoContaEntrada('');
    setLancamentoComprovanteUrl('');
  };

  const anosDisponiveis = Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - 3 + i);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((anoItem) => (
                    <SelectItem key={anoItem} value={String(anoItem)}>
                      {anoItem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mesLabel, idx) => (
                    <SelectItem key={mesLabel} value={String(idx + 1)}>
                      {mesLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Credora</Label>
              <Select
                value={contaSelecionada.id}
                onValueChange={(id) => {
                  setContaSelecionadaId(id);
                  const conta = contas.find((item) => item.id === id);
                  if (conta) {
                    setLancamentoEmpresaOrigem(conta.instituicao);
                    setLancamentoEmpresaDestino(NOME_DEVEDORA_EXIBICAO);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.instituicao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Devedora</Label>
              <Select value={contaSelecionada.id} onValueChange={setContaSelecionadaId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {NOME_DEVEDORA_EXIBICAO}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                <p className="text-3xl font-bold">{formatCurrency(saldoInicial, 'BRL')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-sm font-medium">Pegou no Mês</p>
                </div>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(totalPegouMes, 'BRL')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingDown className="h-4 w-4" />
                  <p className="text-sm font-medium">Pagou no Mês</p>
                </div>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalPagouMes, 'BRL')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Variação</p>
                <p className={`text-3xl font-bold ${variacaoMes > 0 ? 'text-destructive' : variacaoMes < 0 ? 'text-green-600' : ''}`}>
                  {variacaoMes > 0 ? '+' : ''}
                  {formatCurrency(variacaoMes, 'BRL')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{textoResumoVariacao}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Saldo Final</p>
                <p className="text-3xl font-bold text-destructive">{formatCurrency(saldoFinal, 'BRL')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {NOME_DEVEDORA_EXIBICAO} deve para {contaSelecionada.instituicao}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Meta de Pagamento (Variação)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!metaMensal ? (
                <div className="flex flex-col items-center justify-center gap-4 py-4 text-muted-foreground">
                  <p>Nenhuma meta definida para este mês.</p>
                  <Button variant="outline" onClick={() => setMetaModalOpen(true)}>
                    <Target className="h-4 w-4 mr-2" />
                    Definir Meta do Mês
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Meta ({metaMensal.tipo_meta === 'reducao' ? 'redução' : 'aumento'}):{' '}
                      <span className="font-semibold text-foreground">{formatCurrency(metaMensal.valor_meta, 'BRL')}</span>
                    </p>
                    <Button variant="outline" size="sm" onClick={() => {
                      setMetaValor(metaMensal.valor_meta.toString());
                      setMetaReducao(metaMensal.tipo_meta === 'reducao');
                      setMetaModalOpen(true);
                    }}>
                      Editar Meta
                    </Button>
                  </div>
                  <Progress value={progressoMeta} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Pago no mês: {formatCurrency(totalPagouMes, 'BRL')} ({progressoMeta.toFixed(0)}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-lg">
                <span className="font-semibold">Resumo de {MESES[mes - 1]}/{ano}:</span>{' '}
                {NOME_DEVEDORA_EXIBICAO} pegou <span className="font-semibold text-destructive">{formatCurrency(totalPegouMes, 'BRL')}</span>,
                pagou <span className="font-semibold text-green-600">{formatCurrency(totalPagouMes, 'BRL')}</span>, variação de{' '}
                <span className={`font-semibold ${variacaoMes > 0 ? 'text-destructive' : variacaoMes < 0 ? 'text-green-600' : ''}`}>
                  {variacaoMes > 0 ? '+' : ''}
                  {formatCurrency(variacaoMes, 'BRL')}
                </span>.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setNovoLancamentoOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
            <Button variant="outline" onClick={() => setSaldoInicialModalOpen(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Definir Saldo Inicial do Mês
            </Button>
            <Button variant="ghost" onClick={() => onOpenDetalhe(contaSelecionada)}>
              Ver Detalhes da Conta
            </Button>
            <Button variant="ghost" onClick={() => onEdit(contaSelecionada)}>
              Editar Conta
            </Button>
            <Button
              variant="ghost"
              disabled={isQuiting}
              onClick={() => {
                if (confirm('Deseja realmente quitar esta conta?')) {
                  onQuitar(contaSelecionada.id);
                }
              }}
            >
              Quitar Conta
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Lançamentos - {MESES[mes - 1]}/{ano}</CardTitle>
            </CardHeader>
            <CardContent>
              {movimentacoesMes.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">Nenhum lançamento neste mês.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Conta Saída</TableHead>
                      <TableHead>Conta Entrada</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoesMes.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>{format(new Date(`${mov.data}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell>{mov.empresa_origem || contaSelecionada.instituicao}</TableCell>
                        <TableCell>{mov.empresa_destino || NOME_DEVEDORA_EXIBICAO}</TableCell>
                        <TableCell>{mov.conta_saida || '-'}</TableCell>
                        <TableCell>{mov.conta_entrada || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(mov.valor, 'BRL')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TIPO_MOVIMENTACAO_COLORS[mov.tipo_movimentacao]}>
                            {getTipoIcon(mov.tipo_movimentacao)}
                            <span className="ml-1">{getTipoLinha(mov.tipo_movimentacao)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">{mov.observacao || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Dialog open={metaModalOpen} onOpenChange={setMetaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Meta de Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Defina a meta de variação para {MESES[mes - 1]}/{ano}.
            </p>
            <div className="space-y-2">
              <Label>Valor da Meta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={metaValor}
                onChange={(e) => setMetaValor(e.target.value)}
                placeholder="Ex: 10000"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="meta-reducao"
                checked={metaReducao}
                onCheckedChange={(checked) => setMetaReducao(checked === true)}
              />
              <Label htmlFor="meta-reducao">Meta é redução (pagar dívida)</Label>
            </div>

            <p className="text-sm text-muted-foreground">
              Se você digitar 10.000, a meta será reduzir R$ 10.000 da dívida (variação ≤ -10.000).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaModalOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={isDefinindoMetaMensal} onClick={handleSalvarMetaMensal}>
              {isDefinindoMetaMensal ? 'Salvando...' : 'Salvar Meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saldoInicialModalOpen} onOpenChange={setSaldoInicialModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Saldo Inicial do Mês</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Defina o saldo inicial de {MESES[mes - 1]}/{ano} para o par {contaSelecionada.instituicao} (credora) e {NOME_DEVEDORA_EXIBICAO} (devedora).
            </p>
            <div className="space-y-2">
              <Label>Saldo Inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={saldoInicialValor}
                onChange={(e) => setSaldoInicialValor(e.target.value)}
                placeholder="0"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Valor positivo = {NOME_DEVEDORA_EXIBICAO} deve para {contaSelecionada.instituicao}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaldoInicialModalOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={isDefinindoSaldoInicialMensal} onClick={handleSalvarSaldoInicialMensal}>
              {isDefinindoSaldoInicialMensal ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={novoLancamentoOpen} onOpenChange={setNovoLancamentoOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={lancamentoData} onChange={(e) => setLancamentoData(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={lancamentoValor}
                onChange={(e) => setLancamentoValor(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={lancamentoTipo} onValueChange={(v) => setLancamentoTipo(v as TipoMovimentacaoSaldo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acrescimo">Pegou (acresce saldo)</SelectItem>
                  <SelectItem value="pagamento">Pagou (reduz saldo)</SelectItem>
                  <SelectItem value="ajuste">Ajuste de saldo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Empresa Origem</Label>
              <Input
                value={lancamentoEmpresaOrigem}
                onChange={(e) => setLancamentoEmpresaOrigem(e.target.value)}
                placeholder="Selecione"
              />
            </div>

            <div className="space-y-2">
              <Label>Empresa Destino</Label>
              <Input
                value={lancamentoEmpresaDestino}
                onChange={(e) => setLancamentoEmpresaDestino(e.target.value)}
                placeholder="Selecione"
              />
            </div>

            <div className="space-y-2">
              <Label>Conta de Saída (Origem)</Label>
              <Input
                value={lancamentoContaSaida}
                onChange={(e) => setLancamentoContaSaida(e.target.value)}
                placeholder="Ex: Bradesco • Ag 1234 • CC 56789-0"
              />
            </div>

            <div className="space-y-2">
              <Label>Conta de Entrada (Destino)</Label>
              <Input
                value={lancamentoContaEntrada}
                onChange={(e) => setLancamentoContaEntrada(e.target.value)}
                placeholder="Ex: Nubank • PIX CNPJ"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={lancamentoDescricao}
                onChange={(e) => setLancamentoDescricao(e.target.value)}
                placeholder="Ex: cobriu caixa, pagamento parcial..."
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Comprovante (URL opcional)</Label>
              <Input
                value={lancamentoComprovanteUrl}
                onChange={(e) => setLancamentoComprovanteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoLancamentoOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={isRegistrandoMovimentacao} onClick={handleSalvarLancamento}>
              {isRegistrandoMovimentacao ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
