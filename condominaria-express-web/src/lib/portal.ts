import type { PortalMoradorMeResponse } from '../types/api';

const CONDOMINIO_ATIVO_KEY = 'condominaria_portal_condominio_ativo';

export type PerfilMoradorPortal =
  PortalMoradorMeResponse['moradores'][number];

export function getCondominioAtivoId(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const valor = localStorage.getItem(CONDOMINIO_ATIVO_KEY);

  if (!valor) {
    return null;
  }

  const numero = Number(valor);

  return Number.isInteger(numero) && numero > 0
    ? numero
    : null;
}

export function setCondominioAtivoId(condominioId: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    CONDOMINIO_ATIVO_KEY,
    String(condominioId),
  );
}

export function obterMoradorAtivo(
  contexto: PortalMoradorMeResponse,
): PerfilMoradorPortal {
  const moradores = contexto.moradores;

  if (!moradores.length) {
    throw new Error(
      'Nenhum perfil de morador vinculado a este usuário.',
    );
  }

  const condominioAtivoId = getCondominioAtivoId();

  if (condominioAtivoId) {
    const perfilAtivo = moradores.find(
      (morador) => morador.condominioId === condominioAtivoId,
    );

    if (perfilAtivo) {
      return perfilAtivo;
    }
  }

  const primeiroMorador = moradores[0];

  setCondominioAtivoId(primeiroMorador.condominioId);

  return primeiroMorador;
}
