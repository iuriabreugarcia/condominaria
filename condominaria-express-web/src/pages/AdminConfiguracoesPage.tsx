import {
  Building2,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Mail,
  Megaphone,
  PackageCheck,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAdminRouteContext } from '../components/AdminProtectedRoute';
import { AdminShell } from '../components/AdminShell';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  apiRequest,
  ApiError,
} from '../lib/api';
import type {
  AdminConfiguracoesCondominio,
  AtualizarConfiguracoesCondominioPayload,
  TipoPixCondominio,
} from '../types/api';

type ConfiguracoesForm = {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  nomeExibicaoPortal: string;
  logoUrl: string;
  mensagemBoasVindasPortal: string;
  instrucoesGeraisPortal: string;
  contatosUteisPortal: string;
  prazoPadraoCobrancaDias: string;
  instrucoesVisitantes: string;
  instrucoesEncomendas: string;
  politicaReservas: string;
  assinaturaComunicados: string;
  pixChave: string;
  pixTipo: string;
  beneficiarioPagamento: string;
  bancoPagamento: string;
  instrucoesPagamento: string;
  mensagemCobrancaPadrao: string;
};

type ResumoConfiguracaoVariant = 'orange' | 'green' | 'blue' | 'slate';

const tiposPix: Array<{
  value: TipoPixCondominio | 'OUTRA' | '';
  label: string;
}> = [
  { value: '', label: 'Não informado' },
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave aleatória' },
  { value: 'OUTRA', label: 'Outra' },
];

const formVazio: ConfiguracoesForm = {
  nome: '',
  cnpj: '',
  email: '',
  telefone: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  nomeExibicaoPortal: '',
  logoUrl: '',
  mensagemBoasVindasPortal: '',
  instrucoesGeraisPortal: '',
  contatosUteisPortal: '',
  prazoPadraoCobrancaDias: '',
  instrucoesVisitantes: '',
  instrucoesEncomendas: '',
  politicaReservas: '',
  assinaturaComunicados: '',
  pixChave: '',
  pixTipo: '',
  beneficiarioPagamento: '',
  bancoPagamento: '',
  instrucoesPagamento: '',
  mensagemCobrancaPadrao: '',
};

