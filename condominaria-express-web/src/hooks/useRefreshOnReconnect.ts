import { useEffect, useRef } from 'react';

type UseRefreshOnReconnectParams = {
  enabled?: boolean;
  onReconnect: () => void;
};

export function useRefreshOnReconnect({
  enabled = true,
  onReconnect,
}: UseRefreshOnReconnectParams) {
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function atualizarAoReconectar() {
      onReconnectRef.current();
    }

    window.addEventListener('online', atualizarAoReconectar);

    return () => {
      window.removeEventListener('online', atualizarAoReconectar);
    };
  }, [enabled]);
}
