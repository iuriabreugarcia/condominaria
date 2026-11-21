export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'orange';

const statusLabels: Record<string, string> = {
  ativo: 'Ativo',
  ativa: 'Ativa',
  inativo: 'Inativo',
  inativa: 'Inativa',
  pendente: 'Pendente',
  aberto: 'Aberto',
  aberta: 'Aberta',
  solicitada: 'Solicitada',
  agendada: 'Agendada',
  em_execucao: 'Em execução',
  em_andamento: 'Em andamento',
  em_analise: 'Em análise',
  aguardando_morador: 'Aguardando morador',
  andamento: 'Em andamento',
  concluido: 'Concluído',
  concluida: 'Concluída',
  cancelado: 'Cancelado',
  cancelada: 'Cancelada',
  vencido: 'Vencido',
  vencida: 'Vencida',
  pago: 'Pago',
  paga: 'Paga',
  aprovado: 'Aprovado',
  aprovada: 'Aprovada',
  recusado: 'Recusado',
  recusada: 'Recusada',
  resolvida: 'Resolvida',
  arquivado: 'Arquivado',
  arquivada: 'Arquivada',
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  publicada: 'Publicada',
};

const statusVariants: Record<string, StatusVariant> = {
  ativo: 'success',
  ativa: 'success',
  pago: 'success',
  paga: 'success',
  aprovado: 'success',
  aprovada: 'success',
  concluido: 'success',
  concluida: 'success',
  resolvida: 'success',
  publicado: 'success',
  publicada: 'success',

  pendente: 'warning',
  aberto: 'warning',
  aberta: 'warning',
  solicitada: 'warning',
  vencido: 'warning',
  vencida: 'warning',
  rascunho: 'warning',
  aguardando_morador: 'warning',

  cancelado: 'danger',
  cancelada: 'danger',
  recusado: 'danger',
  recusada: 'danger',
  inativo: 'danger',
  inativa: 'danger',

  em_execucao: 'info',
  em_andamento: 'info',
  em_analise: 'info',
  andamento: 'info',
  agendada: 'info',

  arquivado: 'neutral',
  arquivada: 'neutral',
};

export function normalizeStatus(status: string | null | undefined) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

export function getStatusLabel(status: string | null | undefined) {
  const normalized = normalizeStatus(status);

  return statusLabels[normalized] ?? String(status ?? '-');
}

export function getStatusVariant(status: string | null | undefined): StatusVariant {
  const normalized = normalizeStatus(status);

  return statusVariants[normalized] ?? 'neutral';
}
