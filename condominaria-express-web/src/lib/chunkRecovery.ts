const RELOAD_KEY = 'condominaria:last-chunk-reload-at';
const RELOAD_INTERVAL_MS = 30_000;

function canReloadNow() {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
  return Date.now() - lastReload > RELOAD_INTERVAL_MS;
}

function markReload() {
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
}

function reloadForNewBuild() {
  if (!canReloadNow()) {
    return;
  }

  markReload();
  window.location.reload();
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForNewBuild();
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === 'string'
        ? reason
        : '';

  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk')
  ) {
    event.preventDefault();
    reloadForNewBuild();
  }
});
