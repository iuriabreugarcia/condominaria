export type LoginResponse = {
  access_token: string;
  token_type: "Bearer";
  usuario: {
    id: number;
    nome: string;
    email: string;
    telefone: string | null;
    superAdmin: boolean;
    condominios: Array<{
      vinculoId: number;
      papel: string;
      principal: boolean;
      condominio: {
        id: number;
        nome: string;
        slug: string;
        ativo: boolean;
      };
    }>;
  };
};

export type AuthMeCondominio = {
  id: number;
  papel: string;
  principal: boolean;
  condominio: {
    id: number;
    nome: string;
    slug: string;
    ativo: boolean;
  };
};

export type AuthMeResponse = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  superAdmin: boolean;
  ativo: boolean;
  ultimoLoginEm: string | null;
  condominios: AuthMeCondominio[];
};

export type PortalMoradorMeResponse = {
  usuario: {
    id: number;
    email: string;
    superAdmin: boolean;
  };
  moradores: Array<{
    id: number;
    condominioId: number;
    usuarioId: number;
    nome: string;
    email: string | null;
    telefone: string | null;
    ativo: boolean;
    condominio: {
      id: number;
      nome: string;
      slug: string;
      ativo: boolean;
    };
    unidades: Array<{
      id: number;
      moradorId: number;
      unidadeId: number;
      papel: string;
      principal: boolean;
      ativo: boolean;
      unidade: UnidadePortal;
    }>;
  }>;
};

export type UnidadePortal = {
  id: number;
  identificador: string;
  numero: string;
  tipo: string;
  andar: number | null;
  ativo: boolean;
};

export type UnidadeDisponivelPortal = {
  vinculoId: number;
  papel: string;
  principal: boolean;
  unidade: UnidadePortal;
};

export type DashboardMoradorResponse = {
  morador: {
    id: number;
    nome: string;
    email: string | null;
    telefone: string | null;
  };
  condominio: {
    id: number;
    nome: string;
    slug: string;
    ativo: boolean;
  };
  unidades: UnidadePortal[];
  indicadores: {
    comunicadosPublicados: number;
    cobrancasPendentes: number;
    encomendasPendentes: number;
    reservasAtivas: number;
    assembleiasAtivas: number;
    votacoesAbertas: number;
    ocorrenciasAbertas: number;
  };
};

export type PrioridadeNotificacaoPortal = "ALTA" | "MEDIA" | "NORMAL";

export type TipoNotificacaoPortal =
  | "COBRANCAS"
  | "COMUNICADOS"
  | "RESERVAS"
  | "OCORRENCIAS"
  | "ENCOMENDAS"
  | "VOTACOES"
  | "ASSEMBLEIAS";

export type NotificacaoPortalApiItem = {
  id: string;
  tipo: TipoNotificacaoPortal;
  label: string;
  descricao: string;
  valor: number;
  to: string;
  prioridade: PrioridadeNotificacaoPortal;
  lida: boolean;
  criadoEm: string | null;
  atualizadoEm: string | null;
};

export type NotificacoesPortalResponse = {
  itens: NotificacaoPortalApiItem[];
  totalNaoLidas: number;
};

export type PreferenciasNotificacoesPortal = Record<TipoNotificacaoPortal, boolean>;

export type NotificacoesPreferenciasPortalResponse = {
  preferencias: PreferenciasNotificacoesPortal;
};

export type AtualizarNotificacoesPreferenciasPortalRequest = {
  preferencias: Partial<PreferenciasNotificacoesPortal>;
};


export type PrioridadeOcorrencia = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

export type StatusOcorrencia =
  | "ABERTA"
  | "EM_ANALISE"
  | "EM_ANDAMENTO"
  | "AGUARDANDO_MORADOR"
  | "RESOLVIDA"
  | "CANCELADA";

export type OcorrenciaPortal = {
  id: number;
  condominioId: number;
  unidadeId: number | null;
  moradorId: number | null;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string;
  categoria: string | null;
  prioridade: PrioridadeOcorrencia;
  status: StatusOcorrencia;
  encerradaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  } | null;
};

export type HistoricoStatusOcorrenciaPortal = {
  id: number;
  ocorrenciaId: number;
  usuarioId: number | null;
  statusAnterior: StatusOcorrencia | null;
  statusNovo: StatusOcorrencia;
  observacao: string | null;
  criadoEm: string;
  usuario: {
    id: number;
    nome: string;
  } | null;
};

export type OcorrenciaPortalDetalhe = OcorrenciaPortal & {
  historicoStatus: HistoricoStatusOcorrenciaPortal[];
};

export type CriarOcorrenciaPortalPayload = {
  unidadeId: number;
  titulo: string;
  descricao: string;
  categoria?: string;
  prioridade: PrioridadeOcorrencia;
};

