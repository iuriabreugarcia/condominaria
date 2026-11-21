import { PauseCircle } from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';

const CHAVE_AUTO_REFRESH =
  'condominaria:portal:auto-refresh';

const EVENTO_AUTO_REFRESH =
  'condominaria:auto-refresh-alterado';

function obterAutoRefreshAtivo() {
  try {
    const valor = window.localStorage.getItem(CHAVE_AUTO_REFRESH);

    if (valor === null) {
      return true;
    }

    return valor !== 'false';
  } catch {
    return true;
  }
}

export function AutoRefreshStatus() {
  const [ativo, setAtivo] =
    useState(obterAutoRefreshAtivo);

  useEffect(() => {
    function sincronizarStatus() {
      setAtivo(obterAutoRefreshAtivo());
    }

    window.addEventListener(
      EVENTO_AUTO_REFRESH,
      sincronizarStatus,
    );

    window.addEventListener(
      'storage',
      sincronizarStatus,
    );

    return () => {
      window.removeEventListener(
        EVENTO_AUTO_REFRESH,
        sincronizarStatus,
      );

      window.removeEventListener(
        'storage',
        sincronizarStatus,
      );
    };
  }, []);

  if (ativo) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm">
      <PauseCircle className="h-3.5 w-3.5" />
      Atualização automática pausada
    </div>
  );
}
