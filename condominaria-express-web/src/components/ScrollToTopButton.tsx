import { ArrowUp } from 'lucide-react';
import {
  useEffect,
  useState,
} from 'react';

export function ScrollToTopButton() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    function observarRolagem() {
      setVisivel(window.scrollY > 420);
    }

    observarRolagem();
    window.addEventListener('scroll', observarRolagem, { passive: true });

    return () => {
      window.removeEventListener('scroll', observarRolagem);
    };
  }, []);

  function voltarAoTopo() {
    const reduzirMovimento = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reduzirMovimento ? 'auto' : 'smooth',
    });
  }

  if (!visivel) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={voltarAoTopo}
      aria-label="Voltar ao topo"
      className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full border border-orange-200 bg-white px-4 text-sm font-bold text-orange-700 shadow-xl shadow-slate-300/50 transition hover:-translate-y-1 hover:border-orange-300 hover:bg-orange-50"
    >
      <ArrowUp className="h-4 w-4" />
      Topo
    </button>
  );
}
