import {
  ArrowLeft,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';
import {
  Link,
  Navigate,
  Outlet,
  useOutletContext,
} from 'react-router-dom';
import {
  apiRequest,
  ApiError,
} from '../lib/api';
import { isAuthenticated } from '../lib/auth';
import type {
  AuthMeCondominio,
  AuthMeResponse,
} from '../types/api';

const papeisAdministrativos = new Set([
  'ADMINISTRADOR',
  'SINDICO',
  'SUBSINDICO',
  'CONSELHEIRO',
  'FINANCEIRO',
  'PORTEIRO',
]);

export type AdminRouteContext = {
  usuario: AuthMeResponse;
  condominiosAdministrativos: AuthMeCondominio[];
};

export function useAdminRouteContext() {
  return useOutletContext<AdminRouteContext>();
}

function obterCondominiosAdministrativos(usuario: AuthMeResponse) {
  return usuario.condominios.filter(
    (vinculo) =>
      vinculo.condominio.ativo &&
      papeisAdministrativos.has(vinculo.papel),
  );
}

export function AdminProtectedRoute() {
  const autenticado = isAuthenticated();

  const [usuario, setUsuario] = useState<AuthMeResponse | null>(null);
  const [carregando, setCarregando] = useState(autenticado);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!autenticado) {
      setCarregando(false);
      return;
    }

    let ativo = true;

    async function carregarUsuario() {
      setCarregando(true);
      setErro('');

      try {
        const resposta = await apiRequest<AuthMeResponse>('/auth/me');

        if (!ativo) {
          return;
        }

        setUsuario(resposta);
      } catch (error) {
        if (!ativo) {
          return;
        }

        if (error instanceof ApiError) {
          setErro(error.message);
        } else {
          setErro('Não foi possível validar o acesso administrativo.');
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarUsuario();

    return () => {
      ativo = false;
    };
  }, [autenticado, tentativa]);

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex max-w-md items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </span>

          <div>
            <p className="text-sm font-bold text-slate-950">
              Validando acesso administrativo
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Aguarde enquanto confirmamos suas permissões.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white p-6 shadow-xl shadow-red-100/70 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <ShieldAlert className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
            Não foi possível validar o painel
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            {erro}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setTentativa((valor) => valor + 1)}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              <RefreshCcw className="h-4 w-4" />
              Tentar novamente
            </button>

            <Link
              to="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-orange-200 hover:text-orange-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao portal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const condominiosAdministrativos =
    obterCondominiosAdministrativos(usuario);

  const acessoLiberado =
    usuario.superAdmin || condominiosAdministrativos.length > 0;

  if (!acessoLiberado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-amber-200 bg-white p-6 shadow-xl shadow-amber-100/70 sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
            Acesso administrativo não liberado
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Sua conta está autenticada, mas não possui um perfil interno
            autorizado para acessar o Painel Administrativo.
          </p>

          <Link
            to="/dashboard"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Portal do Morador
          </Link>
        </div>
      </main>
    );
  }

  return (
    <Outlet
      context={{
        usuario,
        condominiosAdministrativos,
      }}
    />
  );
}
