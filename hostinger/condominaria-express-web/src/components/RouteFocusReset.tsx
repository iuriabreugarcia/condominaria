import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteFocusReset() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      return;
    }

    const timer = window.setTimeout(() => {
      const conteudoPrincipal =
        document.getElementById('conteudo-principal');

      if (!(conteudoPrincipal instanceof HTMLElement)) {
        return;
      }

      conteudoPrincipal.focus({
        preventScroll: true,
      });
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    location.pathname,
    location.search,
    location.hash,
  ]);

  return null;
}
