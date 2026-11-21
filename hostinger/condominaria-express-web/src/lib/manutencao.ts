export type ManutencaoStatusVisual =
  | 'ABERTA'
  | 'PENDENTE'
  | 'EM_EXECUCAO'
  | 'EM_ANDAMENTO'
  | 'AGENDADA'
  | 'CONCLUIDA'
  | 'CONCLUIDO'
  | 'CANCELADA'
  | 'CANCELADO'
  | string;

export type ManutencaoPrioridadeVisual =
  | 'BAIXA'
  | 'MEDIA'
  | 'ALTA'
  | 'URGENTE'
  | string;

export function normalizarStatusManutencao(status: string | null | undefined) {
  return String(status ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

export function labelStatusManutencao(status: string | null | undefined) {
  const normalizado = normalizarStatusManutencao(status);

  const labels: Record<string, string> = {
    ABERTA: 'Aberta',
    PENDENTE: 'Pendente',
    AGENDADA: 'Agendada',
    EM_EXECUCAO: 'Em execução',
    EM_ANDAMENTO: 'Em andamento',
    CONCLUIDA: 'Concluída',
    CONCLUIDO: 'Concluído',
    CANCELADA: 'Cancelada',
    CANCELADO: 'Cancelado',
  };

  return labels[normalizado] ?? String(status ?? '-');
}

export function varianteStatusManutencao(status: string | null | undefined) {
  const normalizado = normalizarStatusManutencao(status);

  if (['CONCLUIDA', 'CONCLUIDO'].includes(normalizado)) {
    return 'success' as const;
  }

  if (['CANCELADA', 'CANCELADO'].includes(normalizado)) {
    return 'danger' as const;
  }

  if (['EM_EXECUCAO', 'EM_ANDAMENTO', 'AGENDADA'].includes(normalizado)) {
    return 'info' as const;
  }

  if (['ABERTA', 'PENDENTE'].includes(normalizado)) {
    return 'warning' as const;
  }

  return 'neutral' as const;
}

export function normalizarPrioridadeManutencao(
  prioridade: string | null | undefined,
) {
  return String(prioridade ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function labelPrioridadeManutencao(
  prioridade: string | null | undefined,
) {
  const normalizada = normalizarPrioridadeManutencao(prioridade);

  const labels: Record<string, string> = {
    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
  };

  return labels[normalizada] ?? String(prioridade ?? '-');
}

export function variantePrioridadeManutencao(
  prioridade: string | null | undefined,
) {
  const normalizada = normalizarPrioridadeManutencao(prioridade);

  if (normalizada === 'URGENTE') {
    return 'danger' as const;
  }

  if (normalizada === 'ALTA') {
    return 'warning' as const;
  }

  if (normalizada === 'MEDIA') {
    return 'info' as const;
  }

  if (normalizada === 'BAIXA') {
    return 'success' as const;
  }

  return 'neutral' as const;
}
