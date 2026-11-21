import {
  CloudOff,
  Wifi,
  X,
} from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';

type StatusRede = 'ONLINE' | 'OFFLINE' | null;

export function NetworkStatusBanner() {
  const [status, setStatus] = useState<StatusRede>(
    typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'OFFLINE'
      : null,
  );

  useEffect(() => {
    function ficouOffline() {
      setStatus('OFFLINE');
    }

    function voltouOnline() {
      setStatus('ONLINE');

      const timer = window.setTimeout(() => {
        setStatus((atual) =>
          atual === 'ONLINE' ? null : atual,
        );
      }, 4500);

      return () => {
        window.clearTimeout(timer);
      };
    }

    window.addEventListener('offline', ficouOffline);
    window.addEventListener('online', voltouOnline);

    return () => {
      window.removeEventListener('offline', ficouOffline);
      window.removeEventListener('online', voltouOnline);
    };
  }, []);

  if (!status) {
    return null;
  }

  const offline = status === 'OFFLINE';

  return (
    <div
      role={offline ? 'alert' : 'status'}
      aria-live={offline ? 'assertive' : 'polite'}
      className={[
        'fixed left-1/2 top-4 z-[120] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border p-4 shadow-2xl print:hidden',
        offline
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm',
              offline ? 'text-red-700' : 'text-emerald-700',
            ].join(' ')}
          >
            {offline ? (
              <CloudOff className="h-5 w-5" />
            ) : (
              <Wifi className="h-5 w-5" />
            )}
          </span>

          <div>
            <p className="text-sm font-bold">
              {offline
                ? 'Sem conexão com a internet'
                : 'Conexão restabelecida'}
            </p>

            <p className="mt-1 text-sm leading-6">
              {offline
                ? 'Algumas ações podem falhar até a conexão voltar.'
                : 'O Portal já pode voltar a carregar dados normalmente.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStatus(null)}
          aria-label="Fechar aviso de conexão"
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white transition',
            offline
              ? 'border-red-200 text-red-700 hover:bg-red-100'
              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-100',
          ].join(' ')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
