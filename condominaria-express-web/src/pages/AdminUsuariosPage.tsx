import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCopy,
  LoaderCircle,
  Mail,
  RefreshCcw,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
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
  ApiError,
  apiRequest,
} from '../lib/api';
import type {
  AdminUsuarioCondominio,
  AdminUsuariosCondominioResponse,
  AtualizarUsuarioCondominioAdminPayload,
  CriarUsuarioCondominioAdminPayload,
  PapelCondominioAdmin,
} from '../types/api';

const papeisUsuarios: Array<{
  value: PapelCondominioAdmin;
  label: string;
  descricao: string;
}> = [
  {
    value: 'ADMINISTRADOR',
    label: 'Administrador',
    descricao: 'Acesso administrativo completo ao condomínio.',
  },
  {
    value: 'SINDICO',
    label: 'Síndico',
    descricao: 'Gestão operacional e administrativa principal.',
  },
  {
    value: 'SUBSINDICO',
    label: 'Subsíndico',
    descricao: 'Apoio à gestão da estrutura e operação.',
  },
  {
    value: 'FINANCEIRO',
    label: 'Financeiro',
    descricao: 'Gestão de cobranças, receitas, despesas e relatórios.',
  },
  {
    value: 'PORTEIRO',
    label: 'Portaria',
    descricao: 'Controle de visitantes, encomendas e acessos.',
  },
  {
    value: 'CONSELHEIRO',
    label: 'Conselheiro',
    descricao: 'Acompanhamento consultivo de informações administrativas.',
  },
  {
    value: 'MORADOR',
    label: 'Morador',
    descricao: 'Acesso ao Portal do Morador.',
  },
];

const ordemPapeis: Record<PapelCondominioAdmin, number> = {
  ADMINISTRADOR: 1,
  SINDICO: 2,
  SUBSINDICO: 3,
  FINANCEIRO: 4,
  PORTEIRO: 5,
  CONSELHEIRO: 6,
  MORADOR: 7,
};

const rotulosPapel: Record<PapelCondominioAdmin, string> = {
  ADMINISTRADOR: 'Administrador',
  SINDICO: 'Síndico',
  SUBSINDICO: 'Subsíndico',
  CONSELHEIRO: 'Conselheiro',
  FINANCEIRO: 'Financeiro',
  PORTEIRO: 'Portaria',
  MORADOR: 'Morador',
};

const filtroPapeis = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'ADMINISTRATIVOS', label: 'Administrativos' },
  { value: 'MORADOR', label: 'Moradores' },
  { value: 'INATIVOS', label: 'Inativos' },
  { value: 'SEM_MORADOR', label: 'Sem morador vinculado' },
] as const;

type FiltroPapel = (typeof filtroPapeis)[number]['value'];
type OrdenacaoUsuarios = 'NOME' | 'PAPEL' | 'ULTIMO_ACESSO';

function obterMensagemErro(error: unknown, fallback: string) {
  const mensagem = error instanceof ApiError ? error.message : '';

  const normalizada = mensagem.trim().toLowerCase();

  if (
    normalizada.includes('internal server error') ||
    normalizada.includes('prismaclient') ||
    normalizada.includes('unknown column') ||
    normalizada.includes('cannot read properties')
  ) {
    return 'Não foi possível concluir a operação agora. Verifique a estrutura do sistema ou tente novamente em instantes.';
  }

  if (normalizada.includes('unauthorized') || normalizada.includes('401')) {
    return 'Sua sessão expirou. Faça login novamente para continuar.';
  }

  if (normalizada.includes('forbidden') || normalizada.includes('403')) {
    return 'Você não tem permissão para executar esta ação.';
  }

  if (mensagem.trim()) {
    return mensagem;
  }

  return fallback;
}

