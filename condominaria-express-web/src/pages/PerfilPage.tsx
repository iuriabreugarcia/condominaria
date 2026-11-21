import {
  BellRing,
  Building2,
  CheckCircle2,
  ContactRound,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppShell } from '../components/AppShell';
import {
  ErrorState,
  LoadingState,
} from '../components/FeedbackState';
import { usePortal } from '../context/PortalContext';
import { usePortalConfiguracoes } from '../hooks/usePortalConfiguracoes';
import { usePageTitle } from '../hooks/usePageTitle';
import { ApiError, apiRequest } from '../lib/api';
import { obterMoradorAtivo } from '../lib/portal';
import type {
  NotificacoesPreferenciasPortalResponse,
  PortalMoradorMeResponse,
  PreferenciasNotificacoesPortal,
  TipoNotificacaoPortal,
} from '../types/api';

type EstadoPagina = {
  carregando: boolean;
  erro: string;
  contexto: PortalMoradorMeResponse | null;
};

type ResumoPerfilCardProps = {
  titulo: string;
  valor: string | number;
  descricao: string;
  variante?: 'orange' | 'emerald' | 'slate' | 'blue';
};

type InfoPerfilItemProps = {
  label: string;
  valor: string | number | null | undefined;
  icon?: React.ReactNode;
};

const preferenciasPadraoNotificacoesPortal: PreferenciasNotificacoesPortal = {
  COBRANCAS: true,
  COMUNICADOS: true,
  RESERVAS: true,
  OCORRENCIAS: true,
  ENCOMENDAS: true,
  VOTACOES: true,
  ASSEMBLEIAS: true,
};

const categoriasPreferenciasNotificacoes: Array<{
  tipo: TipoNotificacaoPortal;
  titulo: string;
  descricao: string;
  critica?: boolean;
}> = [
  {
    tipo: 'COBRANCAS',
    titulo: 'Cobranças',
    descricao: 'Avisos de cobranças pendentes, pagas e vencidas.',
    critica: true,
  },
  {
    tipo: 'COMUNICADOS',
    titulo: 'Comunicados',
    descricao: 'Avisos publicados pela administração do condomínio.',
  },
  {
    tipo: 'RESERVAS',
    titulo: 'Reservas',
    descricao: 'Solicitações e atualizações de áreas comuns.',
  },
  {
    tipo: 'OCORRENCIAS',
    titulo: 'Ocorrências',
    descricao: 'Chamados, respostas e mudanças de andamento.',
  },
  {
    tipo: 'ENCOMENDAS',
    titulo: 'Encomendas',
    descricao: 'Registros de encomendas e correspondências na portaria.',
  },
  {
    tipo: 'VOTACOES',
    titulo: 'Votações',
    descricao: 'Votações abertas para participação do morador.',
  },
  {
    tipo: 'ASSEMBLEIAS',
    titulo: 'Assembleias',
    descricao: 'Convocações, pautas e assembleias em andamento.',
  },
];

function obterUrlLoginPortal() {
  if (typeof window === 'undefined') {
    return 'https://condominaria.bacuridigital.com/portal/login';
  }

  return `${window.location.origin}/portal/login`;
}

async function copiarTextoPerfil(textoParaCopiar: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(textoParaCopiar);
    return;
  }

  const campoTemporario = document.createElement('textarea');
  campoTemporario.value = textoParaCopiar;
  campoTemporario.setAttribute('readonly', 'true');
  campoTemporario.style.position = 'fixed';
  campoTemporario.style.opacity = '0';

  document.body.appendChild(campoTemporario);
  campoTemporario.select();
  document.execCommand('copy');
  document.body.removeChild(campoTemporario);
}

function mensagemErroPerfil(error: unknown, fallback: string) {
  const mensagem =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : fallback;

  const normalizada = mensagem.trim().toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclientknownrequesterror') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível carregar as informações agora. Tente novamente em instantes.';
  }

  return mensagem || fallback;
}

function rotuloPapelUnidade(papel: string) {
  switch (papel) {
    case 'PROPRIETARIO':
      return 'Proprietário';
    case 'INQUILINO':
      return 'Inquilino';
    case 'MORADOR':
      return 'Morador';
    default:
      return papel;
  }
}

function PapelUnidadeBadge({ papel }: { papel: string }) {
  return (
    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
      {rotuloPapelUnidade(papel)}
    </span>
  );
}

function PrincipalBadge() {
  return (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
      Principal
    </span>
  );
}

function PreferenciaStatusBadge({ ativa }: { ativa: boolean }) {
  return (
    <span
      className={[
        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
        ativa ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600',
      ].join(' ')}
    >
      {ativa ? 'Ativa' : 'Silenciada'}
    </span>
  );
}

function ResumoPerfilCard({
  titulo,
  valor,
  descricao,
  variante = 'slate',
}: ResumoPerfilCardProps) {
  const classes = {
    orange: 'border-orange-100 bg-orange-50 text-orange-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    slate: 'border-slate-200 bg-white text-slate-950',
    blue: 'border-blue-100 bg-blue-50 text-blue-950',
  } satisfies Record<NonNullable<ResumoPerfilCardProps['variante']>, string>;

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${classes[variante]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        {valor}
      </p>
      <p className="mt-1 text-xs font-semibold opacity-70">
        {descricao}
      </p>
    </div>
  );
}