function obterMensagemErro(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const mensagem = error.message.trim();
    const normalizada = mensagem.toLowerCase();

    if (
      normalizada.includes('internal server error') ||
      normalizada.includes('prisma') ||
      normalizada.includes('unknown column') ||
      normalizada.includes('cannot read')
    ) {
      return 'Não foi possível processar as configurações agora. Verifique a estrutura técnica do sistema e tente novamente.';
    }

    if (mensagem) {
      return mensagem;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function valorTexto(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined) {
    return '';
  }

  return String(valor);
}

function formDeConfiguracoes(
  configuracoes: AdminConfiguracoesCondominio,
): ConfiguracoesForm {
  return {
    nome: valorTexto(configuracoes.nome),
    cnpj: valorTexto(configuracoes.cnpj),
    email: valorTexto(configuracoes.email),
    telefone: valorTexto(configuracoes.telefone),
    cep: valorTexto(configuracoes.cep),
    logradouro: valorTexto(configuracoes.logradouro),
    numero: valorTexto(configuracoes.numero),
    complemento: valorTexto(configuracoes.complemento),
    bairro: valorTexto(configuracoes.bairro),
    cidade: valorTexto(configuracoes.cidade),
    uf: valorTexto(configuracoes.uf),
    nomeExibicaoPortal: valorTexto(configuracoes.nomeExibicaoPortal),
    logoUrl: valorTexto(configuracoes.logoUrl),
    mensagemBoasVindasPortal: valorTexto(
      configuracoes.mensagemBoasVindasPortal,
    ),
    instrucoesGeraisPortal: valorTexto(configuracoes.instrucoesGeraisPortal),
    contatosUteisPortal: valorTexto(configuracoes.contatosUteisPortal),
    prazoPadraoCobrancaDias: valorTexto(
      configuracoes.prazoPadraoCobrancaDias,
    ),
    instrucoesVisitantes: valorTexto(configuracoes.instrucoesVisitantes),
    instrucoesEncomendas: valorTexto(configuracoes.instrucoesEncomendas),
    politicaReservas: valorTexto(configuracoes.politicaReservas),
    assinaturaComunicados: valorTexto(configuracoes.assinaturaComunicados),
    pixChave: valorTexto(configuracoes.pixChave),
    pixTipo: valorTexto(configuracoes.pixTipo),
    beneficiarioPagamento: valorTexto(configuracoes.beneficiarioPagamento),
    bancoPagamento: valorTexto(configuracoes.bancoPagamento),
    instrucoesPagamento: valorTexto(configuracoes.instrucoesPagamento),
    mensagemCobrancaPadrao: valorTexto(
      configuracoes.mensagemCobrancaPadrao,
    ),
  };
}

function normalizarTexto(valor: string) {
  const normalizado = valor.trim();

  return normalizado || undefined;
}

function inputClass() {
  return 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100';
}

function textareaClass() {
  return 'min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100';
}

function labelClass() {
  return 'text-xs font-bold uppercase tracking-[0.08em] text-slate-500';
}

function dataHoraLocal(valor: string | null | undefined) {
  if (!valor) {
    return '—';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function valorPreenchido(valor: string | number | null | undefined) {
  return String(valor ?? '').trim().length > 0;
}

function contarPreenchidos(campos: Array<string | number | null | undefined>) {
  return campos.filter(valorPreenchido).length;
}

function labelTipoPix(tipo: string) {
  return tiposPix.find((opcao) => opcao.value === tipo)?.label ?? 'Não informado';
}

function ResumoConfiguracaoCard({
  titulo,
  valor,
  detalhe,
  icon,
  variant = 'slate',
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icon: ReactNode;
  variant?: ResumoConfiguracaoVariant;
}) {
  const variants: Record<ResumoConfiguracaoVariant, string> = {
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    blue: 'border-sky-100 bg-sky-50 text-sky-700',
    slate: 'border-slate-100 bg-slate-50 text-slate-700',
  };

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {valor}
          </p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${variants[variant]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
        {detalhe}
      </p>
    </article>
  );
}

function ConfiguracaoStatusBadge({
  ok,
  textoOk = 'Configurado',
  textoPendente = 'Pendente',
}: {
  ok: boolean;
  textoOk?: string;
  textoPendente?: string;
}) {
  return (
    <span
      className={
        ok
          ? 'inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-emerald-700 ring-1 ring-emerald-100'
          : 'inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-amber-700 ring-1 ring-amber-100'
      }
    >
      {ok ? textoOk : textoPendente}
    </span>
  );
}

function PreviewInfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2">
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-bold text-slate-700">
        {String(value ?? '').trim() || '—'}
      </dd>
    </div>
  );
}

export function AdminConfiguracoesPage() {
  usePageTitle('Configurações do Condomínio');

  const {
    usuario,
    condominiosAdministrativos,
  } = useAdminRouteContext();

  const condominioInicial =
    condominiosAdministrativos.find((vinculo) => vinculo.principal)
      ?.condominio.id ??
    condominiosAdministrativos[0]?.condominio.id ??
    0;

  const [condominioId, setCondominioId] = useState(condominioInicial);
  const [configuracoes, setConfiguracoes] =
    useState<AdminConfiguracoesCondominio | null>(null);
  const [form, setForm] = useState<ConfiguracoesForm>(formVazio);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const condominioSelecionado = useMemo(
    () =>
      condominiosAdministrativos.find(
        (vinculo) => vinculo.condominio.id === condominioId,
      )?.condominio ?? null,
    [condominioId, condominiosAdministrativos],
  );

  const resumo = useMemo(() => {
    const dadosGerais = contarPreenchidos([
      form.nome,
      form.cnpj,
      form.email,
      form.telefone,
      form.cep,
      form.logradouro,
      form.cidade,
      form.uf,
    ]);

    const portal = contarPreenchidos([
      form.nomeExibicaoPortal,
      form.logoUrl,
      form.mensagemBoasVindasPortal,
      form.instrucoesGeraisPortal,
      form.contatosUteisPortal,
    ]);

    const financeiro = contarPreenchidos([
      form.pixChave,
      form.pixTipo,
      form.beneficiarioPagamento,
      form.bancoPagamento,
      form.prazoPadraoCobrancaDias,
      form.instrucoesPagamento,
      form.mensagemCobrancaPadrao,
    ]);

    const operacao = contarPreenchidos([
      form.instrucoesVisitantes,
      form.instrucoesEncomendas,
      form.politicaReservas,
      form.assinaturaComunicados,
    ]);

    return {
      dadosGerais,
      portal,
      financeiro,
      operacao,
    };
  }, [form]);

  const configuracaoFinanceiraOk = valorPreenchido(form.pixChave) || valorPreenchido(form.instrucoesPagamento);
  const portalOk = valorPreenchido(form.nomeExibicaoPortal) || valorPreenchido(form.mensagemBoasVindasPortal);
  const operacaoOk =
    valorPreenchido(form.instrucoesVisitantes) ||
    valorPreenchido(form.instrucoesEncomendas) ||
    valorPreenchido(form.politicaReservas);

  function atualizarCampo(campo: keyof ConfiguracoesForm, valor: string) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function carregarConfiguracoes() {
    if (!condominioId) {
      return;
    }

    setCarregando(true);
    setErro('');
    setMensagemSucesso('');

    try {
      const resposta = await apiRequest<AdminConfiguracoesCondominio>(
        `/condominios/${condominioId}/configuracoes`,
      );

      setConfiguracoes(resposta);
      setForm(formDeConfiguracoes(resposta));
    } catch (error) {
      setConfiguracoes(null);
      setForm(formVazio);
      setErro(
        obterMensagemErro(
          error,
          'Não foi possível carregar as configurações do condomínio.',
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarConfiguracoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  function montarPayload(): AtualizarConfiguracoesCondominioPayload {
    const prazoTexto = form.prazoPadraoCobrancaDias.trim();
    const prazoPadraoCobrancaDias = prazoTexto ? Number(prazoTexto) : null;

    return {
      nome: form.nome.trim(),
      cnpj: normalizarTexto(form.cnpj),
      email: normalizarTexto(form.email),
      telefone: normalizarTexto(form.telefone),
      cep: normalizarTexto(form.cep),
      logradouro: normalizarTexto(form.logradouro),
      numero: normalizarTexto(form.numero),
      complemento: normalizarTexto(form.complemento),
      bairro: normalizarTexto(form.bairro),
      cidade: normalizarTexto(form.cidade),
      uf: normalizarTexto(form.uf)?.toUpperCase(),
      nomeExibicaoPortal: normalizarTexto(form.nomeExibicaoPortal),
      logoUrl: normalizarTexto(form.logoUrl),
      mensagemBoasVindasPortal: normalizarTexto(
        form.mensagemBoasVindasPortal,
      ),
      instrucoesGeraisPortal: normalizarTexto(form.instrucoesGeraisPortal),
      contatosUteisPortal: normalizarTexto(form.contatosUteisPortal),
      prazoPadraoCobrancaDias,
      instrucoesVisitantes: normalizarTexto(form.instrucoesVisitantes),
      instrucoesEncomendas: normalizarTexto(form.instrucoesEncomendas),
      politicaReservas: normalizarTexto(form.politicaReservas),
      assinaturaComunicados: normalizarTexto(form.assinaturaComunicados),
      pixChave: normalizarTexto(form.pixChave),
      pixTipo: normalizarTexto(form.pixTipo),
      beneficiarioPagamento: normalizarTexto(form.beneficiarioPagamento),
      bancoPagamento: normalizarTexto(form.bancoPagamento),
      instrucoesPagamento: normalizarTexto(form.instrucoesPagamento),
      mensagemCobrancaPadrao: normalizarTexto(form.mensagemCobrancaPadrao),
    };
  }

  async function salvarConfiguracoes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId) {
      return;
    }

    if (!form.nome.trim()) {
      setErro('Informe o nome do condomínio.');
      return;
    }

    const prazoTexto = form.prazoPadraoCobrancaDias.trim();

    if (prazoTexto) {
      const prazo = Number(prazoTexto);

      if (!Number.isInteger(prazo) || prazo < 0 || prazo > 365) {
        setErro('O prazo padrão de cobrança deve estar entre 0 e 365 dias.');
        return;
      }
    }

    const confirmar = window.confirm(
      `Confirmar atualização das configurações de ${form.nome.trim()}?`,
    );

    if (!confirmar) {
      return;
    }

    setSalvando(true);
    setErro('');
    setMensagemSucesso('');

    try {
      const resposta = await apiRequest<AdminConfiguracoesCondominio>(
        `/condominios/${condominioId}/configuracoes`,
        {
          method: 'PATCH',
          body: JSON.stringify(montarPayload()),
        },
      );

      setConfiguracoes(resposta);
      setForm(formDeConfiguracoes(resposta));
      setMensagemSucesso('Configurações do condomínio salvas com sucesso.');
    } catch (error) {
      setErro(
        obterMensagemErro(
          error,
          'Não foi possível salvar as configurações do condomínio.',
        ),
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-orange-50 via-white to-slate-50 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                  <Settings className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-600">
                    Configurações
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    Dados e parâmetros do condomínio
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                    Centralize identidade, dados institucionais, instruções do
                    portal, parâmetros financeiros e orientações operacionais do
                    condomínio.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={condominioId}
                  onChange={(event) => setCondominioId(Number(event.target.value))}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {condominiosAdministrativos.map((vinculo) => (
                    <option
                      key={vinculo.condominio.id}
                      value={vinculo.condominio.id}
                    >
                      {vinculo.condominio.nome}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void carregarConfiguracoes()}
                  disabled={carregando || salvando || !condominioId}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {carregando ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Recarregar
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <ResumoConfiguracaoCard
              titulo="Dados gerais"
              valor={`${resumo.dadosGerais}/8`}
              detalhe="Identificação, contato e endereço básico."
              icon={<Building2 className="h-5 w-5" />}
              variant="orange"
            />
            <ResumoConfiguracaoCard
              titulo="Portal"
              valor={`${resumo.portal}/5`}
              detalhe="Identidade e instruções do portal do morador."
              icon={<ShieldCheck className="h-5 w-5" />}
              variant={portalOk ? 'green' : 'slate'}
            />
            <ResumoConfiguracaoCard
              titulo="Financeiro"
              valor={`${resumo.financeiro}/7`}
              detalhe="Pix, beneficiário, cobrança e instruções."
              icon={<CreditCard className="h-5 w-5" />}
              variant={configuracaoFinanceiraOk ? 'green' : 'blue'}
            />
            <ResumoConfiguracaoCard
              titulo="Operação"
              valor={`${resumo.operacao}/4`}
              detalhe="Visitantes, encomendas, reservas e assinatura."
              icon={<PackageCheck className="h-5 w-5" />}
              variant={operacaoOk ? 'green' : 'slate'}
            />
          </div>
        </section>

        {erro ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {erro}
          </div>
        ) : null}

        {mensagemSucesso ? (
          <div className="flex items-center gap-2 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {mensagemSucesso}
          </div>
        ) : null}

        <form onSubmit={salvarConfiguracoes} className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Dados gerais
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    Informações institucionais usadas em telas, relatórios e
                    documentos.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className={labelClass()}>Nome do condomínio</span>
                  <input
                    value={form.nome}
                    onChange={(event) => atualizarCampo('nome', event.target.value)}
                    className={inputClass()}
                    placeholder="Ex.: Residencial Primavera"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>CNPJ</span>
                  <input
                    value={form.cnpj}
                    onChange={(event) => atualizarCampo('cnpj', event.target.value)}
                    className={inputClass()}
                    placeholder="00.000.000/0000-00"
                  />
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>Telefone</span>
                  <input
                    value={form.telefone}
                    onChange={(event) => atualizarCampo('telefone', event.target.value)}
                    className={inputClass()}
                    placeholder="(00) 00000-0000"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className={labelClass()}>E-mail</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => atualizarCampo('email', event.target.value)}
                    className={inputClass()}
                    placeholder="administracao@condominio.com"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      Prévia do portal
                    </h3>
                    <p className="text-sm font-semibold text-slate-500">
                      Como o condomínio será apresentado ao morador.
                    </p>
                  </div>
                </div>

                <ConfiguracaoStatusBadge ok={portalOk} />
              </div>

              <div className="rounded-3xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-orange-700">
                  Portal do Morador
                </p>
                <h4 className="mt-2 text-xl font-bold text-orange-950">
                  {form.nomeExibicaoPortal.trim() || form.nome.trim() || condominioSelecionado?.nome || 'Condomínio'}
                </h4>
                <p className="mt-2 text-sm font-semibold leading-6 text-orange-900/80">
                  {form.mensagemBoasVindasPortal.trim() ||
                    'Mensagem de boas-vindas ainda não configurada.'}
                </p>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <PreviewInfoItem
                  label="Atualizado em"
                  value={dataHoraLocal(configuracoes?.atualizadoEm)}
                />
                <PreviewInfoItem
                  label="Slug"
                  value={configuracoes?.slug}
                />
                <PreviewInfoItem
                  label="Pix"
                  value={form.pixChave ? labelTipoPix(form.pixTipo) : 'Não informado'}
                />
                <PreviewInfoItem
                  label="Condomínio"
                  value={condominioSelecionado?.nome}
                />
              </dl>
            </article>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Endereço
                </h3>
                <p className="text-sm font-semibold text-slate-500">
                  Usado em relatórios, recibos e comunicações oficiais.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <label className="space-y-2 md:col-span-2">
                <span className={labelClass()}>CEP</span>
                <input
                  value={form.cep}
                  onChange={(event) => atualizarCampo('cep', event.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2 md:col-span-3">
                <span className={labelClass()}>Logradouro</span>
                <input
                  value={form.logradouro}
                  onChange={(event) => atualizarCampo('logradouro', event.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className={labelClass()}>Número</span>
                <input
                  value={form.numero}
                  onChange={(event) => atualizarCampo('numero', event.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className={labelClass()}>Complemento</span>
                <input
                  value={form.complemento}
                  onChange={(event) => atualizarCampo('complemento', event.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className={labelClass()}>Bairro</span>
                <input
                  value={form.bairro}
                  onChange={(event) => atualizarCampo('bairro', event.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2 md:col-span-1">
                <span className={labelClass()}>Cidade</span>
                <input
                  value={form.cidade}
                  onChange={(event) => atualizarCampo('cidade', event.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2 md:col-span-1">
                <span className={labelClass()}>UF</span>
                <input
                  value={form.uf}
                  onChange={(event) => atualizarCampo('uf', event.target.value.toUpperCase().slice(0, 2))}
                  className={inputClass()}
                  maxLength={2}
                />
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Portal e identidade
                </h3>
                <p className="text-sm font-semibold text-slate-500">
                  Textos e identidade exibidos ao morador.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="space-y-2">
                <span className={labelClass()}>Nome exibido no portal</span>
                <input
                  value={form.nomeExibicaoPortal}
                  onChange={(event) => atualizarCampo('nomeExibicaoPortal', event.target.value)}
                  className={inputClass()}
                />
              </label>

              <label className="space-y-2">
                <span className={labelClass()}>URL da logo</span>
                <input
                  value={form.logoUrl}
                  onChange={(event) => atualizarCampo('logoUrl', event.target.value)}
                  className={inputClass()}
                  placeholder="https://..."
                />
              </label>

              <label className="space-y-2">
                <span className={labelClass()}>Mensagem de boas-vindas</span>
                <textarea
                  value={form.mensagemBoasVindasPortal}
                  onChange={(event) => atualizarCampo('mensagemBoasVindasPortal', event.target.value)}
                  className={textareaClass()}
                  placeholder="Mensagem exibida aos moradores no portal."
                />
              </label>

              <label className="space-y-2">
                <span className={labelClass()}>Instruções gerais</span>
                <textarea
                  value={form.instrucoesGeraisPortal}
                  onChange={(event) => atualizarCampo('instrucoesGeraisPortal', event.target.value)}
                  className={textareaClass()}
                />
              </label>

              <label className="space-y-2">
                <span className={labelClass()}>Contatos úteis</span>
                <textarea
                  value={form.contatosUteisPortal}
                  onChange={(event) => atualizarCampo('contatosUteisPortal', event.target.value)}
                  className={textareaClass()}
                  placeholder="Portaria, administração, emergência, síndico..."
                />
              </label>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      Financeiro
                    </h3>
                    <p className="text-sm font-semibold text-slate-500">
                      Pix, instruções de pagamento e prazo padrão.
                    </p>
                  </div>
                </div>

                <ConfiguracaoStatusBadge ok={configuracaoFinanceiraOk} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className={labelClass()}>Chave Pix</span>
                  <input
                    value={form.pixChave}
                    onChange={(event) => atualizarCampo('pixChave', event.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>Tipo da chave</span>
                  <select
                    value={form.pixTipo}
                    onChange={(event) => atualizarCampo('pixTipo', event.target.value)}
                    className={inputClass()}
                  >
                    {tiposPix.map((tipo) => (
                      <option key={tipo.value || 'VAZIO'} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>Beneficiário</span>
                  <input
                    value={form.beneficiarioPagamento}
                    onChange={(event) => atualizarCampo('beneficiarioPagamento', event.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>Banco/observação</span>
                  <input
                    value={form.bancoPagamento}
                    onChange={(event) => atualizarCampo('bancoPagamento', event.target.value)}
                    className={inputClass()}
                  />
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>Prazo padrão de cobrança</span>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={form.prazoPadraoCobrancaDias}
                    onChange={(event) => atualizarCampo('prazoPadraoCobrancaDias', event.target.value)}
                    className={inputClass()}
                    placeholder="Ex.: 10"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className={labelClass()}>Instruções de pagamento</span>
                  <textarea
                    value={form.instrucoesPagamento}
                    onChange={(event) => atualizarCampo('instrucoesPagamento', event.target.value)}
                    className={textareaClass()}
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className={labelClass()}>Mensagem padrão de cobrança</span>
                  <textarea
                    value={form.mensagemCobrancaPadrao}
                    onChange={(event) => atualizarCampo('mensagemCobrancaPadrao', event.target.value)}
                    className={textareaClass()}
                  />
                </label>
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      Operação e portaria
                    </h3>
                    <p className="text-sm font-semibold text-slate-500">
                      Regras exibidas nas rotinas de visitantes, encomendas e
                      reservas.
                    </p>
                  </div>
                </div>

                <ConfiguracaoStatusBadge ok={operacaoOk} />
              </div>

              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className={labelClass()}>Instruções para visitantes</span>
                  <textarea
                    value={form.instrucoesVisitantes}
                    onChange={(event) => atualizarCampo('instrucoesVisitantes', event.target.value)}
                    className={textareaClass()}
                  />
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>Instruções para encomendas</span>
                  <textarea
                    value={form.instrucoesEncomendas}
                    onChange={(event) => atualizarCampo('instrucoesEncomendas', event.target.value)}
                    className={textareaClass()}
                  />
                </label>

                <label className="space-y-2">
                  <span className={labelClass()}>Política geral de reservas</span>
                  <textarea
                    value={form.politicaReservas}
                    onChange={(event) => atualizarCampo('politicaReservas', event.target.value)}
                    className={textareaClass()}
                  />
                </label>
              </div>
            </article>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Comunicação
                </h3>
                <p className="text-sm font-semibold text-slate-500">
                  Assinatura usada como base para comunicados oficiais.
                </p>
              </div>
            </div>

            <label className="space-y-2">
              <span className={labelClass()}>Assinatura padrão de comunicados</span>
              <textarea
                value={form.assinaturaComunicados}
                onChange={(event) => atualizarCampo('assinaturaComunicados', event.target.value)}
                className={textareaClass()}
                placeholder="Ex.: Administração do condomínio"
              />
            </label>
          </section>

          <div className="sticky bottom-4 z-20 flex justify-end">
            <button
              type="submit"
              disabled={salvando || carregando || !condominioId}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar configurações
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}
