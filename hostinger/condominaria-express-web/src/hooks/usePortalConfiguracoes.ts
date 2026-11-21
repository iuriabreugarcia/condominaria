import { useEffect, useState } from 'react';
import { usePortal } from '../context/PortalContext';
import { apiRequest } from '../lib/api';
import { friendlyErrorMessage } from '../lib/friendlyErrorMessage';
import type { PortalConfiguracoesCondominio } from '../types/api';

type EstadoConfiguracoesPortal = {
  configuracoes: PortalConfiguracoesCondominio | null;
  carregando: boolean;
  erro: string | null;
};

export function usePortalConfiguracoes() {
  const { moradorAtivo } = usePortal();
  const [estado, setEstado] = useState<EstadoConfiguracoesPortal>({
    configuracoes: null,
    carregando: false,
    erro: null,
  });

  useEffect(() => {
    let ativo = true;

    async function carregarConfiguracoesPortal() {
      if (!moradorAtivo) {
        setEstado({
          configuracoes: null,
          carregando: false,
          erro: null,
        });
        return;
      }

      setEstado((atual) => ({
        ...atual,
        carregando: true,
        erro: null,
      }));

      try {
        const configuracoes = await apiRequest<PortalConfiguracoesCondominio>(
          `/condominios/${moradorAtivo.condominioId}/configuracoes/portal`,
        );

        if (ativo) {
          setEstado({
            configuracoes,
            carregando: false,
            erro: null,
          });
        }
      } catch (error) {
        if (ativo) {
          setEstado({
            configuracoes: null,
            carregando: false,
            erro: friendlyErrorMessage(
              error,
              'Não foi possível carregar as configurações do portal.',
            ),
          });
        }
      }
    }

    void carregarConfiguracoesPortal();

    return () => {
      ativo = false;
    };
  }, [moradorAtivo]);

  return estado;
}
