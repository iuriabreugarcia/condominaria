import { Building2, ChevronRight } from 'lucide-react';
import {
  Link,
  useLocation,
} from 'react-router-dom';

const rotulosPorRota: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ocorrencias': 'Ocorrências',
  '/reservas': 'Reservas',
  '/visitantes': 'Visitantes',
  '/comunicados': 'Comunicados',
  '/cobrancas': 'Cobranças',
  '/encomendas': 'Encomendas',
  '/votacoes': 'Votações',
  '/perfil': 'Perfil',
};

function normalizarPathname(pathname: string) {
  const semPortal = pathname.replace(/^\/portal(?=\/|$)/, '');

  if (!semPortal || semPortal === '/') {
    return '/dashboard';
  }

  return semPortal;
}

export function PortalBreadcrumbs() {
  const location = useLocation();
  const pathname = normalizarPathname(location.pathname);
  const rotuloAtual = rotulosPorRota[pathname] ?? 'Portal';

  return (
    <nav
      aria-label="Navegação estrutural"
      className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500"
    >
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 transition hover:text-orange-700"
      >
        <Building2 className="h-3.5 w-3.5" />
        Portal do Morador
      </Link>

      {pathname !== '/dashboard' ? (
        <>
          <ChevronRight
            className="h-3.5 w-3.5 text-slate-300"
            aria-hidden="true"
          />

          <span
            aria-current="page"
            className="text-orange-700"
          >
            {rotuloAtual}
          </span>
        </>
      ) : null}
    </nav>
  );
}
