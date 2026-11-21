import {
  lazy,
  Suspense,
  useEffect,
} from 'react';
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { HashAnchorScroll } from './components/HashAnchorScroll';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PortalProvider } from './context/PortalContext';

type PageLoader = () => Promise<unknown>;

const loadLoginPage = () =>
  import('./pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  }));

const LoginPage = lazy(loadLoginPage);

const loadDashboardPage = () =>
  import('./pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  }));

const DashboardPage = lazy(loadDashboardPage);

const loadOcorrenciasPage = () =>
  import('./pages/OcorrenciasPage').then((module) => ({
    default: module.OcorrenciasPage,
  }));

const OcorrenciasPage = lazy(loadOcorrenciasPage);

const loadReservasPage = () =>
  import('./pages/ReservasPage').then((module) => ({
    default: module.ReservasPage,
  }));

const ReservasPage = lazy(loadReservasPage);

const loadVisitantesPage = () =>
  import('./pages/VisitantesPage').then((module) => ({
    default: module.VisitantesPage,
  }));

const VisitantesPage = lazy(loadVisitantesPage);

const loadComunicadosPage = () =>
  import('./pages/ComunicadosPage').then((module) => ({
    default: module.ComunicadosPage,
  }));

const ComunicadosPage = lazy(loadComunicadosPage);

const loadCobrancasPage = () =>
  import('./pages/CobrancasPage').then((module) => ({
    default: module.CobrancasPage,
  }));

const CobrancasPage = lazy(loadCobrancasPage);

const loadEncomendasPage = () =>
  import('./pages/EncomendasPage').then((module) => ({
    default: module.EncomendasPage,
  }));

const EncomendasPage = lazy(loadEncomendasPage);

const loadAssembleiasPage = () =>
  import('./pages/AssembleiasPage').then((module) => ({
    default: module.AssembleiasPage,
  }));

const AssembleiasPage = lazy(loadAssembleiasPage);

const loadVotacoesPage = () =>
  import('./pages/VotacoesPage').then((module) => ({
    default: module.VotacoesPage,
  }));

const VotacoesPage = lazy(loadVotacoesPage);

const loadDocumentosPage = () =>
  import('./pages/DocumentosPage').then((module) => ({
    default: module.DocumentosPage,
  }));

const DocumentosPage = lazy(loadDocumentosPage);

const loadPerfilPage = () =>
  import('./pages/PerfilPage').then((module) => ({
    default: module.PerfilPage,
  }));

const PerfilPage = lazy(loadPerfilPage);

const loadAdminDashboardPage = () =>
  import('./pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  }));

const AdminDashboardPage = lazy(loadAdminDashboardPage);

const loadAdminEstruturaPage = () =>
  import('./pages/AdminEstruturaPage').then((module) => ({
    default: module.AdminEstruturaPage,
  }));

const AdminEstruturaPage = lazy(loadAdminEstruturaPage);

const loadAdminUsuariosPage = () =>
  import('./pages/AdminUsuariosPage').then((module) => ({
    default: module.AdminUsuariosPage,
  }));

const AdminUsuariosPage = lazy(loadAdminUsuariosPage);

const loadAdminAuditoriaPage = () =>
  import('./pages/AdminAuditoriaPage').then((module) => ({
    default: module.AdminAuditoriaPage,
  }));

const AdminAuditoriaPage = lazy(loadAdminAuditoriaPage);

const loadAdminRelatoriosPage = () =>
  import('./pages/AdminRelatoriosPage').then((module) => ({
    default: module.AdminRelatoriosPage,
  }));

const AdminRelatoriosPage = lazy(loadAdminRelatoriosPage);

const loadAdminDocumentosPage = () =>
  import('./pages/AdminDocumentosPage').then((module) => ({
    default: module.AdminDocumentosPage,
  }));

const AdminDocumentosPage = lazy(loadAdminDocumentosPage);

const loadAdminManutencaoPage = () =>
  import('./pages/AdminManutencaoPage').then((module) => ({
    default: module.AdminManutencaoPage,
  }));

const AdminManutencaoPage = lazy(loadAdminManutencaoPage);

const loadAdminContratosPage = () =>
  import('./pages/AdminContratosPage').then((module) => ({
    default: module.AdminContratosPage,
  }));

const AdminContratosPage = lazy(loadAdminContratosPage);

const loadAdminPrestadoresPage = () =>
  import('./pages/AdminPrestadoresPage').then((module) => ({
    default: module.AdminPrestadoresPage,
  }));

const AdminPrestadoresPage = lazy(loadAdminPrestadoresPage);

const loadAdminConfiguracoesPage = () =>
  import('./pages/AdminConfiguracoesPage').then((module) => ({
    default: module.AdminConfiguracoesPage,
  }));

const AdminConfiguracoesPage = lazy(loadAdminConfiguracoesPage);

const loadAdminOcorrenciasPage = () =>
  import('./pages/AdminOcorrenciasPage').then((module) => ({
    default: module.AdminOcorrenciasPage,
  }));

const AdminOcorrenciasPage = lazy(loadAdminOcorrenciasPage);

const loadAdminComunicacaoPage = () =>
  import('./pages/AdminComunicacaoPage').then((module) => ({
    default: module.AdminComunicacaoPage,
  }));

const AdminComunicacaoPage = lazy(loadAdminComunicacaoPage);

const loadAdminReservasPage = () =>
  import('./pages/AdminReservasPage').then((module) => ({
    default: module.AdminReservasPage,
  }));

const AdminReservasPage = lazy(loadAdminReservasPage);

const loadAdminPortariaPage = () =>
  import('./pages/AdminPortariaPage').then((module) => ({
    default: module.AdminPortariaPage,
  }));

const AdminPortariaPage = lazy(loadAdminPortariaPage);

const loadAdminFinanceiroPage = () =>
  import('./pages/AdminFinanceiroPage').then((module) => ({
    default: module.AdminFinanceiroPage,
  }));

const AdminFinanceiroPage = lazy(loadAdminFinanceiroPage);

const loadAdminGovernancaPage = () =>
  import('./pages/AdminGovernancaPage').then((module) => ({
    default: module.AdminGovernancaPage,
  }));

const AdminGovernancaPage = lazy(loadAdminGovernancaPage);

const loadNotFoundPage = () =>
  import('./pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  }));

const NotFoundPage = lazy(loadNotFoundPage);

const portalPrefetchLoaders: PageLoader[] = [
  loadDashboardPage,
  loadComunicadosPage,
  loadCobrancasPage,
  loadDocumentosPage,
  loadEncomendasPage,
  loadReservasPage,
];

const adminPrefetchLoaders: PageLoader[] = [
  loadAdminDashboardPage,
  loadAdminEstruturaPage,
  loadAdminDocumentosPage,
  loadAdminManutencaoPage,
  loadAdminPortariaPage,
];

function podeFazerPrefetch() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const navegador = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const conexao = navegador.connection;

  if (conexao?.saveData) {
    return false;
  }

  if (conexao?.effectiveType && /(^|-)2g$/i.test(conexao.effectiveType)) {
    return false;
  }

  return true;
}

function jaExecutouPrefetch(chave: string) {
  try {
    return sessionStorage.getItem(chave) === '1';
  } catch {
    return false;
  }
}

function marcarPrefetchExecutado(chave: string) {
  try {
    sessionStorage.setItem(chave, '1');
  } catch {
    // sessionStorage pode estar indisponível em navegação privada.
  }
}

function carregarModulosEmSegundoPlano(loaders: PageLoader[]) {
  loaders.forEach((loader, index) => {
    window.setTimeout(() => {
      void loader().catch(() => {
        // Prefetch não deve impactar a navegação do usuário.
      });
    }, index * 300);
  });
}

function agendarPrefetchInteligente() {
  if (typeof window === 'undefined' || !podeFazerPrefetch()) {
    return undefined;
  }

  const pathname = window.location.pathname;
  const estaNoLogin = pathname.endsWith('/login') || pathname.includes('/login');

  if (estaNoLogin) {
    return undefined;
  }

  const isAdmin = pathname.includes('/admin');
  const chave = isAdmin
    ? 'condominaria_prefetch_admin_v1'
    : 'condominaria_prefetch_portal_v1';

  if (jaExecutouPrefetch(chave)) {
    return undefined;
  }

  const loaders = isAdmin ? adminPrefetchLoaders : portalPrefetchLoaders;

  const executar = () => {
    marcarPrefetchExecutado(chave);
    carregarModulosEmSegundoPlano(loaders);
  };

  const janela = window as typeof window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: {
        timeout?: number;
      },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (janela.requestIdleCallback) {
    const idleId = janela.requestIdleCallback(executar, {
      timeout: 2500,
    });

    return () => {
      janela.cancelIdleCallback?.(idleId);
    };
  }

  const timeoutId = window.setTimeout(executar, 1200);

  return () => {
    window.clearTimeout(timeoutId);
  };
}

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm font-semibold text-slate-700 shadow-sm">
        Carregando página...
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => agendarPrefetchInteligente(), []);

  return (
    <>
      <HashAnchorScroll />

      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <PortalProvider>
                <ProtectedRoute />
              </PortalProvider>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ocorrencias" element={<OcorrenciasPage />} />
            <Route path="/reservas" element={<ReservasPage />} />
            <Route path="/visitantes" element={<VisitantesPage />} />
            <Route path="/comunicados" element={<ComunicadosPage />} />
            <Route path="/cobrancas" element={<CobrancasPage />} />
            <Route path="/encomendas" element={<EncomendasPage />} />
            <Route path="/assembleias" element={<AssembleiasPage />} />
            <Route path="/votacoes" element={<VotacoesPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Route>

          <Route element={<AdminProtectedRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/estrutura" element={<AdminEstruturaPage />} />
            <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
            <Route path="/admin/auditoria" element={<AdminAuditoriaPage />} />
            <Route path="/admin/relatorios" element={<AdminRelatoriosPage />} />
            <Route path="/admin/configuracoes" element={<AdminConfiguracoesPage />} />
            <Route path="/admin/documentos" element={<AdminDocumentosPage />} />
            <Route path="/admin/prestadores" element={<AdminPrestadoresPage />} />
            <Route path="/admin/manutencao" element={<AdminManutencaoPage />} />
            <Route path="/admin/contratos" element={<AdminContratosPage />} />
            <Route path="/admin/comunicacao" element={<AdminComunicacaoPage />} />
            <Route path="/admin/ocorrencias" element={<AdminOcorrenciasPage />} />
            <Route path="/admin/reservas" element={<AdminReservasPage />} />
            <Route path="/admin/portaria" element={<AdminPortariaPage />} />
            <Route path="/admin/financeiro" element={<AdminFinanceiroPage />} />
            <Route path="/admin/governanca" element={<AdminGovernancaPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