export type AreaComumReservavelPortal = {
  id: number;
  condominioId: number;
  nome: string;
  descricao: string | null;
  capacidade: number | null;
  exigeAprovacao: boolean;
  permiteReserva: boolean;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type StatusReservaAreaComum =
  | "SOLICITADA"
  | "APROVADA"
  | "RECUSADA"
  | "CANCELADA"
  | "CONCLUIDA";

export type ReservaPortal = {
  id: number;
  condominioId: number;
  areaComumId: number;
  unidadeId: number | null;
  moradorId: number | null;
  criadoPorUsuarioId: number | null;
  aprovadoPorUsuarioId: number | null;
  titulo: string | null;
  inicioEm: string;
  fimEm: string;
  status: StatusReservaAreaComum;
  observacoes: string | null;
  motivoRecusa: string | null;
  aprovadoEm: string | null;
  recusadoEm: string | null;
  canceladoEm: string | null;
  concluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  areaComum: {
    id: number;
    nome: string;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  } | null;
};

export type CriarReservaPortalPayload = {
  areaComumId: number;
  unidadeId: number;
  titulo?: string;
  inicioEm: string;
  fimEm: string;
  observacoes?: string;
};

export type VisitanteRecentePortal = {
  id: number;
  nome: string;
  tipoDocumento: string | null;
  documento: string | null;
  telefone: string | null;
  ativo: boolean;
};

export type AutorizacaoVisitantePortal = {
  id: number;
  condominioId: number;
  visitanteId: number;
  unidadeId: number;
  moradorId: number | null;
  criadoPorUsuarioId: number | null;
  status: string;
  inicioEm: string;
  fimEm: string;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  visitante: {
    id: number;
    nome: string;
    tipoDocumento: string | null;
    documento: string | null;
    telefone: string | null;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  morador?: {
    id: number;
    nome: string;
    email: string | null;
    telefone: string | null;
  } | null;
};

export type CriarAutorizacaoVisitantePortalPayload = {
  unidadeId: number;
  visitanteId?: number;
  nome?: string;
  documento?: string;
  telefone?: string;
  inicioEm: string;
  fimEm: string;
  observacoes?: string;
};

export type StatusComunicadoPortal = "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";

export type ComunicadoPortal = {
  id: number;
  condominioId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  conteudo: string;
  destaque: boolean;
  status: StatusComunicadoPortal;
  publicadoEm: string | null;
  expiraEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  lida: boolean;
  lidoEm: string | null;
};

export type StatusCobrancaPortal = "PENDENTE" | "PAGO" | "CANCELADA";
export type StatusComprovantePagamento = "ENVIADO" | "APROVADO" | "RECUSADO";

export type PortalConfiguracoesPagamentoCondominio = {
  id: number;
  nome: string;
  pixChave: string | null;
  pixTipo: TipoPixCondominio | string | null;
  beneficiarioPagamento: string | null;
  bancoPagamento: string | null;
  instrucoesPagamento: string | null;
  mensagemCobrancaPadrao: string | null;
};

export type CobrancaPortal = {
  id: number;
  condominioId: number;
  unidadeId: number;
  moradorId: number | null;
  categoriaId: number | null;
  descricao: string;
  valor: string | number;
  status: StatusCobrancaPortal;
  competenciaEm: string;
  vencimentoEm: string;
  pagoEm: string | null;
  canceladoEm: string | null;
  observacoes: string | null;
  comprovanteStatus: StatusComprovantePagamento | null;
  comprovanteArquivoNome: string | null;
  comprovanteArquivoTipo: string | null;
  comprovanteObservacao: string | null;
  comprovanteEnviadoEm: string | null;
  comprovanteAnalisadoEm: string | null;
  comprovanteAnalisadoPorUsuarioId: number | null;
  comprovanteMotivoRecusa: string | null;
  criadoEm: string;
  atualizadoEm: string;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  lancamentoFinanceiro: {
    id: number;
    status: string;
    tipo: string;
    valor: string | number;
  } | null;
};

export type EncomendaPortal = {
  id: number;
  condominioId: number;
  unidadeId: number;
  moradorId?: number | null;
  recebidoPorUsuarioId?: number | null;
  retiradoPorUsuarioId?: number | null;
  devolvidoPorUsuarioId?: number | null;
  nomeDestinatario?: string | null;
  destinatarioNome?: string | null;
  remetente?: string | null;
  transportadora?: string | null;
  codigoRastreio?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  observacoesRetirada?: string | null;
  motivoDevolucao?: string | null;
  retiradoPorNome?: string | null;
  status: string;
  tipo?: string;
  recebidoEm: string;
  retiradoEm?: string | null;
  devolvidoEm?: string | null;
  criadoEm: string;
  atualizadoEm: string;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  morador?: {
    id: number;
    nome: string;
    telefone: string | null;
    email?: string | null;
  } | null;
};

export type OpcaoVotacaoPortal = {
  id: number;
  descricao: string;
  ordem: number;
};

export type VotoRegistradoPortal = {
  id: number;
  opcaoId: number;
  unidadeId: number;
  registradoEm: string;
};

export type VotacaoAbertaPortal = {
  id: number;
  condominioId: number;
  assembleiaId: number;
  pautaId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string | null;
  status: string;
  abertaEm: string | null;
  encerradaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  criadoEm: string;
  atualizadoEm: string;
  assembleia: {
    id: number;
    titulo: string;
    status: string;
  };
  pauta: {
    id: number;
    titulo: string;
    descricao: string | null;
    status: string;
  };
  opcoes: OpcaoVotacaoPortal[];
  votos: VotoRegistradoPortal[];
};

export type RegistrarVotoPortalPayload = {
  opcaoId: number;
  unidadeId: number;
  observacoes?: string;
};

export type VotoCriadoPortal = {
  id: number;
  votacaoId: number;
  opcaoId: number;
  unidadeId: number;
  moradorId: number | null;
  registradoPorUsuarioId: number | null;
  observacoes: string | null;
  registradoEm: string;
  criadoEm: string;
  atualizadoEm: string;
  opcao: {
    id: number;
    descricao: string;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  morador: {
    id: number;
    nome: string;
  } | null;
  criadoPorUsuario?: {
    id: number;
    nome: string;
    email: string;
  } | null;
  registrosAcesso?: Array<{
    id: number;
    entradaEm: string;
    saidaEm: string | null;
    observacoesEntrada: string | null;
    observacoesSaida: string | null;
  }>;
};

export type AdminBloco = {
  id: number;
  condominioId: number;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type CriarBlocoAdminPayload = {
  nome: string;
  descricao?: string;
  ordem?: number;
};

export type TipoUnidadeAdmin =
  | "APARTAMENTO"
  | "CASA"
  | "SALA"
  | "LOJA"
  | "OUTRA";

export type AdminUnidade = {
  id: number;
  condominioId: number;
  blocoId: number | null;
  numero: string;
  identificador: string;
  tipo: TipoUnidadeAdmin;
  andar: number | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  bloco: {
    id: number;
    nome: string;
  } | null;
};

export type CriarUnidadeAdminPayload = {
  numero: string;
  blocoId?: number;
  tipo?: TipoUnidadeAdmin;
  andar?: number;
  observacoes?: string;
};

export type PapelMoradorUnidadeAdmin = "PROPRIETARIO" | "INQUILINO" | "MORADOR";

export type AdminMoradorUnidade = {
  id: number;
  papel: PapelMoradorUnidadeAdmin;
  principal: boolean;
  unidade: {
    id: number;
    numero: string;
    identificador: string;
    tipo: TipoUnidadeAdmin;
    bloco: {
      id: number;
      nome: string;
    } | null;
  };
};

export type AdminMoradorUsuario = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  ultimoLoginEm: string | null;
};

export type AdminMorador = {
  id: number;
  condominioId: number;
  usuarioId: number | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  usuario: AdminMoradorUsuario | null;
  unidades: AdminMoradorUnidade[];
};

export type CriarMoradorAdminPayload = {
  nome: string;
  email?: string;
  telefone?: string;
};

export type VincularMoradorUnidadeAdminPayload = {
  unidadeId: number;
  papel: PapelMoradorUnidadeAdmin;
  principal?: boolean;
};

export type CriarAcessoPortalMoradorAdminPayload = {
  email: string;
  telefone?: string;
  senha: string;
};

export type VincularUsuarioMoradorAdminPayload = {
  email: string;
};

export type PrioridadeComunicadoAdmin = "BAIXA" | "NORMAL" | "ALTA" | "URGENTE";

export type StatusComunicadoAdmin = "RASCUNHO" | "PUBLICADO" | "ARQUIVADO";

export type AdminComunicado = {
  id: number;
  condominioId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  conteudo: string;
  categoria: string | null;
  prioridade: PrioridadeComunicadoAdmin;
  destaque: boolean;
  status: StatusComunicadoAdmin;
  publicadoEm: string | null;
  expiraEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  leituraResumo?: {
    totalMoradores: number;
    totalLidas: number;
    totalPendentes: number;
  };
};


export type AdminComunicadoLeiturasResponse = {
  comunicado: {
    id: number;
    titulo: string;
    status: StatusComunicadoAdmin;
  };
  resumo: {
    totalMoradores: number;
    totalLidas: number;
    totalPendentes: number;
  };
  itens: Array<{
    moradorId: number;
    nome: string;
    email: string | null;
    telefone: string | null;
    unidades: Array<{
      id: number;
      identificador: string;
      numero: string;
    }>;
    lida: boolean;
    lidoEm: string | null;
  }>;
};

export type CriarComunicadoAdminPayload = {
  titulo: string;
  conteudo: string;
  categoria?: string;
  prioridade?: PrioridadeComunicadoAdmin;
  destaque?: boolean;
  expiraEm?: string;
};

export type PrioridadeOcorrenciaAdmin = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

export type StatusOcorrenciaAdmin =
  | "ABERTA"
  | "EM_ANALISE"
  | "EM_ANDAMENTO"
  | "AGUARDANDO_MORADOR"
  | "RESOLVIDA"
  | "CANCELADA";

export type AdminOcorrencia = {
  id: number;
  condominioId: number;
  unidadeId: number | null;
  moradorId: number | null;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string;
  categoria: string | null;
  prioridade: PrioridadeOcorrenciaAdmin;
  status: StatusOcorrenciaAdmin;
  encerradaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  } | null;
  morador: {
    id: number;
    nome: string;
    email: string | null;
    telefone: string | null;
  } | null;
  criadoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
};

export type AtualizarStatusOcorrenciaAdminPayload = {
  status: StatusOcorrenciaAdmin;
  observacao?: string;
};

export type AdminAreaComum = {
  id: number;
  condominioId: number;
  nome: string;
  descricao: string | null;
  capacidade: number | null;
  exigeAprovacao: boolean;
  permiteReserva: boolean;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type CriarAreaComumAdminPayload = {
  nome: string;
  descricao?: string;
  capacidade?: number;
  exigeAprovacao?: boolean;
  permiteReserva?: boolean;
  observacoes?: string;
};

export type StatusReservaAdmin =
  | "SOLICITADA"
  | "APROVADA"
  | "RECUSADA"
  | "CANCELADA"
  | "CONCLUIDA";

export type AdminReservaAreaComum = {
  id: number;
  condominioId: number;
  areaComumId: number;
  unidadeId: number | null;
  moradorId: number | null;
  criadoPorUsuarioId: number | null;
  aprovadoPorUsuarioId: number | null;
  titulo: string | null;
  inicioEm: string;
  fimEm: string;
  status: StatusReservaAdmin;
  observacoes: string | null;
  motivoRecusa: string | null;
  aprovadoEm: string | null;
  recusadoEm: string | null;
  canceladoEm: string | null;
  concluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  areaComum: {
    id: number;
    nome: string;
  };
  unidade: {
    id: number;
    identificador: string;
  } | null;
  morador: {
    id: number;
    nome: string;
  } | null;
};

export type CriarReservaAdminPayload = {
  areaComumId: number;
  unidadeId?: number;
  moradorId?: number;
  titulo?: string;
  inicioEm: string;
  fimEm: string;
  observacoes?: string;
};

export type RecusarReservaAdminPayload = {
  motivoRecusa: string;
};

export type AdminVisitante = {
  id: number;
  condominioId: number;
  nome: string;
  tipoDocumento: string | null;
  documento: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type CriarVisitanteAdminPayload = {
  nome: string;
  documento?: string;
  telefone?: string;
  observacoes?: string;
};

export type AdminAutorizacaoVisitante = {
  id: number;
  condominioId: number;
  visitanteId: number;
  unidadeId: number;
  moradorId: number | null;
  inicioEm: string;
  fimEm: string;
  status: string;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  visitante: {
    id: number;
    nome: string;
    documento: string | null;
    telefone: string | null;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  morador: {
    id: number;
    nome: string;
  } | null;
};

export type CriarAutorizacaoVisitanteAdminPayload = {
  visitanteId: number;
  unidadeId: number;
  moradorId?: number;
  inicioEm: string;
  fimEm: string;
  observacoes?: string;
};

export type AdminAcessoVisitante = {
  id: number;
  condominioId: number;
  autorizacaoVisitanteId: number;
  visitanteId: number;
  unidadeId: number;
  entradaEm: string;
  saidaEm: string | null;
  observacoesEntrada: string | null;
  observacoesSaida: string | null;
  visitante: {
    id: number;
    nome: string;
    documento: string | null;
    telefone: string | null;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
};

export type RegistrarEntradaAdminPayload = {
  observacoesEntrada?: string;
};

export type RegistrarSaidaAdminPayload = {
  observacoesSaida?: string;
};

export type AdminPrestador = {
  id: number;
  condominioId: number;
  nome: string;
  empresa: string | null;
  tipoServico: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type CriarPrestadorAdminPayload = {
  nome: string;
  empresa?: string;
  tipoServico?: string;
  tipoDocumento?: string;
  documento?: string;
  telefone?: string;
  observacoes?: string;
};

export type AtualizarPrestadorAdminPayload = Partial<CriarPrestadorAdminPayload>;

export type AlterarStatusPrestadorAdminPayload = {
  ativo: boolean;
};

export type AdminAutorizacaoPrestador = {
  id: number;
  condominioId: number;
  prestadorId: number;
  unidadeId: number | null;
  moradorId: number | null;
  inicioEm: string;
  fimEm: string;
  status: string;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  prestador: {
    id: number;
    nome: string;
    empresa: string | null;
    tipoServico: string | null;
    documento: string | null;
    telefone: string | null;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  } | null;
  morador: {
    id: number;
    nome: string;
  } | null;
};

export type CriarAutorizacaoPrestadorAdminPayload = {
  prestadorId: number;
  unidadeId?: number;
  moradorId?: number;
  inicioEm: string;
  fimEm: string;
  observacoes?: string;
};

export type AdminAcessoPrestador = {
  id: number;
  condominioId: number;
  autorizacaoPrestadorId: number;
  prestadorId: number;
  unidadeId: number | null;
  entradaEm: string;
  saidaEm: string | null;
  observacoesEntrada: string | null;
  observacoesSaida: string | null;
  prestador: {
    id: number;
    nome: string;
    empresa: string | null;
    tipoServico: string | null;
    documento: string | null;
    telefone: string | null;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  } | null;
};

export type AdminEncomendaPortaria = {
  id: number;
  condominioId: number;
  unidadeId: number;
  moradorId: number | null;
  recebidoPorUsuarioId?: number | null;
  retiradoPorUsuarioId?: number | null;
  devolvidoPorUsuarioId?: number | null;
  tipo: string;
  descricao: string;
  remetente: string | null;
  codigoRastreio: string | null;
  destinatarioNome: string | null;
  observacoes: string | null;
  observacoesRetirada: string | null;
  status: string;
  recebidoEm: string;
  retiradoEm: string | null;
  devolvidoEm: string | null;
  retiradoPorNome: string | null;
  motivoDevolucao: string | null;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  morador: {
    id: number;
    nome: string;
    telefone: string | null;
    email?: string | null;
  } | null;
  recebidoPorUsuario?: {
    id: number;
    nome: string;
    email: string;
  } | null;
  retiradoPorUsuario?: {
    id: number;
    nome: string;
    email: string;
  } | null;
  devolvidoPorUsuario?: {
    id: number;
    nome: string;
    email: string;
  } | null;
};

export type CriarEncomendaAdminPayload = {
  unidadeId: number;
  moradorId?: number;
  descricao: string;
  remetente?: string;
  codigoRastreio?: string;
  destinatarioNome?: string;
  observacoes?: string;
};

export type RetirarEncomendaAdminPayload = {
  retiradoPorNome: string;
  observacoesRetirada?: string;
};

export type DevolverEncomendaAdminPayload = {
  motivoDevolucao: string;
};

export type TipoCategoriaFinanceiraAdmin = "RECEITA" | "DESPESA" | "AMBOS";

export type TipoLancamentoFinanceiroAdmin = "RECEITA" | "DESPESA";

export type StatusFinanceiroAdmin = "PENDENTE" | "PAGO" | "CANCELADO";

export type StatusCobrancaAdmin = "PENDENTE" | "PAGO" | "CANCELADA";

export type AdminCategoriaFinanceira = {
  id: number;
  condominioId: number;
  nome: string;
  tipo: TipoCategoriaFinanceiraAdmin;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type CriarCategoriaFinanceiraAdminPayload = {
  nome: string;
  tipo: TipoCategoriaFinanceiraAdmin;
  descricao?: string;
};

export type AdminLancamentoFinanceiro = {
  id: number;
  condominioId: number;
  categoriaId: number | null;
  criadoPorUsuarioId: number | null;
  pagoPorUsuarioId: number | null;
  canceladoPorUsuarioId: number | null;
  tipo: TipoLancamentoFinanceiroAdmin;
  status: StatusFinanceiroAdmin;
  descricao: string;
  valor: string | number;
  competenciaEm: string;
  vencimentoEm: string | null;
  pagoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  categoria: {
    id: number;
    nome: string;
    tipo: TipoCategoriaFinanceiraAdmin;
  } | null;
  criadoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  pagoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  canceladoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
};

export type CriarLancamentoFinanceiroAdminPayload = {
  categoriaId?: number;
  tipo: TipoLancamentoFinanceiroAdmin;
  descricao: string;
  valor: string;
  competenciaEm: string;
  vencimentoEm?: string;
  observacoes?: string;
};

export type PagarFinanceiroAdminPayload = {
  pagoEm?: string;
};

export type CancelarFinanceiroAdminPayload = {
  motivoCancelamento: string;
};

export type TipoPixCondominio = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA" | "OUTRA";

export type AdminConfiguracoesPagamentoCondominio = {
  id: number;
  nome: string;
  pixChave: string | null;
  pixTipo: TipoPixCondominio | string | null;
  beneficiarioPagamento: string | null;
  bancoPagamento: string | null;
  instrucoesPagamento: string | null;
  mensagemCobrancaPadrao: string | null;
};

export type AtualizarConfiguracoesPagamentoCondominioPayload = {
  pixChave?: string;
  pixTipo?: TipoPixCondominio | string;
  beneficiarioPagamento?: string;
  bancoPagamento?: string;
  instrucoesPagamento?: string;
  mensagemCobrancaPadrao?: string;
};

export type AdminCobrancaCondominial = {
  id: number;
  condominioId: number;
  unidadeId: number;
  moradorId: number | null;
  lancamentoFinanceiroId: number | null;
  criadoPorUsuarioId: number | null;
  pagoPorUsuarioId: number | null;
  canceladoPorUsuarioId: number | null;
  descricao: string;
  valor: string | number;
  competenciaEm: string;
  vencimentoEm: string;
  status: StatusCobrancaAdmin;
  pagoEm: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  observacoes: string | null;
  comprovanteStatus: StatusComprovantePagamento | null;
  comprovanteArquivoNome: string | null;
  comprovanteArquivoTipo: string | null;
  comprovanteObservacao: string | null;
  comprovanteEnviadoEm: string | null;
  comprovanteAnalisadoEm: string | null;
  comprovanteAnalisadoPorUsuarioId: number | null;
  comprovanteMotivoRecusa: string | null;
  criadoEm: string;
  atualizadoEm: string;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  morador: {
    id: number;
    nome: string;
    email: string | null;
    telefone: string | null;
  } | null;
  lancamentoFinanceiro: {
    id: number;
    tipo: TipoLancamentoFinanceiroAdmin;
    status: StatusFinanceiroAdmin;
    valor: string | number;
    categoriaId: number | null;
    categoria: {
      id: number;
      nome: string;
      tipo: TipoCategoriaFinanceiraAdmin;
    } | null;
  } | null;
  criadoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  pagoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  canceladoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
};

export type AdminHistoricoFinanceiro = {
  id: number;
  condominioId: number;
  usuarioId: number | null;
  lancamentoFinanceiroId: number | null;
  cobrancaCondominialId: number | null;
  acao: string;
  entidade: string;
  descricao: string;
  detalhes: string | null;
  criadoEm: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  lancamentoFinanceiro: {
    id: number;
    descricao: string;
    status: StatusFinanceiroAdmin;
    valor: string | number;
  } | null;
  cobrancaCondominial: {
    id: number;
    descricao: string;
    status: StatusCobrancaAdmin;
    valor: string | number;
    unidade: {
      id: number;
      identificador: string;
      numero: string;
    };
  } | null;
};

export type CriarCobrancaAdminPayload = {
  unidadeId: number;
  moradorId?: number;
  categoriaId?: number;
  descricao: string;
  valor: string;
  competenciaEm: string;
  vencimentoEm: string;
  observacoes?: string;
};

export type CriarCobrancasLoteAdminPayload = {
  categoriaId?: number;
  descricao: string;
  valor: string;
  competenciaEm: string;
  vencimentoEm: string;
  observacoes?: string;
};

export type ResultadoCriacaoCobrancasLoteAdmin = {
  totalUnidadesAtivas: number;
  criadas: number;
  ignoradasDuplicidade: number;
};

export type ResumoFinanceiroGrupoAdmin = {
  tipo: TipoLancamentoFinanceiroAdmin;
  status: StatusFinanceiroAdmin;
  _sum: {
    valor: string | number | null;
  };
  _count: {
    _all: number;
  };
};

export type ResumoFinanceiroCategoriaAdmin = {
  categoriaId: number | null;
  nome: string;
  tipo: TipoLancamentoFinanceiroAdmin;
  valorPrevisto: number;
  valorPago: number;
  quantidade: number;
};

export type AdminResumoFinanceiro = {
  periodo: {
    inicio: string;
    fim: string;
  };
  grupos: ResumoFinanceiroGrupoAdmin[];
  categorias: ResumoFinanceiroCategoriaAdmin[];
};

export type ResumoCobrancaGrupoAdmin = {
  status: StatusCobrancaAdmin;
  _sum: {
    valor: string | number | null;
  };
  _count: {
    _all: number;
  };
};

export type AdminResumoCobrancas = {
  periodo: {
    inicio: string;
    fim: string;
  };
  grupos: ResumoCobrancaGrupoAdmin[];
  vencidasPendentes: {
    _sum: {
      valor: string | number | null;
    };
    _count: {
      _all: number;
    };
  };
};

export type ModalidadeAssembleiaAdmin = "PRESENCIAL" | "ONLINE" | "HIBRIDA";

export type StatusAssembleiaAdmin =
  | "RASCUNHO"
  | "CONVOCADA"
  | "EM_ANDAMENTO"
  | "ENCERRADA"
  | "CANCELADA";

export type StatusPautaAssembleiaAdmin = "ABERTA" | "DELIBERADA" | "CANCELADA";

export type StatusVotacaoAssembleiaAdmin =
  | "RASCUNHO"
  | "ABERTA"
  | "ENCERRADA"
  | "CANCELADA";

export type AdminAssembleiaLista = {
  id: number;
  condominioId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string | null;
  modalidade: ModalidadeAssembleiaAdmin;
  status: StatusAssembleiaAdmin;
  local: string | null;
  linkOnline: string | null;
  primeiraChamadaEm: string;
  segundaChamadaEm: string | null;
  convocadaEm: string | null;
  iniciadaEm: string | null;
  encerradaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  criadoEm: string;
  atualizadoEm: string;
  _count: {
    pautas: number;
  };
};

export type AdminOpcaoVotacaoAssembleia = {
  id: number;
  votacaoId: number;
  descricao: string;
  ordem: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type AdminResumoVotacoesAssembleia = {
  abertas: number;
  encerradas: number;
  rascunho: number;
  canceladas: number;
  totalVotacoes: number;
  totalVotos: number;
  assembleiasComVotacaoAberta: number;
  votacoesAbertasPorAssembleia: Array<{
    assembleiaId: number;
    abertas: number;
  }>;
};

export type AdminVotacaoPautaResumo = {
  id: number;
  condominioId: number;
  assembleiaId: number;
  pautaId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string | null;
  status: StatusVotacaoAssembleiaAdmin;
  abertaEm: string | null;
  encerradaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  criadoEm: string;
  atualizadoEm: string;
  opcoes: AdminOpcaoVotacaoAssembleia[];
  _count: {
    votos: number;
  };
};

export type AdminPautaAssembleia = {
  id: number;
  assembleiaId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string | null;
  ordem: number;
  status: StatusPautaAssembleiaAdmin;
  deliberacao: string | null;
  deliberadaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  votacao: AdminVotacaoPautaResumo | null;
};

export type AdminAssembleiaDetalhe = {
  id: number;
  condominioId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string | null;
  modalidade: ModalidadeAssembleiaAdmin;
  status: StatusAssembleiaAdmin;
  local: string | null;
  linkOnline: string | null;
  primeiraChamadaEm: string;
  segundaChamadaEm: string | null;
  convocadaEm: string | null;
  iniciadaEm: string | null;
  encerradaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
  pautas: AdminPautaAssembleia[];
};

export type CriarAssembleiaAdminPayload = {
  titulo: string;
  descricao?: string;
  modalidade: ModalidadeAssembleiaAdmin;
  local?: string;
  linkOnline?: string;
  primeiraChamadaEm: string;
  segundaChamadaEm?: string;
};

export type CancelarAssembleiaAdminPayload = {
  motivoCancelamento: string;
};

export type CriarPautaAssembleiaAdminPayload = {
  titulo: string;
  descricao?: string;
  ordem?: number;
};

export type DeliberarPautaAssembleiaAdminPayload = {
  deliberacao: string;
};

export type CriarVotacaoAssembleiaAdminPayload = {
  titulo: string;
  descricao?: string;
};

export type CriarOpcaoVotacaoAssembleiaAdminPayload = {
  descricao: string;
  ordem?: number;
};

export type RegistrarVotoAssembleiaAdminPayload = {
  opcaoId: number;
  unidadeId: number;
  moradorId?: number;
  observacoes?: string;
};

export type AdminVotoAssembleia = {
  id: number;
  votacaoId: number;
  opcaoId: number;
  unidadeId: number;
  moradorId: number | null;
  registradoPorUsuarioId: number | null;
  observacoes: string | null;
  registradoEm: string;
  criadoEm: string;
  atualizadoEm: string;
  opcao: {
    id: number;
    descricao: string;
  };
  unidade: {
    id: number;
    identificador: string;
    numero: string;
  };
  morador: {
    id: number;
    nome: string;
  } | null;
};

export type AdminVotacaoAssembleiaDetalhe = {
  id: number;
  condominioId: number;
  assembleiaId: number;
  pautaId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string | null;
  status: StatusVotacaoAssembleiaAdmin;
  abertaEm: string | null;
  encerradaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  criadoEm: string;
  atualizadoEm: string;
  pauta: {
    id: number;
    titulo: string;
    status: StatusPautaAssembleiaAdmin;
  };
  opcoes: AdminOpcaoVotacaoAssembleia[];
  votos: AdminVotoAssembleia[];
};

export type AdminResultadoVotacaoOpcao = {
  id: number;
  descricao: string;
  ordem: number;
  votos: number;
  percentual: number;
};

export type AdminResultadoVotacaoAssembleia = {
  votacaoId: number;
  totalVotos: number;
  opcoes: AdminResultadoVotacaoOpcao[];
};

export type AdminAuditoriaParticipacaoVotacaoResumo = {
  totalUnidadesAptas: number;
  totalParticipantes: number;
  totalAusentes: number;
  percentualParticipacao: number;
};

export type AdminAuditoriaParticipacaoVotacaoUnidade = {
  id: number;
  identificador: string;
  numero: string;
  bloco: {
    id: number;
    nome: string;
  } | null;
};

export type AdminAuditoriaParticipacaoVotacaoParticipante = {
  id: number;
  unidadeId: number;
  registradoEm: string;
  porProcuracao: boolean;
  unidade: AdminAuditoriaParticipacaoVotacaoUnidade;
  morador: {
    id: number;
    nome: string;
  } | null;
};

export type AdminAuditoriaParticipacaoVotacao = {
  votacaoId: number;
  resumo: AdminAuditoriaParticipacaoVotacaoResumo;
  participantes: AdminAuditoriaParticipacaoVotacaoParticipante[];
  ausentes: AdminAuditoriaParticipacaoVotacaoUnidade[];
};

export type AdminResumoQuorumAssembleia = {
  assembleiaId: number;
  totalUnidades: number;
  unidadesPresentes: number;
  unidadesAusentes: number;
  percentualPresenca: number;
};

export type CriarPresencaAssembleiaAdminPayload = {
  unidadeId: number;
  moradorId?: number;
  nomeRepresentante?: string;
  documentoRepresentante?: string;
  porProcuracao?: boolean;
  procuracaoObservacoes?: string;
  observacoes?: string;
};

export type AdminPresencaAssembleia = {
  id: number;
  condominioId: number;
  assembleiaId: number;
  unidadeId: number;
  moradorId: number | null;
  registradoPorUsuarioId: number | null;
  nomeRepresentante: string | null;
  documentoRepresentante: string | null;
  porProcuracao: boolean;
  procuracaoObservacoes: string | null;
  observacoes: string | null;
  registradoEm: string;
  criadoEm: string;
  atualizadoEm: string;
  unidade: {
    id: number;
    numero: string;
    identificador: string;
    bloco: {
      id: number;
      nome: string;
    } | null;
  };
  morador: {
    id: number;
    nome: string;
    email: string | null;
    telefone: string | null;
  } | null;
  registradoPorUsuario: {
    id: number;
    nome: string;
    email: string;
  } | null;
};

export type ModalidadeAssembleiaPortal = "PRESENCIAL" | "ONLINE" | "HIBRIDA";

export type StatusAssembleiaPortal = "CONVOCADA" | "EM_ANDAMENTO" | "ENCERRADA";

export type StatusPautaAssembleiaPortal = "ABERTA" | "DELIBERADA" | "CANCELADA";

export type StatusVotacaoPautaPortal =
  | "RASCUNHO"
  | "ABERTA"
  | "ENCERRADA"
  | "CANCELADA";

export type VotacaoPautaAssembleiaPortal = {
  id: number;
  titulo: string;
  status: StatusVotacaoPautaPortal;
  abertaEm: string | null;
  encerradaEm: string | null;
};

export type PautaAssembleiaPortal = {
  id: number;
  titulo: string;
  descricao: string | null;
  ordem: number;
  status: StatusPautaAssembleiaPortal;
  deliberacao: string | null;
  deliberadaEm: string | null;
  votacao: VotacaoPautaAssembleiaPortal | null;
};

export type AssembleiaPortal = {
  id: number;
  condominioId: number;
  titulo: string;
  descricao: string | null;
  modalidade: ModalidadeAssembleiaPortal;
  status: StatusAssembleiaPortal;
  local: string | null;
  linkOnline: string | null;
  primeiraChamadaEm: string;
  segundaChamadaEm: string | null;
  convocadaEm: string | null;
  iniciadaEm: string | null;
  encerradaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  pautas: PautaAssembleiaPortal[];
};

export type ResultadoOpcaoVotacaoPortal = {
  id: number;
  descricao: string;
  ordem: number;
  votos: number;
  percentual: number;
};

export type ResultadoVotacaoPortal = {
  votacaoId: number;
  totalVotos: number;
  opcoes: ResultadoOpcaoVotacaoPortal[];
};

export type QuorumAtaResumoAssembleiaPortal = {
  totalUnidades: number;
  unidadesPresentes: number;
  unidadesAusentes: number;
  percentualPresenca: number;
};

export type PresencaAtaResumoAssembleiaPortal = {
  id: number;
  porProcuracao: boolean;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
    bloco: {
      id: number;
      nome: string;
    } | null;
  };
};

export type ResultadoAtaResumoAssembleiaPortal = {
  pautaId: number;
  pautaTitulo: string;
  votacaoId: number;
  votacaoTitulo: string;
  totalVotos: number;
  opcoes: ResultadoOpcaoVotacaoPortal[];
};

export type AtaResumoAssembleiaPortal = {
  assembleia: AssembleiaPortal;
  quorum: QuorumAtaResumoAssembleiaPortal;
  presencas: PresencaAtaResumoAssembleiaPortal[];
  resultadosVotacoes: ResultadoAtaResumoAssembleiaPortal[];
};

export type ParticipacaoVotacaoEncerradaPortal = {
  id: number;
  unidadeId: number;
  registradoEm: string;
  unidade: {
    id: number;
    identificador: string;
    numero: string;
    bloco: {
      id: number;
      nome: string;
    } | null;
  };
};

export type ComprovanteParticipacaoVotacaoEncerradaPortal = {
  votacao: {
    id: number;
    titulo: string;
    encerradaEm: string | null;
    assembleia: {
      id: number;
      titulo: string;
    };
    pauta: {
      id: number;
      titulo: string;
    };
  };
  participacoes: ParticipacaoVotacaoEncerradaPortal[];
};

export type PapelCondominioAdmin =
  | "ADMINISTRADOR"
  | "SINDICO"
  | "SUBSINDICO"
  | "CONSELHEIRO"
  | "FINANCEIRO"
  | "PORTEIRO"
  | "MORADOR";

export type AdminUsuarioCondominioMorador = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  unidades: Array<{
    id: number;
    papel: string;
    principal: boolean;
    unidade: {
      id: number;
      numero: string;
      identificador: string;
    };
  }>;
};

export type AdminUsuarioCondominio = {
  id: number;
  usuarioId: number;
  condominioId: number;
  papel: PapelCondominioAdmin;
  principal: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    telefone: string | null;
    superAdmin: boolean;
    ativo: boolean;
    ultimoLoginEm: string | null;
    criadoEm: string;
    atualizadoEm: string;
  };
  moradorVinculado: AdminUsuarioCondominioMorador | null;
};

export type AdminUsuariosCondominioResponse = {
  resumo: {
    total: number;
    ativos: number;
    inativos: number;
    administrativos: number;
    moradores: number;
    semMoradorVinculado: number;
  };
  itens: AdminUsuarioCondominio[];
};

export type CriarUsuarioCondominioAdminPayload = {
  email: string;
  papel: PapelCondominioAdmin;
  nome?: string;
  telefone?: string;
  senha?: string;
  principal?: boolean;
};

export type AtualizarUsuarioCondominioAdminPayload = {
  papel?: PapelCondominioAdmin;
  ativo?: boolean;
  principal?: boolean;
};


export type AdminAuditoriaModulo =
  | "USUARIOS"
  | "FINANCEIRO"
  | "COMUNICACAO"
  | "OCORRENCIAS"
  | "RESERVAS"
  | "PORTARIA"
  | "ENCOMENDAS"
  | "GOVERNANCA";

export type AdminAuditoriaNivel = "INFO" | "ATENCAO" | "CRITICO" | "SUCESSO";

export type AdminAuditoriaUsuario = {
  id: number;
  nome: string;
  email: string;
} | null;

export type AdminAuditoriaItem = {
  id: string;
  origemId: number;
  modulo: AdminAuditoriaModulo;
  moduloRotulo: string;
  entidade: string;
  entidadeId: number | null;
  acao: string;
  titulo: string;
  descricao: string;
  detalhes: string | null;
  referencia: string | null;
  nivel: AdminAuditoriaNivel;
  criadoEm: string;
  usuario: AdminAuditoriaUsuario;
};

export type AdminAuditoriaResumo = {
  total: number;
  hoje: number;
  usuarios: number;
  porModulo: Array<{
    modulo: AdminAuditoriaModulo;
    rotulo: string;
    total: number;
  }>;
  porNivel: Array<{
    nivel: AdminAuditoriaNivel;
    total: number;
  }>;
};

export type AdminAuditoriaUsuarioFiltro = {
  id: number;
  nome: string;
  email: string;
};

export type AdminAuditoriaGeralResponse = {
  resumo: AdminAuditoriaResumo;
  usuarios: AdminAuditoriaUsuarioFiltro[];
  itens: AdminAuditoriaItem[];
};

export type AdminRelatorioModulo =
  | "GERAL"
  | "FINANCEIRO"
  | "ESTRUTURA"
  | "PORTARIA"
  | "RESERVAS"
  | "OCORRENCIAS"
  | "COMUNICACAO"
  | "GOVERNANCA";

export type AdminRelatorioIndicador = {
  chave: string;
  rotulo: string;
  valor: number;
  tipo: "numero" | "moeda" | "percentual";
  destaque?: boolean;
};

export type AdminRelatorioLinha = {
  modulo: AdminRelatorioModulo;
  moduloRotulo: string;
  indicador: string;
  valor: number;
  tipo: "numero" | "moeda" | "percentual";
  observacao: string | null;
};

export type AdminRelatorioSecao = {
  modulo: AdminRelatorioModulo;
  rotulo: string;
  descricao: string;
  indicadores: AdminRelatorioIndicador[];
};

export type AdminRelatoriosGeralResponse = {
  periodo: {
    inicio: string;
    fim: string;
  };
  condominio: {
    id: number;
    nome: string;
    slug: string;
  };
  resumo: {
    secoes: number;
    indicadores: number;
    alertas: number;
    saldoRealizado: number;
    inadimplenciaValor: number;
    inadimplenciaTitulos: number;
  };
  secoes: AdminRelatorioSecao[];
  linhas: AdminRelatorioLinha[];
};

export type AdminConfiguracoesCondominio = {
  id: number;
  nome: string;
  slug: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  ativo: boolean;
  nomeExibicaoPortal: string | null;
  logoUrl: string | null;
  mensagemBoasVindasPortal: string | null;
  instrucoesGeraisPortal: string | null;
  contatosUteisPortal: string | null;
  prazoPadraoCobrancaDias: number | null;
  instrucoesVisitantes: string | null;
  instrucoesEncomendas: string | null;
  politicaReservas: string | null;
  assinaturaComunicados: string | null;
  pixChave: string | null;
  pixTipo: TipoPixCondominio | string | null;
  beneficiarioPagamento: string | null;
  bancoPagamento: string | null;
  instrucoesPagamento: string | null;
  mensagemCobrancaPadrao: string | null;
  atualizadoEm: string;
};


export type PortalConfiguracoesCondominio = {
  id: number;
  nome: string;
  slug: string;
  email: string | null;
  telefone: string | null;
  nomeExibicaoPortal: string | null;
  logoUrl: string | null;
  mensagemBoasVindasPortal: string | null;
  instrucoesGeraisPortal: string | null;
  contatosUteisPortal: string | null;
  instrucoesVisitantes: string | null;
  instrucoesEncomendas: string | null;
  politicaReservas: string | null;
  assinaturaComunicados: string | null;
  pixChave: string | null;
  pixTipo: TipoPixCondominio | string | null;
  beneficiarioPagamento: string | null;
  bancoPagamento: string | null;
  instrucoesPagamento: string | null;
  mensagemCobrancaPadrao: string | null;
  atualizadoEm: string;
};

export type AtualizarConfiguracoesCondominioPayload = {
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  nomeExibicaoPortal?: string;
  logoUrl?: string;
  mensagemBoasVindasPortal?: string;
  instrucoesGeraisPortal?: string;
  contatosUteisPortal?: string;
  prazoPadraoCobrancaDias?: number | null;
  instrucoesVisitantes?: string;
  instrucoesEncomendas?: string;
  politicaReservas?: string;
  assinaturaComunicados?: string;
  pixChave?: string;
  pixTipo?: TipoPixCondominio | string;
  beneficiarioPagamento?: string;
  bancoPagamento?: string;
  instrucoesPagamento?: string;
  mensagemCobrancaPadrao?: string;
};


export type StatusDocumentoCondominio = 'RASCUNHO' | 'PUBLICADO' | 'ARQUIVADO';

export type DocumentoCondominioUsuario = {
  id: number;
  nome: string;
  email: string;
};

export type AdminDocumentoCondominio = {
  id: number;
  condominioId: number;
  criadoPorUsuarioId: number | null;
  titulo: string;
  categoria: string | null;
  descricao: string | null;
  url: string;
  publicoMoradores: boolean;
  destaque: boolean;
  status: StatusDocumentoCondominio;
  publicadoEm: string | null;
  arquivadoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
  criadoPorUsuario: DocumentoCondominioUsuario | null;
};

export type DocumentoCondominioPortal = AdminDocumentoCondominio;

export type DocumentoCondominioPayload = {
  titulo: string;
  categoria?: string;
  descricao?: string;
  url: string;
  publicoMoradores: boolean;
  destaque: boolean;
};

export type StatusOrdemServicoAdmin =
  | 'ABERTA'
  | 'AGENDADA'
  | 'EM_EXECUCAO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export type PrioridadeOrdemServicoAdmin = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export type AdminManutencaoPrestadorResumo = {
  id: number;
  nome: string;
  empresa: string | null;
  tipoServico: string | null;
  telefone: string | null;
  ativo?: boolean;
};

export type AdminManutencaoUnidadeResumo = {
  id: number;
  identificador: string;
  numero: string;
};

export type AdminManutencaoOcorrenciaResumo = {
  id: number;
  titulo: string;
  status: string;
  prioridade?: string | null;
};

export type AdminManutencaoUsuarioResumo = {
  id: number;
  nome: string;
  email: string;
};

export type AdminManutencaoHistoricoStatus = {
  id: number;
  statusAnterior: StatusOrdemServicoAdmin | null;
  statusNovo: StatusOrdemServicoAdmin;
  observacao: string | null;
  criadoEm: string;
  usuario: AdminManutencaoUsuarioResumo | null;
};

export type AdminOrdemServicoManutencao = {
  id: number;
  condominioId: number;
  ocorrenciaId: number | null;
  unidadeId: number | null;
  prestadorId: number | null;
  criadoPorUsuarioId: number | null;
  titulo: string;
  descricao: string;
  categoria: string | null;
  prioridade: PrioridadeOrdemServicoAdmin;
  status: StatusOrdemServicoAdmin;
  agendadaPara: string | null;
  iniciadaEm: string | null;
  concluidaEm: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
  prestador: AdminManutencaoPrestadorResumo | null;
  unidade: AdminManutencaoUnidadeResumo | null;
  ocorrencia: AdminManutencaoOcorrenciaResumo | null;
  criadoPorUsuario: AdminManutencaoUsuarioResumo | null;
  historicoStatus: AdminManutencaoHistoricoStatus[];
};

export type AdminManutencaoPayload = {
  titulo: string;
  descricao: string;
  categoria?: string;
  prioridade?: PrioridadeOrdemServicoAdmin;
  status?: StatusOrdemServicoAdmin;
  prestadorId?: number | null;
  unidadeId?: number | null;
  ocorrenciaId?: number | null;
  agendadaPara?: string | null;
  observacoes?: string;
};

export type AdminManutencaoStatusPayload = {
  status: StatusOrdemServicoAdmin;
  observacao?: string;
  motivoCancelamento?: string;
};

export type AdminManutencaoResumo = {
  total: number;
  abertas: number;
  agendadas: number;
  emExecucao: number;
  concluidas: number;
  canceladas: number;
  vencidas: number;
  proximosSeteDias: number;
  comPrestador: number;
};


export type StatusContratoCondominioAdmin = 'ATIVO' | 'ENCERRADO' | 'CANCELADO';

export type AdminContratoPrestadorResumo = {
  id: number;
  nome: string;
  empresa: string | null;
  tipoServico: string | null;
  telefone: string | null;
  ativo?: boolean;
};

export type AdminContratoUsuarioResumo = {
  id: number;
  nome: string;
  email: string;
};

export type AdminContratoCondominio = {
  id: number;
  condominioId: number;
  prestadorId: number | null;
  criadoPorUsuarioId: number | null;
  titulo: string;
  categoria: string | null;
  descricao: string | null;
  numeroContrato: string | null;
  valorMensal: string | number | null;
  inicioEm: string;
  fimEm: string | null;
  renovacaoAutomatica: boolean;
  status: StatusContratoCondominioAdmin;
  observacoes: string | null;
  arquivoUrl: string | null;
  criadoEm: string;
  atualizadoEm: string;
  prestador: AdminContratoPrestadorResumo | null;
  criadoPorUsuario: AdminContratoUsuarioResumo | null;
};

export type AdminContratoPayload = {
  titulo: string;
  categoria?: string;
  descricao?: string;
  numeroContrato?: string;
  valorMensal?: number | string | null;
  prestadorId?: number | null;
  inicioEm: string;
  fimEm?: string | null;
  renovacaoAutomatica?: boolean;
  observacoes?: string;
  arquivoUrl?: string;
};

export type AdminContratoStatusPayload = {
  status: StatusContratoCondominioAdmin;
  observacao?: string;
};

export type AdminContratosResumo = {
  total: number;
  ativos: number;
  vencendo: number;
  vencidos: number;
  encerrados: number;
  cancelados: number;
  renovacaoAutomatica: number;
  valorMensalAtivo: number;
};
