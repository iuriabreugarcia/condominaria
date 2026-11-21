import {
  PauseCircle,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';

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

export function AutoRefreshToggle() {
  const [ativo, setAtivo] =
    useState(obterAutoRefreshAtivo);

  function alternarAutoRefresh() {
    const proximo = !ativo;

    setAtivo(proximo);

    try {
      window.localStorage.setItem(
        CHAVE_AUTO_REFRESH,
        String(proximo),
      );
    } catch {
      // Ignora falhas de storage.
    }

    window.dispatchEvent(
      new Event(EVENTO_AUTO_REFRESH),
    );
  }

  return (
    <button
      type="button"
      onClick={alternarAutoRefresh}
      aria-pressed={ativo}
      aria-label={
        ativo
          ? 'Pausar atualização automática'
          : 'Ativar atualização automática'
      }
      className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-xl shadow-slate-300/50 transition hover:-translate-y-1 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
    >
      {ativo ? (
        <RefreshCw className="h-4 w-4 text-emerald-600" />
      ) : (
        <PauseCircle className="h-4 w-4 text-slate-500" />
      )}

      <span className="hidden sm:inline">
        {ativo
          ? 'Atualização automática: ativa'
          : 'Atualização automática: pausada'}
      </span>

      <span className="sm:hidden">
        {ativo ? 'Auto' : 'Pausada'}
      </span>
    </button>
  );
}
