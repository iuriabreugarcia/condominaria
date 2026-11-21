import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function comportamentoRolagem(): ScrollBehavior {
  const reduzirMovimento = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  return reduzirMovimento ? 'auto' : 'smooth';
}

export function HashAnchorScroll() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const id = decodeURIComponent(
      location.hash.replace(/^#/, ''),
    );

    if (!id) {
      return;
    }

    const timer = window.setTimeout(() => {
      const alvo = document.getElementById(id);

      if (!alvo) {
        return;
      }

      alvo.scrollIntoView({
        behavior: comportamentoRolagem(),
        block: 'start',
      });

      if (alvo instanceof HTMLElement) {
        alvo.focus({
          preventScroll: true,
        });
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    location.pathname,
    location.hash,
  ]);

  return null;
}
