import { useCallback, useEffect, useRef, useState } from 'react';

type UseAutoRefreshParams = {
  enabled?: boolean;
  intervalMs?: number;
  onRefresh: () => void;
};

const CHAVE_AUTO_REFRESH = 'condominaria:portal:auto-refresh';
const EVENTO_AUTO_REFRESH = 'condominaria:auto-refresh-alterado';

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

function salvarAutoRefreshAtivo(ativo: boolean) {
  try {
    window.localStorage.setItem(CHAVE_AUTO_REFRESH, String(ativo));
    window.dispatchEvent(new Event(EVENTO_AUTO_REFRESH));
  } catch {
    // Sem ação: localStorage pode estar indisponível em alguns navegadores.
  }
}

export function useAutoRefresh({
  enabled = true,
  intervalMs = 120000,
  onRefresh,
}: UseAutoRefreshParams) {
  const onRefreshRef = useRef(onRefresh);
  const [autoRefreshAtivo, setAutoRefreshAtivoState] =
    useState(obterAutoRefreshAtivo);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const setAutoRefreshAtivo = useCallback((ativo: boolean) => {
    salvarAutoRefreshAtivo(ativo);
    setAutoRefreshAtivoState(ativo);
  }, []);

  useEffect(() => {
    function sincronizarPreferencia() {
      setAutoRefreshAtivoState(obterAutoRefreshAtivo());
    }

    window.addEventListener(EVENTO_AUTO_REFRESH, sincronizarPreferencia);
    window.addEventListener('storage', sincronizarPreferencia);

    return () => {
      window.removeEventListener(EVENTO_AUTO_REFRESH, sincronizarPreferencia);
      window.removeEventListener('storage', sincronizarPreferencia);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !autoRefreshAtivo) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      onRefreshRef.current();
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoRefreshAtivo, enabled, intervalMs]);

  return {
    autoRefreshAtivo,
    setAutoRefreshAtivo,
  };
}
