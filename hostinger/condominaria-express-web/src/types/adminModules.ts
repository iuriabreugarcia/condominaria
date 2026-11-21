export type Id = string | number;

export type ApiListResponse<T> = {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export type ApiMessageResponse = {
  message?: string;
  sucesso?: boolean;
  id?: Id;
};

export type StatusBase =
  | 'ativo'
  | 'ATIVO'
  | 'inativo'
  | 'INATIVO'
  | 'pendente'
  | 'PENDENTE'
  | 'aberto'
  | 'ABERTO'
  | 'aberta'
  | 'ABERTA'
  | 'em_andamento'
  | 'EM_ANDAMENTO'
  | 'em_execucao'
  | 'EM_EXECUCAO'
  | 'concluido'
  | 'CONCLUIDO'
  | 'concluida'
  | 'CONCLUIDA'
  | 'cancelado'
  | 'CANCELADO'
  | 'cancelada'
  | 'CANCELADA'
  | 'vencido'
  | 'VENCIDO'
  | 'pago'
  | 'PAGO'
  | 'aprovado'
  | 'APROVADO'
  | 'aprovada'
  | 'APROVADA'
  | 'recusado'
  | 'RECUSADO'
  | 'recusada'
  | 'RECUSADA'
  | 'arquivado'
  | 'ARQUIVADO'
  | 'arquivada'
  | 'ARQUIVADA'
  | 'rascunho'
  | 'RASCUNHO'
  | string;

export type AdminFilters = {
  q?: string;
  busca?: string;
  status?: string;
  prioridade?: string;
  categoria?: string;
  tipo?: string;
  modulo?: string;
  unidadeId?: Id | null;
  moradorId?: Id | null;
  prestadorId?: Id | null;
  page?: number;
  limit?: number;
  dataInicio?: string;
  dataFim?: string;
  ordem?: string;
  sort?: string;
};

export type ContratoStatus =
  | 'ativo'
  | 'ATIVO'
  | 'inativo'
  | 'INATIVO'
  | 'vencido'
  | 'VENCIDO'
  | 'cancelado'
  | 'CANCELADO'
  | 'rascunho'
  | 'RASCUNHO'
  | string;

export type Contrato = {
  id: Id;
  titulo: string;
  fornecedor?: string | null;
  prestadorId?: Id | null;
  categoria?: string | null;
  valor?: number | string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  vencimento?: string | null;
  status: ContratoStatus;
  observacoes?: string | null;
  arquivoUrl?: string | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
};

export type ContratoPayload = {
  titulo: string;
  fornecedor?: string;
  prestadorId?: Id | null;
  categoria?: string;
  valor?: number | string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  vencimento?: string | null;
  status?: ContratoStatus;
  observacoes?: string;
  arquivoUrl?: string;
};

export type ManutencaoStatus =
  | 'aberto'
  | 'ABERTA'
  | 'pendente'
  | 'PENDENTE'
  | 'agendada'
  | 'AGENDADA'
  | 'em_andamento'
  | 'EM_ANDAMENTO'
  | 'em_execucao'
  | 'EM_EXECUCAO'
  | 'concluido'
  | 'CONCLUIDO'
  | 'concluida'
  | 'CONCLUIDA'
  | 'cancelado'
  | 'CANCELADO'
  | 'cancelada'
  | 'CANCELADA'
  | string;

export type ManutencaoPrioridade =
  | 'baixa'
  | 'BAIXA'
  | 'media'
  | 'MEDIA'
  | 'alta'
  | 'ALTA'
  | 'urgente'
  | 'URGENTE'
  | string;

export type ManutencaoOrdem = {
  id: Id;
  titulo: string;
  descricao?: string | null;
  categoria?: string | null;
  local?: string | null;
  solicitante?: string | null;
  unidade?: string | null;
  prestadorId?: Id | null;
  prestadorNome?: string | null;
  prestador?: {
    id?: Id;
    nome?: string | null;
    empresa?: string | null;
    telefone?: string | null;
    email?: string | null;
  } | null;
  prioridade?: ManutencaoPrioridade | null;
  status: ManutencaoStatus;
  observacoes?: string | null;
  vencida?: boolean;
  valorEstimado?: number | string | null;
  valorFinal?: number | string | null;
  agendadaPara?: string | null;
  dataSolicitacao?: string | null;
  dataInicio?: string | null;
  dataConclusao?: string | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
};

export type ManutencaoResumo = {
  total?: number;
  abertas?: number;
  pendentes?: number;
  emAndamento?: number;
  emExecucao?: number;
  agendadas?: number;
  vencidas?: number;
  concluidas?: number;
  canceladas?: number;
  urgentes?: number;
  valorEstimadoTotal?: number | string | null;
  valorFinalTotal?: number | string | null;
};

export type ManutencaoPayload = {
  titulo: string;
  descricao?: string;
  categoria?: string;
  local?: string;
  solicitante?: string;
  unidade?: string;
  prestadorId?: Id | null;
  prioridade?: ManutencaoPrioridade;
  status?: ManutencaoStatus;
  observacoes?: string;
  valorEstimado?: number | string | null;
  valorFinal?: number | string | null;
  agendadaPara?: string | null;
  dataSolicitacao?: string | null;
  dataInicio?: string | null;
  dataConclusao?: string | null;
};

export type PrestadorStatus = 'ativo' | 'ATIVO' | 'inativo' | 'INATIVO' | string;

export type Prestador = {
  id: Id;
  nome: string;
  empresa?: string | null;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  categoria?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  status: PrestadorStatus;
  ativo?: boolean;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
};

export type PrestadorPayload = {
  nome: string;
  empresa?: string;
  documento?: string;
  telefone?: string;
  email?: string;
  categoria?: string;
  endereco?: string;
  observacoes?: string;
  status?: PrestadorStatus;
  ativo?: boolean;
};

export type DocumentoStatus =
  | 'ativo'
  | 'ATIVO'
  | 'publicado'
  | 'PUBLICADO'
  | 'arquivado'
  | 'ARQUIVADO'
  | 'rascunho'
  | 'RASCUNHO'
  | string;

export type Documento = {
  id: Id;
  titulo: string;
  categoria?: string | null;
  descricao?: string | null;
  arquivoUrl?: string | null;
  validade?: string | null;
  destaque?: boolean;
  status: DocumentoStatus;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
};

export type DocumentoPayload = {
  titulo: string;
  categoria?: string;
  descricao?: string;
  arquivoUrl?: string;
  validade?: string | null;
  destaque?: boolean;
  status?: DocumentoStatus;
};

export type RelatorioResumo = {
  totalMoradores?: number;
  totalUnidades?: number;
  totalCobrancasPendentes?: number;
  totalCobrancasPagas?: number;
  totalOcorrenciasAbertas?: number;
  totalReservas?: number;
  totalContratosAtivos?: number;
  totalManutencoesAbertas?: number;
  receitaMes?: number | string;
  despesaMes?: number | string;
  saldoMes?: number | string;
};

export type RelatorioLinha = {
  id?: Id;
  titulo: string;
  categoria?: string;
  status?: string;
  valor?: number | string | null;
  data?: string | null;
  descricao?: string | null;
};