function formatarDataHora(valor: string | null) {
  if (!valor) {
    return 'Não registrado';
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return 'Não registrado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function classeBadgePapel(papel: PapelCondominioAdmin) {
  if (papel === 'ADMINISTRADOR' || papel === 'SINDICO') {
    return 'bg-orange-100 text-orange-800';
  }

  if (papel === 'FINANCEIRO') {
    return 'bg-emerald-100 text-emerald-800';
  }

  if (papel === 'PORTEIRO') {
    return 'bg-sky-100 text-sky-800';
  }

  if (papel === 'MORADOR') {
    return 'bg-slate-100 text-slate-700';
  }

  return 'bg-violet-100 text-violet-800';
}

function BadgePadrao({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {children}
    </span>
  );
}

function UsuarioPapelBadge({ papel }: { papel: PapelCondominioAdmin }) {
  return (
    <BadgePadrao className={classeBadgePapel(papel)}>
      {rotulosPapel[papel]}
    </BadgePadrao>
  );
}

function UsuarioStatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <BadgePadrao
      className={
        ativo
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-slate-200 text-slate-600'
      }
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </BadgePadrao>
  );
}

function UsuarioTagBadge({
  children,
  variant = 'slate',
}: {
  children: ReactNode;
  variant?: 'slate' | 'orange' | 'blue' | 'amber' | 'dark';
}) {
  const classes = {
    slate: 'bg-slate-100 text-slate-700',
    orange: 'bg-orange-100 text-orange-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    dark: 'bg-slate-900 text-white',
  };

  return <BadgePadrao className={classes[variant]}>{children}</BadgePadrao>;
}

