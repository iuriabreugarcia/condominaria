import {
  Building2,
  ClipboardList,
  Copy,
  MessageCircle,
  LoaderCircle,
  RefreshCcw,
  UsersRound,
} from 'lucide-react';
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useAdminRouteContext,
} from '../components/AdminProtectedRoute';
import { AdminShell } from '../components/AdminShell';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  apiRequest,
  ApiError,
} from '../lib/api';
import type {
  AdminBloco,
  AdminMorador,
  AdminUnidade,
  CriarAcessoPortalMoradorAdminPayload,
  CriarBlocoAdminPayload,
  CriarMoradorAdminPayload,
  CriarUnidadeAdminPayload,
  PapelMoradorUnidadeAdmin,
  TipoUnidadeAdmin,
  VincularMoradorUnidadeAdminPayload,
  VincularUsuarioMoradorAdminPayload,
} from '../types/api';

const papeisGestaoEstrutura = new Set([
  'ADMINISTRADOR',
  'SINDICO',
  'SUBSINDICO',
]);

const papeisProvisionamentoPortal = new Set([
  'ADMINISTRADOR',
  'SINDICO',
]);

const tiposUnidade: Array<{
  value: TipoUnidadeAdmin;
  label: string;
}> = [
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'CASA', label: 'Casa' },
  { value: 'SALA', label: 'Sala' },
  { value: 'LOJA', label: 'Loja' },
  { value: 'OUTRA', label: 'Outra' },
];

const papeisMoradorUnidade: Array<{
  value: PapelMoradorUnidadeAdmin;
  label: string;
}> = [
  { value: 'PROPRIETARIO', label: 'Proprietário' },
  { value: 'INQUILINO', label: 'Inquilino' },
  { value: 'MORADOR', label: 'Morador' },
];

function mensagemEstruturaAmigavel(mensagem: string, fallback: string) {
  const texto = String(mensagem ?? '').trim();
  const normalizado = texto.toLowerCase();

  if (!texto) {
    return fallback;
  }

  if (
    normalizado.includes('internal server error') ||
    normalizado.includes('prismaclientknownrequesterror') ||
    normalizado.includes('unknown column') ||
    normalizado.includes('cannot read properties')
  ) {
    return 'Não foi possível concluir a operação agora. Verifique a estrutura do sistema ou tente novamente em instantes.';
  }

  if (normalizado.includes('unauthorized') || normalizado.includes('401')) {
    return 'Sua sessão expirou. Faça login novamente para continuar.';
  }

  if (normalizado.includes('forbidden') || normalizado.includes('403')) {
    return 'Você não tem permissão para executar esta ação.';
  }

  if (normalizado.includes('not found') || normalizado.includes('404')) {
    return 'O registro solicitado não foi encontrado.';
  }

  return texto;
}

function obterMensagemErro(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return mensagemEstruturaAmigavel(error.message, fallback);
  }

  if (error instanceof Error) {
    return mensagemEstruturaAmigavel(error.message, fallback);
  }

  return fallback;
}

function rotuloTipoUnidade(tipo: TipoUnidadeAdmin) {
  const tipoEncontrado = tiposUnidade.find((item) => item.value === tipo);

  return tipoEncontrado?.label ?? tipo;
}

function rotuloPapelMorador(papel: PapelMoradorUnidadeAdmin) {
  const papelEncontrado = papeisMoradorUnidade.find((item) => item.value === papel);

  return papelEncontrado?.label ?? papel;
}

type BadgeVariant = 'orange' | 'emerald' | 'amber' | 'slate' | 'blue';

function EstruturaBadge({
  children,
  variant = 'slate',
}: {
  children: ReactNode;
  variant?: BadgeVariant;
}) {
  const classes: Record<BadgeVariant, string> = {
    orange: 'bg-orange-100 text-orange-800 ring-orange-200',
    emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    amber: 'bg-amber-100 text-amber-800 ring-amber-200',
    slate: 'bg-slate-200 text-slate-700 ring-slate-300',
    blue: 'bg-sky-100 text-sky-800 ring-sky-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes[variant]}`}>
      {children}
    </span>
  );
}

function ResumoEstruturaCard({
  titulo,
  valor,
  detalhe,
  icon,
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md">
      <div className="admin-estrutura-mobile-fix flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500">
            {titulo}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {valor}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
        {detalhe}
      </p>
    </article>
  );
}

function TipoUnidadeBadge({ tipo }: { tipo: TipoUnidadeAdmin }) {
  return <EstruturaBadge variant="orange">{rotuloTipoUnidade(tipo)}</EstruturaBadge>;
}

