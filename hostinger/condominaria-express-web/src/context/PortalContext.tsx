import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import { getToken } from '../lib/auth';
import {
  getCondominioAtivoId,
  setCondominioAtivoId,
} from '../lib/portal';
import type {
  PerfilMoradorPortal,
} from '../lib/portal';
import type {
  PortalMoradorMeResponse,
} from '../types/api';

type PortalContextValue = {
  carregando: boolean;
  erro: string;
  contexto: PortalMoradorMeResponse | null;
  moradorAtivo: PerfilMoradorPortal | null;
  condominioAtivoId: number | null;
  trocarCondominio: (condominioId: number) => void;
  recarregarContexto: () => Promise<void>;
};

type PortalProviderProps = {
  children: ReactNode;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({
  children,
}: PortalProviderProps) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [contexto, setContexto] =
    useState<PortalMoradorMeResponse | null>(null);
  const [condominioAtivoId, setCondominioAtivoInterno] =
    useState<number | null>(() => getCondominioAtivoId());

  const recarregarContexto = useCallback(async () => {
    setCarregando(true);
    setErro('');

    if (!getToken()) {
      setContexto(null);
      setCarregando(false);
      return;
    }

    try {
      const resposta =
        await apiRequest<PortalMoradorMeResponse>('/portal-morador/me');

      setContexto(resposta);

      const salvo = getCondominioAtivoId();

      const perfilSalvoExiste = salvo
        ? resposta.moradores.some(
            (morador) => morador.condominioId === salvo,
          )
        : false;

      const novoCondominioAtivo = perfilSalvoExiste
        ? salvo
        : resposta.moradores[0]?.condominioId ?? null;

      setCondominioAtivoInterno(novoCondominioAtivo);

      if (novoCondominioAtivo) {
        setCondominioAtivoId(novoCondominioAtivo);
      }
    } catch (error) {
      const mensagem =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Não foi possível carregar o contexto do portal.';

      setErro(mensagem);
      setContexto(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregarContexto();
  }, [recarregarContexto]);

  const moradorAtivo = useMemo(() => {
    if (!contexto) {
      return null;
    }

    if (condominioAtivoId) {
      const encontrado = contexto.moradores.find(
        (morador) => morador.condominioId === condominioAtivoId,
      );

      if (encontrado) {
        return encontrado;
      }
    }

    return contexto.moradores[0] ?? null;
  }, [condominioAtivoId, contexto]);

  function trocarCondominio(condominioId: number) {
    if (!contexto) {
      return;
    }

    const permitido = contexto.moradores.some(
      (morador) => morador.condominioId === condominioId,
    );

    if (!permitido) {
      return;
    }

    setCondominioAtivoId(condominioId);
    setCondominioAtivoInterno(condominioId);
  }

  const value: PortalContextValue = {
    carregando,
    erro,
    contexto,
    moradorAtivo,
    condominioAtivoId,
    trocarCondominio,
    recarregarContexto,
  };

  return (
    <PortalContext.Provider value={value}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const contexto = useContext(PortalContext);

  if (!contexto) {
    throw new Error(
      'usePortal deve ser usado dentro de PortalProvider.',
    );
  }

  return contexto;
}