function ResumoUsuarioCard({
  titulo,
  valor,
  detalhe,
  variant = 'slate',
}: {
  titulo: string;
  valor: number | string;
  detalhe: string;
  variant?: 'slate' | 'green' | 'amber';
}) {
  const classes = {
    slate: 'border-slate-200 bg-slate-50 text-slate-950',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-100 bg-amber-50 text-amber-950',
  };

  const labelClasses = {
    slate: 'text-slate-500',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
  };

  return (
    <article className={`rounded-3xl border p-4 ${classes[variant]}`}>
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.08em] ${labelClasses[variant]}`}
      >
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold">{valor}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{detalhe}</p>
    </article>
  );
}

function mensagemConfirmacaoAtualizacaoUsuario(
  item: AdminUsuarioCondominio,
  payload: AtualizarUsuarioCondominioAdminPayload,
) {
  if (typeof payload.ativo === 'boolean') {
    return payload.ativo
      ? `Ativar o acesso de ${item.usuario.nome} neste condomínio?`
      : `Desativar o acesso de ${item.usuario.nome} neste condomínio?`;
  }

  if (payload.principal) {
    return `Definir ${item.usuario.nome} como usuário principal deste condomínio?`;
  }

  if (payload.papel && payload.papel !== item.papel) {
    return `Alterar a permissão de ${item.usuario.nome} para ${rotulosPapel[payload.papel]}?`;
  }

  return '';
}


function normalizarTelefoneWhatsApp(telefone?: string | null) {
  const apenasDigitos = telefone?.replace(/\D/g, '') ?? '';

  if (apenasDigitos.length < 10) {
    return '';
  }

  if (apenasDigitos.startsWith('55')) {
    return apenasDigitos;
  }

  return `55${apenasDigitos}`;
}

// data-admin-usuarios-responsive-fix="true"
export function AdminUsuariosPage() {
  usePageTitle('Usuários e permissões');

  const {
    usuario,
    condominiosAdministrativos,
  } = useAdminRouteContext();

  const condominioInicial =
    condominiosAdministrativos.find((vinculo) => vinculo.principal)
      ?.condominio.id ??
    condominiosAdministrativos[0]?.condominio.id ??
    0;

  const [condominioId, setCondominioId] =
    useState<number>(condominioInicial);
  const [usuarios, setUsuarios] = useState<AdminUsuarioCondominio[]>([]);
  const [resumo, setResumo] =
    useState<AdminUsuariosCondominioResponse['resumo'] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroPapel>('TODOS');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoUsuarios>('NOME');
  const [processandoUsuarioId, setProcessandoUsuarioId] =
    useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [formulario, setFormulario] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    papel: 'MORADOR' as PapelCondominioAdmin,
    principal: false,
  });

  const condominioSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podeGerenciarUsuarios = Boolean(
    usuario.superAdmin ||
      (condominioSelecionado &&
        ['ADMINISTRADOR', 'SINDICO'].includes(condominioSelecionado.papel)),
  );

  async function carregarUsuarios(id = condominioId) {
    if (!id) {
      setUsuarios([]);
      setResumo(null);
      return;
    }

    setCarregando(true);
    setErroCarregamento('');

    try {
      const resposta = await apiRequest<AdminUsuariosCondominioResponse>(
        `/condominios/${id}/usuarios`,
      );

      setUsuarios(resposta.itens);
      setResumo(resposta.resumo);
    } catch (error) {
      setUsuarios([]);
      setResumo(null);
      setErroCarregamento(
        obterMensagemErro(
          error,
          'Não foi possível carregar os usuários deste condomínio.',
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarUsuarios(condominioId);
  }, [condominioId]);

  useEffect(() => {
    if (!condominioId && condominioInicial) {
      setCondominioId(condominioInicial);
    }
  }, [condominioId, condominioInicial]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');

    return usuarios
      .filter((item) => {
        if (filtro === 'ADMINISTRATIVOS' && item.papel === 'MORADOR') {
          return false;
        }

        if (filtro === 'MORADOR' && item.papel !== 'MORADOR') {
          return false;
        }

        if (filtro === 'INATIVOS' && item.ativo && item.usuario.ativo) {
          return false;
        }

        if (filtro === 'SEM_MORADOR' && item.moradorVinculado) {
          return false;
        }

        if (!termo) {
          return true;
        }

        const textoBusca = [
          item.usuario.nome,
          item.usuario.email,
          item.usuario.telefone,
          item.moradorVinculado?.nome,
          item.moradorVinculado?.email,
          item.papel,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('pt-BR');

        return textoBusca.includes(termo);
      })
      .sort((a, b) => {
        if (ordenacao === 'PAPEL') {
          const ordem = ordemPapeis[a.papel] - ordemPapeis[b.papel];

          if (ordem !== 0) {
            return ordem;
          }
        }

        if (ordenacao === 'ULTIMO_ACESSO') {
          const dataA = a.usuario.ultimoLoginEm
            ? new Date(a.usuario.ultimoLoginEm).getTime()
            : 0;
          const dataB = b.usuario.ultimoLoginEm
            ? new Date(b.usuario.ultimoLoginEm).getTime()
            : 0;

          if (dataB !== dataA) {
            return dataB - dataA;
          }
        }

        return a.usuario.nome.localeCompare(b.usuario.nome, 'pt-BR');
      });
  }, [busca, filtro, ordenacao, usuarios]);

  async function criarOuVincularUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviando) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviando(true);

    const payload: CriarUsuarioCondominioAdminPayload = {
      email: formulario.email.trim().toLowerCase(),
      papel: formulario.papel,
      principal: formulario.principal,
    };

    if (formulario.nome.trim()) {
      payload.nome = formulario.nome.trim();
    }

    if (formulario.telefone.trim()) {
      payload.telefone = formulario.telefone.trim();
    }

    if (formulario.senha.trim()) {
      payload.senha = formulario.senha.trim();
    }

    try {
      await apiRequest<AdminUsuarioCondominio>(
        `/condominios/${condominioId}/usuarios`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setFormulario({
        nome: '',
        email: '',
        telefone: '',
        senha: '',
        papel: 'MORADOR',
        principal: false,
      });

      setMensagemSucesso('Usuário criado/vinculado com sucesso.');
      await carregarUsuarios(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível criar ou vincular o usuário.',
        ),
      );
    } finally {
      setEnviando(false);
    }
  }

  async function atualizarUsuario(
    item: AdminUsuarioCondominio,
    payload: AtualizarUsuarioCondominioAdminPayload,
  ) {
    if (!condominioId || processandoUsuarioId) {
      return;
    }

    const mensagemConfirmacao = mensagemConfirmacaoAtualizacaoUsuario(item, payload);

    if (mensagemConfirmacao && !window.confirm(mensagemConfirmacao)) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setProcessandoUsuarioId(item.usuario.id);

    try {
      await apiRequest<AdminUsuarioCondominio>(
        `/condominios/${condominioId}/usuarios/${item.usuario.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setMensagemSucesso('Permissão atualizada com sucesso.');
      await carregarUsuarios(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível atualizar o usuário.',
        ),
      );
    } finally {
      setProcessandoUsuarioId(null);
    }
  }

  async function removerUsuario(item: AdminUsuarioCondominio) {
    if (!condominioId || processandoUsuarioId) {
      return;
    }

    const confirmar = window.confirm(
      `Remover o acesso de ${item.usuario.nome} neste condomínio? O cadastro global do usuário não será apagado.`,
    );

    if (!confirmar) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setProcessandoUsuarioId(item.usuario.id);

    try {
      await apiRequest(
        `/condominios/${condominioId}/usuarios/${item.usuario.id}`,
        {
          method: 'DELETE',
        },
      );

      setMensagemSucesso('Usuário removido do condomínio.');
      await carregarUsuarios(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível remover o usuário do condomínio.',
        ),
      );
    } finally {
      setProcessandoUsuarioId(null);
    }
  }

  async function copiarConviteAcesso(item: AdminUsuarioCondominio) {
    const nomeCondominio =
      condominioSelecionado?.condominio.nome ?? 'seu condomínio';

    const texto = [
      `Olá, ${item.usuario.nome}!`,
      '',
      `Seu acesso ao Condominaria Express do ${nomeCondominio} está disponível.`,
      '',
      `Acesse: ${window.location.origin}/login`,
      `E-mail: ${item.usuario.email}`,
      '',
      'Pelo sistema você acompanha cobranças, comunicados, reservas, ocorrências, encomendas, visitantes, votações e assembleias.',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(texto);
      setMensagemSucesso('Convite copiado para a área de transferência.');
      setErroAcao('');
    } catch {
      setErroAcao('Não foi possível copiar o convite.');
    }
  }

  function abrirWhatsApp(item: AdminUsuarioCondominio) {
    const telefone = normalizarTelefoneWhatsApp(
      item.usuario.telefone ?? item.moradorVinculado?.telefone,
    );

    if (!telefone) {
      setErroAcao('Este usuário não tem telefone válido para WhatsApp.');
      return;
    }

    const nomeCondominio =
      condominioSelecionado?.condominio.nome ?? 'seu condomínio';

    const mensagem = [
      `Olá, ${item.usuario.nome}!`,
      '',
      `Seu acesso ao Condominaria Express do ${nomeCondominio} está disponível.`,
      '',
      `Acesse: ${window.location.origin}/login`,
      `E-mail: ${item.usuario.email}`,
      '',
      'Pelo sistema você acompanha as informações do condomínio com segurança.',
    ].join('\n');

    window.open(
      `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-orange-600">
                Controle de acesso
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Usuários e permissões
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Gerencie quem acessa o painel administrativo, o portal do
                morador e os módulos operacionais do condomínio.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
              <ResumoUsuarioCard
                titulo="Usuários"
                valor={resumo?.total ?? 0}
                detalhe="vinculados ao condomínio"
              />

              <ResumoUsuarioCard
                titulo="Ativos"
                valor={resumo?.ativos ?? 0}
                detalhe="com acesso liberado"
                variant="green"
              />

              <ResumoUsuarioCard
                titulo="Sem vínculo"
                valor={resumo?.semMoradorVinculado ?? 0}
                detalhe="sem morador relacionado"
                variant="amber"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <UserCog className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Criar ou vincular usuário
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Se o e-mail já existir, o usuário será apenas vinculado ao
                  condomínio. Se for novo, informe uma senha provisória.
                </p>
              </div>
            </div>

            <form onSubmit={criarOuVincularUsuario} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Nome
                </span>
                <input
                  type="text"
                  value={formulario.nome}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Nome do usuário"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  E-mail
                </span>
                <input
                  type="email"
                  required
                  value={formulario.email}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      email: event.target.value,
                    }))
                  }
                  placeholder="usuario@email.com"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Telefone
                </span>
                <input
                  type="text"
                  value={formulario.telefone}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      telefone: event.target.value,
                    }))
                  }
                  placeholder="(00) 00000-0000"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Papel/permissão
                </span>
                <select
                  value={formulario.papel}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      papel: event.target.value as PapelCondominioAdmin,
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {papeisUsuarios.map((papel) => (
                    <option key={papel.value} value={papel.value}>
                      {papel.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                  Senha provisória
                </span>
                <input
                  type="text"
                  value={formulario.senha}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      senha: event.target.value,
                    }))
                  }
                  placeholder="Obrigatória somente para usuário novo"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formulario.principal}
                  onChange={(event) =>
                    setFormulario((atual) => ({
                      ...atual,
                      principal: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                Definir como condomínio principal do usuário
              </label>

              <button
                type="submit"
                disabled={!podeGerenciarUsuarios || enviando}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <UserRoundCheck className="h-4 w-4" />
                )}
                Criar/vincular usuário
              </button>
            </form>
          </article>

          <div className="space-y-5">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Usuários do condomínio
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {usuariosFiltrados.length} de {usuarios.length} usuário(s)
                    conforme filtros aplicados.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void carregarUsuarios(condominioId)}
                  disabled={carregando}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className={carregando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                  Atualizar
                </button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px]">
                <input
                  type="text"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por nome, e-mail, telefone, morador ou papel"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

                <select
                  value={filtro}
                  onChange={(event) =>
                    setFiltro(event.target.value as FiltroPapel)
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {filtroPapeis.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  value={ordenacao}
                  onChange={(event) =>
                    setOrdenacao(event.target.value as OrdenacaoUsuarios)
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  <option value="NOME">Nome A-Z</option>
                  <option value="PAPEL">Permissão</option>
                  <option value="ULTIMO_ACESSO">Último acesso</option>
                </select>
              </div>

              {erroCarregamento ? (
                <div className="mt-5 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                  {erroCarregamento}
                </div>
              ) : null}

              {erroAcao ? (
                <div className="mt-5 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                  {erroAcao}
                </div>
              ) : null}

              {mensagemSucesso ? (
                <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  {mensagemSucesso}
                </div>
              ) : null}
            </article>

            <div className="grid gap-4">
              {carregando ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600 shadow-sm">
                  <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-orange-500" />
                  Carregando usuários...
                </div>
              ) : null}

              {!carregando && usuariosFiltrados.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                  <UsersRound className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    Nenhum usuário encontrado.
                  </p>
                </div>
              ) : null}

              {usuariosFiltrados.map((item) => {
                const processando = processandoUsuarioId === item.usuario.id;
                const ativo = item.ativo && item.usuario.ativo;
                const telefoneWhatsApp = normalizarTelefoneWhatsApp(
                  item.usuario.telefone ?? item.moradorVinculado?.telefone,
                );

                return (
                  <article
                    key={`${item.condominioId}-${item.usuario.id}`}
                    className={`rounded-[2rem] border bg-white p-5 shadow-sm transition ${
                      ativo
                        ? 'border-slate-200'
                        : 'border-slate-200 bg-slate-50 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <UsuarioPapelBadge papel={item.papel} />

                          {item.usuario.superAdmin ? (
                            <UsuarioTagBadge variant="dark">
                              Super Admin
                            </UsuarioTagBadge>
                          ) : null}

                          <UsuarioStatusBadge ativo={ativo} />

                          {item.principal ? (
                            <UsuarioTagBadge variant="orange">
                              Principal
                            </UsuarioTagBadge>
                          ) : null}

                          {item.moradorVinculado ? (
                            <UsuarioTagBadge variant="blue">
                              Morador vinculado
                            </UsuarioTagBadge>
                          ) : (
                            <UsuarioTagBadge variant="amber">
                              Sem morador vinculado
                            </UsuarioTagBadge>
                          )}
                        </div>

                        <h3 className="mt-3 truncate text-xl font-bold text-slate-950">
                          {item.usuario.nome}
                        </h3>

                        <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                          <p className="flex min-w-0 items-center gap-2">
                            <Mail className="h-4 w-4 shrink-0 text-orange-500" />
                            <span className="truncate">{item.usuario.email}</span>
                          </p>
                          <p>
                            Último acesso:{' '}
                            <strong className="text-slate-800">
                              {formatarDataHora(item.usuario.ultimoLoginEm)}
                            </strong>
                          </p>
                        </div>

                        {item.moradorVinculado ? (
                          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                              Morador vinculado
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {item.moradorVinculado.nome}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.moradorVinculado.unidades.length > 0
                                ? item.moradorVinculado.unidades
                                    .map(
                                      (vinculo) =>
                                        vinculo.unidade.identificador,
                                    )
                                    .join(', ')
                                : 'Sem unidade ativa vinculada'}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="admin-actions-compact grid min-w-0 gap-2 sm:grid-cols-2 xl:w-[260px] xl:flex-none">
                        <select
                          value={item.papel}
                          disabled={!podeGerenciarUsuarios || processando}
                          onChange={(event) =>
                            void atualizarUsuario(item, {
                              papel: event.target.value as PapelCondominioAdmin,
                            })
                          }
                          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {papeisUsuarios.map((papel) => (
                            <option key={papel.value} value={papel.value}>
                              {papel.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={!podeGerenciarUsuarios || processando}
                          onClick={() =>
                            void atualizarUsuario(item, {
                              ativo: !item.ativo,
                            })
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {item.ativo ? (
                            <UserRoundX className="h-4 w-4" />
                          ) : (
                            <UserRoundCheck className="h-4 w-4" />
                          )}
                          {item.ativo ? 'Desativar' : 'Ativar'}
                        </button>

                        <button
                          type="button"
                          disabled={!podeGerenciarUsuarios || processando || item.principal}
                          onClick={() =>
                            void atualizarUsuario(item, {
                              principal: true,
                            })
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <BadgeCheck className="h-4 w-4" />
                          Tornar principal
                        </button>

                        <button
                          type="button"
                          onClick={() => void copiarConviteAcesso(item)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-700"
                        >
                          <ClipboardCopy className="h-4 w-4" />
                          Copiar convite
                        </button>

                        <button
                          type="button"
                          disabled={!telefoneWhatsApp}
                          onClick={() => abrirWhatsApp(item)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          WhatsApp
                        </button>

                        <button
                          type="button"
                          disabled={!podeGerenciarUsuarios || processando}
                          onClick={() => void removerUsuario(item)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Remover
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Ordem lógica de permissões
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Use Administrador e Síndico para gestão ampla, Financeiro para
                cobranças, Portaria para acessos/encomendas e Morador para o
                portal. O Super Admin continua sendo global e não depende do
                vínculo local.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {papeisUsuarios.map((papel) => (
              <article
                key={papel.value}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <UsuarioPapelBadge papel={papel.value} />
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {papel.descricao}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
