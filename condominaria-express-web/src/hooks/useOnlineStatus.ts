import { useEffect, useState } from 'react';

function obterStatusInicial() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(obterStatusInicial);

  useEffect(() => {
    function marcarOnline() {
      setOnline(true);
    }

    function marcarOffline() {
      setOnline(false);
    }

    window.addEventListener('online', marcarOnline);
    window.addEventListener('offline', marcarOffline);

    return () => {
      window.removeEventListener('online', marcarOnline);
      window.removeEventListener('offline', marcarOffline);
    };
  }, []);

  return online;
}