function InfoPerfilItem({ label, valor, icon }: InfoPerfilItemProps) {
  const valorFormatado = String(valor ?? '').trim() || 'Não informado';

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-bold text-slate-950">
            {valorFormatado}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PerfilPage() {
  usePageTitle('Perfil');

  const [estado, setEstado] = useState<EstadoPagina>({
    carregando: true,
    erro: '',
    contexto: null,
  });

  const [preferenciasNotificacoes, setPreferenciasNotificacoes] =
    useState<PreferenciasNotificacoesPortal>(
      preferenciasPadraoNotificacoesPortal,
    );
  const [salvandoPreferencias, setSalvandoPreferencias] = useState(false);
  const [mensagemPreferencias, setMensagemPreferencias] = useState('');
  const [erroPreferencias, setErroPreferencias] = useState('');
  const [mensagemAcesso, setMensagemAcesso] = useState('');

  const {
    contexto,
    moradorAtivo: moradorContexto,
    carregando: carregandoPortal,
    erro: erroPortal,
  } = usePortal();
  const { configuracoes: configuracoesPortal } = usePortalConfiguracoes();

  const morador = estado.contexto
    ? obterMoradorAtivo(estado.contexto)
    : null;

  const totalUnidades = morador?.unidades.length ?? 0;
  const unidadePrincipal = useMemo(
    () => morador?.unidades.find((vinculo) => vinculo.principal) ?? morador?.unidades[0] ?? null,
    [morador],
  );
  const preferenciasAtivas = categoriasPreferenciasNotificacoes.filter(
    (categoria) => preferenciasNotificacoes[categoria.tipo] !== false,
  ).length;

  async function copiarDadosAcessoPortal() {
    if (!estado.contexto) {
      return;
    }

    const moradorAtivo = obterMoradorAtivo(estado.contexto);
    const textoAcesso = [
      'Dados de acesso ao Portal do Morador',
      '',
      `Portal: ${obterUrlLoginPortal()}`,
      `E-mail: ${estado.contexto.usuario.email}`,
      moradorAtivo ? `Morador: ${moradorAtivo.nome}` : '',
      moradorAtivo ? `Condomínio: ${moradorAtivo.condominio.nome}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await copiarTextoPerfil(textoAcesso);
      setMensagemAcesso('Dados de acesso copiados.');
    } catch {
      setMensagemAcesso('Não foi possível copiar os dados de acesso.');
    }
  }

  useEffect(() => {
    async function carregar() {
      if (carregandoPortal) {
        return;
      }

      if (erroPortal) {
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: erroPortal,
          contexto,
        }));
        return;
      }

      if (!contexto || !moradorContexto) {
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: 'Nenhum perfil de morador disponível para o portal.',
          contexto: null,
        }));
        return;
      }

      try {
        const preferenciasResposta =
          await apiRequest<NotificacoesPreferenciasPortalResponse>(
            `/portal-morador/condominios/${moradorContexto.condominioId}/notificacoes/preferencias`,
          );

        setPreferenciasNotificacoes({
          ...preferenciasPadraoNotificacoesPortal,
          ...preferenciasResposta.preferencias,
        });
      } catch {
        setPreferenciasNotificacoes(preferenciasPadraoNotificacoesPortal);
      }

      setEstado({
        carregando: false,
        erro: '',
        contexto,
      });
    }

    void carregar();
  }, [carregandoPortal, contexto, erroPortal, moradorContexto]);

  function alternarPreferenciaNotificacao(tipo: TipoNotificacaoPortal) {
    setMensagemPreferencias('');
    setErroPreferencias('');
    setPreferenciasNotificacoes((atuais) => ({
      ...atuais,
      [tipo]: !atuais[tipo],
    }));
  }

  async function salvarPreferenciasNotificacoes() {
    if (!moradorContexto) {
      return;
    }

    const confirmar = window.confirm(
      'Salvar as preferências de notificações do Portal do Morador?',
    );

    if (!confirmar) {
      return;
    }

    setSalvandoPreferencias(true);
    setMensagemPreferencias('');
    setErroPreferencias('');

    try {
      const resposta = await apiRequest<NotificacoesPreferenciasPortalResponse>(
        `/portal-morador/condominios/${moradorContexto.condominioId}/notificacoes/preferencias`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            preferencias: preferenciasNotificacoes,
          }),
        },
      );

      setPreferenciasNotificacoes({
        ...preferenciasPadraoNotificacoesPortal,
        ...resposta.preferencias,
      });
      setMensagemPreferencias('Preferências de notificações salvas.');
    } catch (error) {
      setErroPreferencias(
        mensagemErroPerfil(error, 'Não foi possível salvar as preferências.'),
      );
    } finally {
      setSalvandoPreferencias(false);
    }
  }

  return (
    <AppShell
      nomeCondominio={morador?.condominio.nome}
      nomeMorador={morador?.nome}
      perfis={estado.contexto?.moradores ?? []}
    >
      {estado.carregando ? (
        <LoadingState message="Carregando perfil..." />
      ) : null}

      {estado.erro ? (
        <ErrorState message={estado.erro} />
      ) : null}

      {morador && estado.contexto ? (
        <>
          <section className="rounded-[2rem] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-slate-50 p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-orange-500 text-white shadow-sm">
                  <ContactRound className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-700">
                    Portal do Morador
                  </p>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                    Meu perfil
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                    Consulte seus dados de acesso, unidade vinculada, condomínio ativo
                    e preferências de notificações do portal.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <a
                  href={obterUrlLoginPortal()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir portal
                </a>

                <button
                  type="button"
                  onClick={() => void copiarDadosAcessoPortal()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600"
                >
                  <Copy className="h-4 w-4" />
                  Copiar acesso
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResumoPerfilCard
                titulo="Morador"
                valor={morador.nome}
                descricao="Perfil ativo no portal"
                variante="orange"
              />
              <ResumoPerfilCard
                titulo="Unidades"
                valor={totalUnidades}
                descricao="Vínculos disponíveis"
                variante="slate"
              />
              <ResumoPerfilCard
                titulo="Unidade principal"
                valor={unidadePrincipal?.unidade.identificador ?? '-'}
                descricao="Referência operacional"
                variante="blue"
              />
              <ResumoPerfilCard
                titulo="Notificações"
                valor={`${preferenciasAtivas}/${categoriasPreferenciasNotificacoes.length}`}
                descricao="Categorias ativas"
                variante="emerald"
              />
            </div>
          </section>

          {configuracoesPortal?.contatosUteisPortal ? (
            <section className="rounded-3xl border border-orange-100 bg-orange-50 p-5 text-sm font-semibold leading-6 text-orange-950 shadow-sm md:p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-700">
                Contatos úteis do condomínio
              </p>
              <p className="mt-2 whitespace-pre-line">
                {configuracoesPortal.contatosUteisPortal}
              </p>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <UserRound className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Dados pessoais
                  </h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    Dados do morador autenticado no portal.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <InfoPerfilItem
                  label="Nome"
                  valor={morador.nome}
                  icon={<UserRound className="h-5 w-5" />}
                />
                <InfoPerfilItem
                  label="E-mail"
                  valor={morador.email}
                  icon={<Mail className="h-5 w-5" />}
                />
                <InfoPerfilItem
                  label="Telefone"
                  valor={morador.telefone}
                  icon={<Phone className="h-5 w-5" />}
                />

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                        Usuário autenticado
                      </p>
                      <p className="mt-1 break-all text-sm font-bold text-emerald-950">
                        {estado.contexto.usuario.email}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                        Acesso vinculado ao cadastro de morador ativo.
                      </p>

                      {mensagemAcesso ? (
                        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-emerald-800">
                          {mensagemAcesso}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Building2 className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Condomínio e unidades
                  </h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    Contexto atualmente selecionado no portal.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">
                  Condomínio ativo
                </p>
                <p className="mt-1 text-xl font-bold text-orange-950">
                  {morador.condominio.nome}
                </p>
              </div>

              <div className="mt-5 grid gap-4">
                {morador.unidades.map((vinculo) => (
                  <div
                    key={vinculo.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                          <Building2 className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-lg font-bold text-slate-950">
                            {vinculo.unidade.identificador}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-600">
                            {vinculo.unidade.tipo} • Unidade {vinculo.unidade.numero}
                            {vinculo.unidade.andar !== null && vinculo.unidade.andar !== undefined
                              ? ` • Andar ${vinculo.unidade.andar}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <PapelUnidadeBadge papel={vinculo.papel} />

                        {vinculo.principal ? <PrincipalBadge /> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 xl:col-span-2">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <BellRing className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-950">
                      Preferências de notificações
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                      Escolha quais categorias aparecem com destaque na Central de Notificações.
                      Cobranças vencidas continuam visíveis mesmo se a categoria for silenciada.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void salvarPreferenciasNotificacoes()}
                  disabled={salvandoPreferencias}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {salvandoPreferencias ? 'Salvando...' : 'Salvar preferências'}
                </button>
              </div>

              {mensagemPreferencias ? (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {mensagemPreferencias}
                </div>
              ) : null}

              {erroPreferencias ? (
                <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
                  {erroPreferencias}
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {categoriasPreferenciasNotificacoes.map((categoria) => {
                  const ativa = preferenciasNotificacoes[categoria.tipo] !== false;

                  return (
                    <button
                      key={categoria.tipo}
                      type="button"
                      onClick={() => alternarPreferenciaNotificacao(categoria.tipo)}
                      className={[
                        'rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100',
                        ativa
                          ? 'border-orange-100 bg-orange-50/70'
                          : 'border-slate-200 bg-slate-50 opacity-80',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-950">
                            {categoria.titulo}
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            {categoria.descricao}
                          </p>
                        </div>

                        <PreferenciaStatusBadge ativa={ativa} />
                      </div>

                      {categoria.critica ? (
                        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-orange-800">
                          Cobranças vencidas são críticas e continuam aparecendo.
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