function PortalStatusBadge({ temAcesso }: { temAcesso: boolean }) {
  return (
    <EstruturaBadge variant={temAcesso ? 'emerald' : 'amber'}>
      {temAcesso ? 'Vinculado ao usuário' : 'Sem usuário vinculado'}
    </EstruturaBadge>
  );
}

function ConviteStatusBadge({ temAcesso }: { temAcesso: boolean }) {
  return (
    <EstruturaBadge variant={temAcesso ? 'emerald' : 'slate'}>
      {temAcesso ? 'Convite disponível' : 'Convite indisponível'}
    </EstruturaBadge>
  );
}

function UnidadeMoradorBadge({
  identificador,
  papel,
  principal,
}: {
  identificador: string;
  papel: PapelMoradorUnidadeAdmin;
  principal: boolean;
}) {
  return (
    <EstruturaBadge variant={principal ? 'orange' : 'blue'}>
      {identificador} • {rotuloPapelMorador(papel)}{principal ? ' • Principal' : ''}
    </EstruturaBadge>
  );
}

export function AdminEstruturaPage() {
  usePageTitle('Estrutura Administrativa');

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

  const [blocos, setBlocos] = useState<AdminBloco[]>([]);
  const [unidades, setUnidades] = useState<AdminUnidade[]>([]);
  const [moradores, setMoradores] = useState<AdminMorador[]>([]);

  const [carregando, setCarregando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [erroAcao, setErroAcao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const [enviandoBloco, setEnviandoBloco] = useState(false);
  const [enviandoUnidade, setEnviandoUnidade] = useState(false);
  const [enviandoMorador, setEnviandoMorador] = useState(false);
  const [enviandoVinculo, setEnviandoVinculo] = useState(false);
  const [enviandoAcessoPortal, setEnviandoAcessoPortal] = useState(false);
  const [enviandoVincularUsuario, setEnviandoVincularUsuario] =
    useState(false);
  const [moradorDesvinculandoId, setMoradorDesvinculandoId] = useState<
    number | null
  >(null);

  const [blocoForm, setBlocoForm] = useState({
    nome: '',
    descricao: '',
    ordem: '',
  });

  const [unidadeForm, setUnidadeForm] = useState({
    numero: '',
    blocoId: '',
    tipo: 'APARTAMENTO' as TipoUnidadeAdmin,
    andar: '',
    observacoes: '',
  });

  const [moradorForm, setMoradorForm] = useState({
    nome: '',
    email: '',
    telefone: '',
  });

  const [vinculoForm, setVinculoForm] = useState({
    moradorId: '',
    unidadeId: '',
    papel: 'PROPRIETARIO' as PapelMoradorUnidadeAdmin,
    principal: true,
  });

  const [acessoPortalForm, setAcessoPortalForm] = useState({
    moradorId: '',
    email: '',
    telefone: '',
    senha: '',
  });

  const [vincularUsuarioForm, setVincularUsuarioForm] = useState({
    moradorId: '',
    email: '',
  });

  const condominioSelecionado =
    condominiosAdministrativos.find(
      (vinculo) => vinculo.condominio.id === condominioId,
    ) ?? null;

  const podeGerirEstrutura =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
        papeisGestaoEstrutura.has(condominioSelecionado.papel),
    );

  const podeProvisionarAcessoPortal =
    usuario.superAdmin ||
    Boolean(
      condominioSelecionado &&
        papeisProvisionamentoPortal.has(condominioSelecionado.papel),
    );

  const moradoresSemAcessoPortal = moradores.filter(
    (morador) => !morador.usuarioId,
  );

  const moradoresComAcessoPortal = moradores.filter(
    (morador) => Boolean(morador.usuarioId),
  );

  const resumo = useMemo(
    () => ({
      blocos: blocos.length,
      unidades: unidades.length,
      moradores: moradores.length,
      moradoresComUnidade: moradores.filter(
        (morador) => morador.unidades.length > 0,
      ).length,
    }),
    [blocos, moradores, unidades],
  );

  async function carregarEstrutura(id: number) {
    if (!id) {
      return;
    }

    setCarregando(true);
    setErroCarregamento('');

    try {
      const [
        blocosResposta,
        unidadesResposta,
        moradoresResposta,
      ] = await Promise.all([
        apiRequest<AdminBloco[]>(
          `/condominios/${id}/blocos`,
        ),
        apiRequest<AdminUnidade[]>(
          `/condominios/${id}/unidades`,
        ),
        apiRequest<AdminMorador[]>(
          `/condominios/${id}/moradores`,
        ),
      ]);

      setBlocos(blocosResposta);
      setUnidades(unidadesResposta);
      setMoradores(moradoresResposta);
    } catch (error) {
      setErroCarregamento(
        obterMensagemErro(
          error,
          'Não foi possível carregar a estrutura do condomínio.',
        ),
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarEstrutura(condominioId);
  }, [condominioId]);

  useEffect(() => {
    if (!condominioId && condominioInicial) {
      setCondominioId(condominioInicial);
    }
  }, [condominioId, condominioInicial]);

  async function criarBloco(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoBloco) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoBloco(true);

    const payload: CriarBlocoAdminPayload = {
      nome: blocoForm.nome.trim(),
    };

    if (blocoForm.descricao.trim()) {
      payload.descricao = blocoForm.descricao.trim();
    }

    if (blocoForm.ordem.trim() !== '') {
      payload.ordem = Number(blocoForm.ordem);
    }

    try {
      await apiRequest<AdminBloco>(
        `/condominios/${condominioId}/blocos`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setBlocoForm({
        nome: '',
        descricao: '',
        ordem: '',
      });

      setMensagemSucesso('Bloco cadastrado com sucesso.');
      await carregarEstrutura(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar o bloco.',
        ),
      );
    } finally {
      setEnviandoBloco(false);
    }
  }

  async function criarUnidade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoUnidade) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoUnidade(true);

    const payload: CriarUnidadeAdminPayload = {
      numero: unidadeForm.numero.trim(),
      tipo: unidadeForm.tipo,
    };

    if (unidadeForm.blocoId) {
      payload.blocoId = Number(unidadeForm.blocoId);
    }

    if (unidadeForm.andar.trim() !== '') {
      payload.andar = Number(unidadeForm.andar);
    }

    if (unidadeForm.observacoes.trim()) {
      payload.observacoes = unidadeForm.observacoes.trim();
    }

    try {
      await apiRequest<AdminUnidade>(
        `/condominios/${condominioId}/unidades`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setUnidadeForm({
        numero: '',
        blocoId: '',
        tipo: 'APARTAMENTO',
        andar: '',
        observacoes: '',
      });

      setMensagemSucesso('Unidade cadastrada com sucesso.');
      await carregarEstrutura(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar a unidade.',
        ),
      );
    } finally {
      setEnviandoUnidade(false);
    }
  }

  async function criarMorador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!condominioId || enviandoMorador) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoMorador(true);

    const payload: CriarMoradorAdminPayload = {
      nome: moradorForm.nome.trim(),
    };

    if (moradorForm.email.trim()) {
      payload.email = moradorForm.email.trim().toLowerCase();
    }

    if (moradorForm.telefone.trim()) {
      payload.telefone = moradorForm.telefone.trim();
    }

    try {
      await apiRequest<AdminMorador>(
        `/condominios/${condominioId}/moradores`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setMoradorForm({
        nome: '',
        email: '',
        telefone: '',
      });

      setMensagemSucesso('Morador cadastrado com sucesso.');
      await carregarEstrutura(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível cadastrar o morador.',
        ),
      );
    } finally {
      setEnviandoMorador(false);
    }
  }

  function selecionarMoradorParaAcessoPortal(moradorId: string) {
    const morador = moradores.find(
      (item) => item.id === Number(moradorId),
    );

    setAcessoPortalForm((atual) => ({
      ...atual,
      moradorId,
      email: morador?.email ?? '',
      telefone: morador?.telefone ?? '',
    }));
  }

  function selecionarMoradorParaVinculoUsuario(moradorId: string) {
    const morador = moradores.find(
      (item) => item.id === Number(moradorId),
    );

    setVincularUsuarioForm({
      moradorId,
      email: morador?.email ?? '',
    });
  }

  function obterUrlLoginPortal() {
    if (typeof window === 'undefined') {
      return 'https://condominaria.bacuridigital.com/portal/login';
    }

    return `${window.location.origin}/portal/login`;
  }

  function normalizarTelefoneWhatsapp(telefone?: string | null) {
    const apenasNumeros = String(telefone ?? '').replace(/\D/g, '');

    if (!apenasNumeros) {
      return '';
    }

    if (apenasNumeros.startsWith('55') && apenasNumeros.length >= 12) {
      return apenasNumeros;
    }

    if (apenasNumeros.length === 10 || apenasNumeros.length === 11) {
      return `55${apenasNumeros}`;
    }

    return apenasNumeros.length >= 12 ? apenasNumeros : '';
  }

  function montarMensagemConviteAcesso(morador: AdminMorador) {
    const nomeCondominio =
      condominioSelecionado?.condominio.nome ?? 'seu condomínio';
    const emailAcesso = morador.usuario?.email ?? morador.email ?? '';
    const urlPortal = obterUrlLoginPortal();

    return [
      `Olá, ${morador.nome}!`,
      '',
      `Seu acesso ao Portal do Morador do ${nomeCondominio} já está disponível.`,
      '',
      `Acesse: ${urlPortal}`,
      emailAcesso ? `Use o e-mail: ${emailAcesso}` : '',
      '',
      'Pelo portal você poderá acompanhar cobranças, comunicados, reservas, ocorrências, encomendas, votações e assembleias.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  async function copiarTexto(textoParaCopiar: string) {
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

  async function copiarConviteAcessoMorador(morador: AdminMorador) {
    if (!morador.usuario?.email && !morador.email) {
      setErroAcao('Informe ou vincule um e-mail para gerar o convite de acesso.');
      return;
    }

    try {
      await copiarTexto(montarMensagemConviteAcesso(morador));
      setErroAcao('');
      setMensagemSucesso('Convite de acesso copiado.');
    } catch {
      setErroAcao('Não foi possível copiar o convite de acesso.');
    }
  }

  function abrirWhatsappConviteAcessoMorador(morador: AdminMorador) {
    const telefoneWhatsapp = normalizarTelefoneWhatsapp(
      morador.telefone ?? morador.usuario?.telefone,
    );

    if (!telefoneWhatsapp) {
      setErroAcao('Informe um telefone válido para abrir o convite no WhatsApp.');
      return;
    }

    const mensagem = montarMensagemConviteAcesso(morador);
    const url = `https://wa.me/${telefoneWhatsapp}?text=${encodeURIComponent(
      mensagem,
    )}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function vincularUsuarioMorador(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !condominioId ||
      !vincularUsuarioForm.moradorId ||
      enviandoVincularUsuario
    ) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoVincularUsuario(true);

    const payload: VincularUsuarioMoradorAdminPayload = {
      email: vincularUsuarioForm.email.trim().toLowerCase(),
    };

    try {
      await apiRequest<AdminMorador>(
        `/condominios/${condominioId}/moradores/${Number(vincularUsuarioForm.moradorId)}/usuario`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      setVincularUsuarioForm({
        moradorId: '',
        email: '',
      });

      setMensagemSucesso(
        'Usuário existente vinculado ao morador com sucesso.',
      );

      await carregarEstrutura(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível vincular o usuário existente ao morador.',
        ),
      );
    } finally {
      setEnviandoVincularUsuario(false);
    }
  }

  async function desvincularUsuarioMorador(moradorId: number) {
    if (!condominioId || moradorDesvinculandoId) {
      return;
    }

    const confirmado = window.confirm(
      'Deseja desvincular este usuário do morador? O usuário continuará existindo, mas perderá o vínculo direto com este morador.',
    );

    if (!confirmado) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setMoradorDesvinculandoId(moradorId);

    try {
      await apiRequest<AdminMorador>(
        `/condominios/${condominioId}/moradores/${moradorId}/usuario`,
        {
          method: 'DELETE',
        },
      );

      setMensagemSucesso('Usuário desvinculado do morador com sucesso.');
      await carregarEstrutura(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível desvincular o usuário do morador.',
        ),
      );
    } finally {
      setMoradorDesvinculandoId(null);
    }
  }

  async function criarAcessoPortalMorador(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !condominioId ||
      !acessoPortalForm.moradorId ||
      enviandoAcessoPortal
    ) {
      return;
    }

    const moradorSelecionado = moradores.find(
      (morador) => morador.id === Number(acessoPortalForm.moradorId),
    );

    const confirmado = window.confirm(
      `Confirmar criação de acesso ao Portal para ${moradorSelecionado?.nome ?? 'este morador'}?`,
    );

    if (!confirmado) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoAcessoPortal(true);

    const payload: CriarAcessoPortalMoradorAdminPayload = {
      email: acessoPortalForm.email.trim().toLowerCase(),
      senha: acessoPortalForm.senha,
    };

    if (acessoPortalForm.telefone.trim()) {
      payload.telefone = acessoPortalForm.telefone.trim();
    }

    try {
      await apiRequest(
        `/condominios/${condominioId}/moradores/${Number(acessoPortalForm.moradorId)}/acesso-portal`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setAcessoPortalForm({
        moradorId: '',
        email: '',
        telefone: '',
        senha: '',
      });

      setMensagemSucesso(
        'Acesso ao Portal do Morador criado com sucesso.',
      );

      await carregarEstrutura(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível criar o acesso ao Portal do Morador.',
        ),
      );
    } finally {
      setEnviandoAcessoPortal(false);
    }
  }

  async function vincularMoradorUnidade(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !condominioId ||
      !vinculoForm.moradorId ||
      !vinculoForm.unidadeId ||
      enviandoVinculo
    ) {
      return;
    }

    const moradorSelecionado = moradores.find(
      (morador) => morador.id === Number(vinculoForm.moradorId),
    );
    const unidadeSelecionada = unidades.find(
      (unidade) => unidade.id === Number(vinculoForm.unidadeId),
    );

    const confirmado = window.confirm(
      `Confirmar vínculo de ${moradorSelecionado?.nome ?? 'morador'} à unidade ${unidadeSelecionada?.identificador ?? ''} como ${rotuloPapelMorador(vinculoForm.papel)}?`,
    );

    if (!confirmado) {
      return;
    }

    setErroAcao('');
    setMensagemSucesso('');
    setEnviandoVinculo(true);

    const payload: VincularMoradorUnidadeAdminPayload = {
      unidadeId: Number(vinculoForm.unidadeId),
      papel: vinculoForm.papel,
      principal: vinculoForm.principal,
    };

    try {
      await apiRequest(
        `/condominios/${condominioId}/moradores/${Number(vinculoForm.moradorId)}/unidades`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );

      setVinculoForm({
        moradorId: '',
        unidadeId: '',
        papel: 'PROPRIETARIO',
        principal: true,
      });

      setMensagemSucesso('Morador vinculado à unidade com sucesso.');
      await carregarEstrutura(condominioId);
    } catch (error) {
      setErroAcao(
        obterMensagemErro(
          error,
          'Não foi possível vincular o morador à unidade.',
        ),
      );
    } finally {
      setEnviandoVinculo(false);
    }
  }

  return (
    <AdminShell
      usuario={usuario}
      condominiosAdministrativos={condominiosAdministrativos}
    >
      <section className="rounded-[2rem] border border-orange-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Cadastros-base
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Estrutura do condomínio
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
              Cadastre blocos, unidades e moradores. Depois vincule cada
              morador à unidade correspondente para habilitar os fluxos do
              Portal, cobranças, reservas, ocorrências e portaria.
            </p>
          </div>

          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
                Condomínio ativo
              </span>

              <select
                value={condominioId}
                onChange={(event) =>
                  setCondominioId(Number(event.target.value))
                }
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {condominiosAdministrativos.map((vinculo) => (
                  <option
                    key={vinculo.id}
                    value={vinculo.condominio.id}
                  >
                    {vinculo.condominio.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {condominiosAdministrativos.length === 0 ? (
        <section className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="text-sm font-bold">
            Nenhum condomínio administrativo disponível.
          </p>
          <p className="mt-2 text-sm leading-6">
            Sua conta possui acesso ao painel, mas ainda não há um condomínio
            selecionável nesta área.
          </p>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoEstruturaCard
          titulo="Blocos"
          valor={resumo.blocos}
          detalhe="Torres, blocos ou setores cadastrados"
          icon={<Building2 className="h-5 w-5" />}
        />
        <ResumoEstruturaCard
          titulo="Unidades"
          valor={resumo.unidades}
          detalhe="Apartamentos, casas, salas ou lojas"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <ResumoEstruturaCard
          titulo="Moradores"
          valor={resumo.moradores}
          detalhe="Pessoas cadastradas na base do condomínio"
          icon={<UsersRound className="h-5 w-5" />}
        />
        <ResumoEstruturaCard
          titulo="Com unidade"
          valor={resumo.moradoresComUnidade}
          detalhe="Moradores já vinculados a uma unidade"
          icon={<UsersRound className="h-5 w-5" />}
        />
      </section>

      {carregando ? (
        <section className="mt-6 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-700 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-500" />
          Carregando estrutura do condomínio...
        </section>
      ) : null}

      {erroCarregamento ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
          <p className="text-sm font-bold">
            Não foi possível carregar os cadastros.
          </p>
          <p className="mt-2 text-sm leading-6">
            {erroCarregamento}
          </p>

          <button
            type="button"
            onClick={() => void carregarEstrutura(condominioId)}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-2xl bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </button>
        </section>
      ) : null}

      {erroAcao ? (
        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">
          {erroAcao}
        </section>
      ) : null}

      {mensagemSucesso ? (
        <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
          {mensagemSucesso}
        </section>
      ) : null}

      {!podeGerirEstrutura ? (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="text-sm font-bold">
            Modo leitura habilitado.
          </p>
          <p className="mt-2 text-sm leading-6">
            Seu perfil pode consultar a estrutura do condomínio, mas não pode
            cadastrar blocos, unidades, moradores ou vínculos.
          </p>
        </section>
      ) : null}

      <section className="mt-6 grid w-full max-w-full grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Blocos
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Cadastro de blocos
            </h3>
          </div>

          {podeGerirEstrutura ? (
            <form
              onSubmit={criarBloco}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Nome do bloco
                </span>
                <input
                  value={blocoForm.nome}
                  onChange={(event) =>
                    setBlocoForm((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Torre A"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Descrição
                </span>
                <input
                  value={blocoForm.descricao}
                  onChange={(event) =>
                    setBlocoForm((atual) => ({
                      ...atual,
                      descricao: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Ordem de exibição
                </span>
                <input
                  type="number"
                  min="0"
                  value={blocoForm.ordem}
                  onChange={(event) =>
                    setBlocoForm((atual) => ({
                      ...atual,
                      ordem: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <button
                type="submit"
                disabled={enviandoBloco}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviandoBloco ? 'Salvando bloco...' : 'Cadastrar bloco'}
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-3">
            {blocos.map((bloco) => (
              <div
                key={bloco.id}
                className="admin-morador-card w-full max-w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-bold text-slate-950">
                    {bloco.nome}
                  </p>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
                    Ordem {bloco.ordem}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {bloco.descricao || 'Sem descrição.'}
                </p>
              </div>
            ))}

            {blocos.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Nenhum bloco cadastrado.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Unidades
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Cadastro de unidades
            </h3>
          </div>

          {podeGerirEstrutura ? (
            <form
              onSubmit={criarUnidade}
              className="mt-5 grid gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Número
                  </span>
                  <input
                    value={unidadeForm.numero}
                    onChange={(event) =>
                      setUnidadeForm((atual) => ({
                        ...atual,
                        numero: event.target.value,
                      }))
                    }
                    placeholder="101"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Tipo
                  </span>
                  <select
                    value={unidadeForm.tipo}
                    onChange={(event) =>
                      setUnidadeForm((atual) => ({
                        ...atual,
                        tipo: event.target.value as TipoUnidadeAdmin,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    {tiposUnidade.map((tipo) => (
                      <option
                        key={tipo.value}
                        value={tipo.value}
                      >
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Bloco
                  </span>
                  <select
                    value={unidadeForm.blocoId}
                    onChange={(event) =>
                      setUnidadeForm((atual) => ({
                        ...atual,
                        blocoId: event.target.value,
                      }))
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  >
                    <option value="">Sem bloco</option>
                    {blocos.map((bloco) => (
                      <option
                        key={bloco.id}
                        value={bloco.id}
                      >
                        {bloco.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Andar
                  </span>
                  <input
                    type="number"
                    value={unidadeForm.andar}
                    onChange={(event) =>
                      setUnidadeForm((atual) => ({
                        ...atual,
                        andar: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Observações
                </span>
                <input
                  value={unidadeForm.observacoes}
                  onChange={(event) =>
                    setUnidadeForm((atual) => ({
                      ...atual,
                      observacoes: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <button
                type="submit"
                disabled={enviandoUnidade}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviandoUnidade ? 'Salvando unidade...' : 'Cadastrar unidade'}
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-3">
            {unidades.map((unidade) => (
              <div
                key={unidade.id}
                className="admin-morador-card w-full max-w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-bold text-slate-950">
                    {unidade.identificador}
                  </p>
                  <TipoUnidadeBadge tipo={unidade.tipo} />
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {unidade.bloco?.nome
                    ? `Bloco: ${unidade.bloco.nome}`
                    : 'Sem bloco vinculado.'}
                  {unidade.andar !== null ? ` • Andar ${unidade.andar}` : ''}
                </p>
              </div>
            ))}

            {unidades.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Nenhuma unidade cadastrada.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 grid w-full max-w-full grid-cols-1 gap-6 xl:grid-cols-2">
        <article className="admin-moradores-cadastro-article rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Moradores
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Cadastro de moradores
            </h3>
          </div>

          {podeGerirEstrutura ? (
            <form
              onSubmit={criarMorador}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Nome
                </span>
                <input
                  value={moradorForm.nome}
                  onChange={(event) =>
                    setMoradorForm((atual) => ({
                      ...atual,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Nome completo"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    E-mail
                  </span>
                  <input
                    type="email"
                    value={moradorForm.email}
                    onChange={(event) =>
                      setMoradorForm((atual) => ({
                        ...atual,
                        email: event.target.value,
                      }))
                    }
                    placeholder="morador@email.com"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Telefone
                  </span>
                  <input
                    value={moradorForm.telefone}
                    onChange={(event) =>
                      setMoradorForm((atual) => ({
                        ...atual,
                        telefone: event.target.value,
                      }))
                    }
                    placeholder="(00) 00000-0000"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={enviandoMorador}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviandoMorador ? 'Salvando morador...' : 'Cadastrar morador'}
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-3">
            {moradores.map((morador) => (
              <div
                key={morador.id}
                className="admin-morador-card w-full max-w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-base font-bold text-slate-950">
                  {morador.nome}
                </p>

                <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                  {morador.email || 'Sem e-mail cadastrado.'}
                  {morador.telefone ? ` • ${morador.telefone}` : ''}
                </p>

                {morador.usuario ? (
                  <div className="mt-3 w-full min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-800">
                          Usuário vinculado
                        </p>
                        <p className="mt-1 text-sm font-bold text-emerald-950">
                          {morador.usuario.nome}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-emerald-800">
                          {morador.usuario.email}
                        </p>
                      </div>

                      {podeProvisionarAcessoPortal ? (
                        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:min-w-[210px]">
                          <button
                            type="button"
                            onClick={() => void copiarConviteAcessoMorador(morador)}
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar convite
                          </button>

                          <button
                            type="button"
                            onClick={() => abrirWhatsappConviteAcessoMorador(morador)}
                            disabled={
                              !normalizarTelefoneWhatsapp(
                                morador.telefone ?? morador.usuario.telefone,
                              )
                            }
                            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Abrir WhatsApp
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void desvincularUsuarioMorador(morador.id)
                            }
                            disabled={moradorDesvinculandoId === morador.id}
                            className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-emerald-200 bg-white px-3 text-xs font-bold text-emerald-800 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {moradorDesvinculandoId === morador.id
                              ? 'Desvinculando...'
                              : 'Desvincular'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <PortalStatusBadge temAcesso={Boolean(morador.usuarioId)} />

                  <ConviteStatusBadge temAcesso={Boolean(morador.usuarioId)} />
                  {morador.unidades.map((vinculo) => (
                    <UnidadeMoradorBadge
                      key={vinculo.id}
                      identificador={vinculo.unidade.identificador}
                      papel={vinculo.papel}
                      principal={vinculo.principal}
                    />
                  ))}

                  {morador.unidades.length === 0 ? (
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                      Sem unidade
                    </span>
                  ) : null}
                </div>
              </div>
            ))}

            {moradores.length === 0 && !carregando ? (
              <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Nenhum morador cadastrado.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Vinculação
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Morador e unidade
            </h3>
          </div>

          {podeGerirEstrutura ? (
            <form
              onSubmit={vincularMoradorUnidade}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Morador
                </span>
                <select
                  value={vinculoForm.moradorId}
                  onChange={(event) =>
                    setVinculoForm((atual) => ({
                      ...atual,
                      moradorId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Selecione um morador</option>
                  {moradores.map((morador) => (
                    <option
                      key={morador.id}
                      value={morador.id}
                    >
                      {morador.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Unidade
                </span>
                <select
                  value={vinculoForm.unidadeId}
                  onChange={(event) =>
                    setVinculoForm((atual) => ({
                      ...atual,
                      unidadeId: event.target.value,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Selecione uma unidade</option>
                  {unidades.map((unidade) => (
                    <option
                      key={unidade.id}
                      value={unidade.id}
                    >
                      {unidade.identificador}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Papel na unidade
                </span>
                <select
                  value={vinculoForm.papel}
                  onChange={(event) =>
                    setVinculoForm((atual) => ({
                      ...atual,
                      papel: event.target.value as PapelMoradorUnidadeAdmin,
                    }))
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                >
                  {papeisMoradorUnidade.map((papel) => (
                    <option
                      key={papel.value}
                      value={papel.value}
                    >
                      {papel.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={vinculoForm.principal}
                  onChange={(event) =>
                    setVinculoForm((atual) => ({
                      ...atual,
                      principal: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                <span className="text-sm font-bold text-slate-800">
                  Definir como unidade principal do morador
                </span>
              </label>

              <button
                type="submit"
                disabled={
                  enviandoVinculo ||
                  moradores.length === 0 ||
                  unidades.length === 0
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviandoVinculo
                  ? 'Salvando vínculo...'
                  : 'Vincular morador à unidade'}
              </button>
            </form>
          ) : null}

          <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-sm font-bold text-orange-950">
              Fluxo recomendado
            </p>
            <p className="mt-2 text-sm leading-6 text-orange-900">
              Cadastre primeiro o bloco, depois a unidade, em seguida o
              morador e por fim faça o vínculo entre morador e unidade.
            </p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-orange-600">
              Acesso ao portal
            </p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">
              Criar acesso do morador
            </h3>
          </div>

          {podeProvisionarAcessoPortal ? (
            <div className="mt-5 grid gap-5">
              <form
                onSubmit={vincularUsuarioMorador}
                className="grid gap-4 rounded-3xl border border-emerald-100 bg-emerald-50 p-4"
              >
                <div>
                  <p className="text-sm font-bold text-emerald-950">
                    Vincular usuário existente
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    Use quando o morador já possui usuário cadastrado no sistema.
                  </p>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Morador sem vínculo
                  </span>
                  <select
                    value={vincularUsuarioForm.moradorId}
                    onChange={(event) =>
                      selecionarMoradorParaVinculoUsuario(event.target.value)
                    }
                    className="h-12 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    required
                  >
                    <option value="">Selecione um morador</option>
                    {moradoresSemAcessoPortal.map((morador) => (
                      <option
                        key={morador.id}
                        value={morador.id}
                      >
                        {morador.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    E-mail do usuário já cadastrado
                  </span>
                  <input
                    type="email"
                    value={vincularUsuarioForm.email}
                    onChange={(event) =>
                      setVincularUsuarioForm((atual) => ({
                        ...atual,
                        email: event.target.value,
                      }))
                    }
                    placeholder="usuario@email.com"
                    className="h-12 rounded-2xl border border-emerald-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    enviandoVincularUsuario ||
                    moradoresSemAcessoPortal.length === 0
                  }
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviandoVincularUsuario
                    ? 'Vinculando usuário...'
                    : 'Vincular usuário existente'}
                </button>
              </form>

              <form
                onSubmit={criarAcessoPortalMorador}
                className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4"
              >
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  Morador sem acesso
                </span>
                <select
                  value={acessoPortalForm.moradorId}
                  onChange={(event) =>
                    selecionarMoradorParaAcessoPortal(event.target.value)
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                >
                  <option value="">Selecione um morador</option>
                  {moradoresSemAcessoPortal.map((morador) => (
                    <option
                      key={morador.id}
                      value={morador.id}
                    >
                      {morador.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700">
                  E-mail de acesso
                </span>
                <input
                  type="email"
                  value={acessoPortalForm.email}
                  onChange={(event) =>
                    setAcessoPortalForm((atual) => ({
                      ...atual,
                      email: event.target.value,
                    }))
                  }
                  placeholder="morador@email.com"
                  className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Telefone
                  </span>
                  <input
                    value={acessoPortalForm.telefone}
                    onChange={(event) =>
                      setAcessoPortalForm((atual) => ({
                        ...atual,
                        telefone: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Senha inicial
                  </span>
                  <input
                    type="password"
                    minLength={8}
                    value={acessoPortalForm.senha}
                    onChange={(event) =>
                      setAcessoPortalForm((atual) => ({
                        ...atual,
                        senha: event.target.value,
                      }))
                    }
                    placeholder="Mínimo 8 caracteres"
                    className="h-12 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  enviandoAcessoPortal ||
                  moradoresSemAcessoPortal.length === 0
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviandoAcessoPortal
                  ? 'Criando acesso...'
                  : 'Criar acesso ao Portal'}
              </button>
            </form>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              <p className="text-sm font-bold">
                Seu perfil não pode criar acessos ao portal.
              </p>
              <p className="mt-2 text-sm leading-6">
                Esta ação está liberada para Administrador, Síndico e Super Admin.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-sm font-bold text-orange-950">
              Convite de acesso
            </p>
            <p className="mt-2 text-sm leading-6 text-orange-900">
              Depois de criar ou vincular o usuário, use os botões no card do morador para copiar o convite ou abrir a mensagem pronta no WhatsApp.
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-950">
              Situação atual
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {moradoresComAcessoPortal.length} com acesso
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                {moradoresSemAcessoPortal.length} sem acesso
              </span>
            </div>

            {moradoresSemAcessoPortal.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Todos os moradores cadastrados já possuem usuário vinculado ao Portal.
              </p>
            ) : null}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
