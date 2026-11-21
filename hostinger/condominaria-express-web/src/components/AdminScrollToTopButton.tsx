import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AdminScrollToTopButton() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    function atualizarVisibilidade() {
      setVisivel(window.scrollY > 360);
    }

    atualizarVisibilidade();

    window.addEventListener('scroll', atualizarVisibilidade, { passive: true });

    return () => {
      window.removeEventListener('scroll', atualizarVisibilidade);
    };
  }, []);

  function voltarAoTopo() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      data-admin-topo-direita="true"
      className={`admin-scrolltop-fixed-right ${visivel ? 'is-visible' : ''}`}
      onClick={voltarAoTopo}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
