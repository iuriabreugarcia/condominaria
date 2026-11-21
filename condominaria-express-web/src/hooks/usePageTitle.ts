import { useEffect } from 'react';

const NOME_SISTEMA = 'Condominaria Express';

export function usePageTitle(titulo: string) {
  useEffect(() => {
    const tituloAnterior = document.title;
    const tituloLimpo = titulo.trim();

    document.title = tituloLimpo
      ? `${tituloLimpo} | ${NOME_SISTEMA}`
      : NOME_SISTEMA;

    return () => {
      document.title = tituloAnterior || NOME_SISTEMA;
    };
  }, [titulo]);
}
