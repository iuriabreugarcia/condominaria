import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PrioridadeOrdemServico,
  StatusContratoCondominio,
  StatusDocumentoCondominio,
  StatusOrdemServico,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCondominioDto } from './dto/create-condominio.dto';
import { UpdateConfiguracoesCondominioDto } from './dto/update-configuracoes-condominio.dto';

type AuditoriaModulo =
  | 'USUARIOS'
  | 'FINANCEIRO'
  | 'COMUNICACAO'
  | 'OCORRENCIAS'
  | 'RESERVAS'
  | 'PORTARIA'
  | 'ENCOMENDAS'
  | 'GOVERNANCA';

type AuditoriaNivel = 'INFO' | 'ATENCAO' | 'CRITICO' | 'SUCESSO';

type ListagemFiltros = Record<string, string | undefined>;

type Paginacao = {
  page: number;
  limit: number;
  skip: number;
};

type ListagemPaginada<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};



type ManutencaoPayload = {
  titulo?: unknown;
  descricao?: unknown;
  categoria?: unknown;
  prioridade?: unknown;
  prestadorId?: unknown;
  unidadeId?: unknown;
  ocorrenciaId?: unknown;
  agendadaPara?: unknown;
  observacoes?: unknown;
};

type ManutencaoStatusPayload = {
  status?: unknown;
  observacao?: unknown;
  motivoCancelamento?: unknown;
};


type ContratoPayload = {
  titulo?: unknown;
  categoria?: unknown;
  descricao?: unknown;
  numeroContrato?: unknown;
  valorMensal?: unknown;
  prestadorId?: unknown;
  inicioEm?: unknown;
  fimEm?: unknown;
  renovacaoAutomatica?: unknown;
  observacoes?: unknown;
  arquivoUrl?: unknown;
};

type ContratoStatusPayload = {
  status?: unknown;
  observacao?: unknown;
};

type DocumentoCondominioPayload = {
  titulo?: unknown;
  categoria?: unknown;
  descricao?: unknown;
  url?: unknown;
  publicoMoradores?: unknown;
  destaque?: unknown;
};

type AuditoriaItem = {
  id: string;
  origemId: number;
  modulo: AuditoriaModulo;
  moduloRotulo: string;
  entidade: string;
  entidadeId: number | null;
  acao: string;
  titulo: string;
  descricao: string;
  detalhes: string | null;
  referencia: string | null;
  nivel: AuditoriaNivel;
  criadoEm: Date;
  usuario: { id: number; nome: string; email: string } | null;
};

@Injectable()
export class CondominiosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCondominioDto) {
    const nome = dto.nome.trim();
    const slug = await this.gerarSlugUnico(nome);

    try {
      return await this.prisma.condominio.create({
        data: {
          nome,
          slug,
          cnpj: this.normalizarOpcional(dto.cnpj),
          email: this.normalizarOpcional(dto.email)?.toLowerCase(),
          telefone: this.normalizarOpcional(dto.telefone),
          cep: this.normalizarOpcional(dto.cep),
          logradouro: this.normalizarOpcional(dto.logradouro),
          numero: this.normalizarOpcional(dto.numero),
          complemento: this.normalizarOpcional(dto.complemento),
          bairro: this.normalizarOpcional(dto.bairro),
          cidade: this.normalizarOpcional(dto.cidade),
          uf: this.normalizarOpcional(dto.uf)?.toUpperCase(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um condomínio com esse CNPJ ou slug.',
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.condominio.findMany({
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const condominio = await this.prisma.condominio.findUnique({
      where: { id },
    });

    if (!condominio) {
      throw new NotFoundException('Condomínio não encontrado.');
    }

    return condominio;
  }

  async obterConfiguracoes(id: number) {
    const condominio = await this.prisma.condominio.findUnique({
      where: { id },
      select: this.selectConfiguracoesCondominio(),
    });

    if (!condominio) {
      throw new NotFoundException('Condomínio não encontrado.');
    }

    return condominio;
  }

  async obterConfiguracoesPortal(id: number) {
    const condominio = await this.prisma.condominio.findUnique({
      where: { id },
      select: this.selectConfiguracoesPortalCondominio(),
    });

    if (!condominio) {
      throw new NotFoundException('Condomínio não encontrado.');
    }

    return condominio;
  }

  async atualizarConfiguracoes(
    id: number,
    dto: UpdateConfiguracoesCondominioDto,
  ) {
    await this.findOne(id);

    const nome = this.normalizarOpcional(dto.nome);

    if (!nome) {
      throw new BadRequestException('O nome do condomínio é obrigatório.');
    }

    const data = {
      nome,
      cnpj: this.normalizarOpcional(dto.cnpj),
      email: this.normalizarOpcional(dto.email)?.toLowerCase(),
      telefone: this.normalizarOpcional(dto.telefone),
      cep: this.normalizarOpcional(dto.cep),
      logradouro: this.normalizarOpcional(dto.logradouro),
      numero: this.normalizarOpcional(dto.numero),
      complemento: this.normalizarOpcional(dto.complemento),
      bairro: this.normalizarOpcional(dto.bairro),
      cidade: this.normalizarOpcional(dto.cidade),
      uf: this.normalizarOpcional(dto.uf)?.toUpperCase(),
      nomeExibicaoPortal: this.normalizarOpcional(dto.nomeExibicaoPortal),
      logoUrl: this.normalizarOpcional(dto.logoUrl),
      mensagemBoasVindasPortal: this.normalizarOpcional(dto.mensagemBoasVindasPortal),
      instrucoesGeraisPortal: this.normalizarOpcional(dto.instrucoesGeraisPortal),
      contatosUteisPortal: this.normalizarOpcional(dto.contatosUteisPortal),
      prazoPadraoCobrancaDias:
        dto.prazoPadraoCobrancaDias === undefined ||
        dto.prazoPadraoCobrancaDias === null
          ? null
          : Number(dto.prazoPadraoCobrancaDias),
      instrucoesVisitantes: this.normalizarOpcional(dto.instrucoesVisitantes),
      instrucoesEncomendas: this.normalizarOpcional(dto.instrucoesEncomendas),
      politicaReservas: this.normalizarOpcional(dto.politicaReservas),
      assinaturaComunicados: this.normalizarOpcional(dto.assinaturaComunicados),
      pixChave: this.normalizarOpcional(dto.pixChave),
      pixTipo: this.normalizarOpcional(dto.pixTipo),
      beneficiarioPagamento: this.normalizarOpcional(dto.beneficiarioPagamento),
      bancoPagamento: this.normalizarOpcional(dto.bancoPagamento),
      instrucoesPagamento: this.normalizarOpcional(dto.instrucoesPagamento),
      mensagemCobrancaPadrao: this.normalizarOpcional(dto.mensagemCobrancaPadrao),
    };

    if (
      data.prazoPadraoCobrancaDias !== null &&
      (!Number.isInteger(data.prazoPadraoCobrancaDias) ||
        data.prazoPadraoCobrancaDias < 0 ||
        data.prazoPadraoCobrancaDias > 365)
    ) {
      throw new BadRequestException(
        'O prazo padrão de cobrança deve estar entre 0 e 365 dias.',
      );
    }

    try {
      return await this.prisma.condominio.update({
        where: { id },
        data,
        select: this.selectConfiguracoesCondominio(),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe outro condomínio com esse CNPJ.',
        );
      }

      throw error;
    }
  }


  async listarDocumentos(
    condominioId: number,
    filtros: ListagemFiltros = {},
  ) {
    await this.findOne(condominioId);

    const where = this.montarFiltroDocumentos(condominioId, filtros);
    const orderBy = [
      { destaque: 'desc' as const },
      { atualizadoEm: 'desc' as const },
      { criadoEm: 'desc' as const },
    ];

    const paginacao = this.normalizarPaginacao(filtros);

    if (paginacao) {
      const [items, total] = await Promise.all([
        this.prisma.documentoCondominio.findMany({
          where,
          include: this.includeDocumentoCondominio(),
          orderBy,
          skip: paginacao.skip,
          take: paginacao.limit,
        }),
        this.prisma.documentoCondominio.count({ where }),
      ]);

      return this.respostaPaginada(items, total, paginacao);
    }

    return this.prisma.documentoCondominio.findMany({
      where,
      include: this.includeDocumentoCondominio(),
      orderBy,
    });
  }

  async listarDocumentosPortal(
    condominioId: number,
    filtros: ListagemFiltros = {},
  ) {
    await this.findOne(condominioId);

    const where = {
      ...this.montarFiltroDocumentos(condominioId, filtros),
      status: StatusDocumentoCondominio.PUBLICADO,
      publicoMoradores: true,
    };
    const orderBy = [
      { destaque: 'desc' as const },
      { publicadoEm: 'desc' as const },
      { atualizadoEm: 'desc' as const },
    ];

    const paginacao = this.normalizarPaginacao(filtros);

    if (paginacao) {
      const [items, total] = await Promise.all([
        this.prisma.documentoCondominio.findMany({
          where,
          include: this.includeDocumentoCondominio(),
          orderBy,
          skip: paginacao.skip,
          take: paginacao.limit,
        }),
        this.prisma.documentoCondominio.count({ where }),
      ]);

      return this.respostaPaginada(items, total, paginacao);
    }

    return this.prisma.documentoCondominio.findMany({
      where,
      include: this.includeDocumentoCondominio(),
      orderBy,
    });
  }

  async criarDocumento(
    condominioId: number,
    dto: DocumentoCondominioPayload,
    usuario: { id: number },
  ) {
    await this.findOne(condominioId);

    const titulo = this.normalizarCampoDocumento(dto.titulo);
    const url = this.normalizarCampoDocumento(dto.url);

    if (!titulo) {
      throw new BadRequestException('O título do documento é obrigatório.');
    }

    if (!url) {
      throw new BadRequestException('Informe o link ou caminho do documento.');
    }

    return this.prisma.documentoCondominio.create({
      data: {
        condominioId,
        criadoPorUsuarioId: usuario.id,
        titulo,
        categoria: this.normalizarCampoDocumento(dto.categoria),
        descricao: this.normalizarCampoDocumento(dto.descricao),
        url,
        publicoMoradores: this.booleanoDocumento(dto.publicoMoradores, true),
        destaque: this.booleanoDocumento(dto.destaque, false),
      },
      include: this.includeDocumentoCondominio(),
    });
  }

  async atualizarDocumento(
    condominioId: number,
    documentoId: number,
    dto: DocumentoCondominioPayload,
  ) {
    await this.garantirDocumento(condominioId, documentoId);

    const titulo = this.normalizarCampoDocumento(dto.titulo);
    const url = this.normalizarCampoDocumento(dto.url);

    if (!titulo) {
      throw new BadRequestException('O título do documento é obrigatório.');
    }

    if (!url) {
      throw new BadRequestException('Informe o link ou caminho do documento.');
    }

    return this.prisma.documentoCondominio.update({
      where: {
        id: documentoId,
      },
      data: {
        titulo,
        categoria: this.normalizarCampoDocumento(dto.categoria),
        descricao: this.normalizarCampoDocumento(dto.descricao),
        url,
        publicoMoradores: this.booleanoDocumento(dto.publicoMoradores, true),
        destaque: this.booleanoDocumento(dto.destaque, false),
      },
      include: this.includeDocumentoCondominio(),
    });
  }

  async publicarDocumento(condominioId: number, documentoId: number) {
    await this.garantirDocumento(condominioId, documentoId);

    return this.prisma.documentoCondominio.update({
      where: {
        id: documentoId,
      },
      data: {
        status: StatusDocumentoCondominio.PUBLICADO,
        publicadoEm: new Date(),
        arquivadoEm: null,
      },
      include: this.includeDocumentoCondominio(),
    });
  }

  async arquivarDocumento(condominioId: number, documentoId: number) {
    await this.garantirDocumento(condominioId, documentoId);

    return this.prisma.documentoCondominio.update({
      where: {
        id: documentoId,
      },
      data: {
        status: StatusDocumentoCondominio.ARQUIVADO,
        arquivadoEm: new Date(),
      },
      include: this.includeDocumentoCondominio(),
    });
  }


  async listarManutencoes(
    condominioId: number,
    filtros: ListagemFiltros = {},
  ) {
    await this.findOne(condominioId);

    const where = this.montarFiltroManutencoes(condominioId, filtros);
    const orderBy = [
      { agendadaPara: 'asc' as const },
      { atualizadoEm: 'desc' as const },
    ];

    const paginacao = this.normalizarPaginacao(filtros);

    if (paginacao) {
      const [items, total] = await Promise.all([
        this.prisma.ordemServico.findMany({
          where,
          include: this.includeManutencao(),
          orderBy,
          skip: paginacao.skip,
          take: paginacao.limit,
        }),
        this.prisma.ordemServico.count({ where }),
      ]);

      return this.respostaPaginada(items, total, paginacao);
    }

    return this.prisma.ordemServico.findMany({
      where,
      include: this.includeManutencao(),
      orderBy,
    });
  }

  async resumoManutencoes(condominioId: number) {
    await this.findOne(condominioId);

    const agora = new Date();
    const emSeteDias = new Date(agora);
    emSeteDias.setDate(emSeteDias.getDate() + 7);

    const [
      total,
      abertas,
      agendadas,
      emExecucao,
      concluidas,
      canceladas,
      vencidas,
      proximosSeteDias,
      comPrestador,
      urgentes,
    ] = await Promise.all([
      this.prisma.ordemServico.count({ where: { condominioId } }),
      this.prisma.ordemServico.count({
        where: { condominioId, status: StatusOrdemServico.ABERTA },
      }),
      this.prisma.ordemServico.count({
        where: { condominioId, status: StatusOrdemServico.AGENDADA },
      }),
      this.prisma.ordemServico.count({
        where: { condominioId, status: StatusOrdemServico.EM_EXECUCAO },
      }),
      this.prisma.ordemServico.count({
        where: { condominioId, status: StatusOrdemServico.CONCLUIDA },
      }),
      this.prisma.ordemServico.count({
        where: { condominioId, status: StatusOrdemServico.CANCELADA },
      }),
      this.prisma.ordemServico.count({
        where: {
          condominioId,
          status: {
            in: [
              StatusOrdemServico.ABERTA,
              StatusOrdemServico.AGENDADA,
              StatusOrdemServico.EM_EXECUCAO,
            ],
          },
          agendadaPara: {
            lt: agora,
          },
        },
      }),
      this.prisma.ordemServico.count({
        where: {
          condominioId,
          status: {
            in: [StatusOrdemServico.ABERTA, StatusOrdemServico.AGENDADA],
          },
          agendadaPara: {
            gte: agora,
            lte: emSeteDias,
          },
        },
      }),
      this.prisma.ordemServico.count({
        where: {
          condominioId,
          prestadorId: {
            not: null,
          },
        },
      }),
      this.prisma.ordemServico.count({
        where: {
          condominioId,
          prioridade: PrioridadeOrdemServico.URGENTE,
          status: {
            in: [
              StatusOrdemServico.ABERTA,
              StatusOrdemServico.AGENDADA,
              StatusOrdemServico.EM_EXECUCAO,
            ],
          },
        },
      }),
    ]);

    return {
      total,
      abertas,
      agendadas,
      emExecucao,
      emAndamento: emExecucao,
      concluidas,
      canceladas,
      vencidas,
      proximosSeteDias,
      comPrestador,
      urgentes,
    };
  }

  async criarManutencao(
    condominioId: number,
    dto: ManutencaoPayload,
    usuario: { id: number },
  ) {
    await this.findOne(condominioId);

    const titulo = this.normalizarCampoManutencao(dto.titulo);
    const descricao = this.normalizarCampoManutencao(dto.descricao);

    if (!titulo) {
      throw new BadRequestException('O título da manutenção é obrigatório.');
    }

    if (!descricao) {
      throw new BadRequestException('A descrição da manutenção é obrigatória.');
    }

    const prioridade = this.normalizarPrioridadeManutencao(dto.prioridade);
    const prestadorId = this.normalizarIdManutencao(dto.prestadorId);
    const unidadeId = this.normalizarIdManutencao(dto.unidadeId);
    const ocorrenciaId = this.normalizarIdManutencao(dto.ocorrenciaId);
    const agendadaPara = this.normalizarDataManutencao(dto.agendadaPara);

    await this.validarRelacionamentosManutencao(
      condominioId,
      prestadorId,
      unidadeId,
      ocorrenciaId,
    );

    const statusInicial = agendadaPara
      ? StatusOrdemServico.AGENDADA
      : StatusOrdemServico.ABERTA;

    return this.prisma.ordemServico.create({
      data: {
        condominioId,
        criadoPorUsuarioId: usuario.id,
        titulo,
        descricao,
        categoria: this.normalizarCampoManutencao(dto.categoria),
        prioridade,
        status: statusInicial,
        prestadorId,
        unidadeId,
        ocorrenciaId,
        agendadaPara,
        observacoes: this.normalizarCampoManutencao(dto.observacoes),
        historicoStatus: {
          create: {
            usuarioId: usuario.id,
            statusAnterior: null,
            statusNovo: statusInicial,
            observacao: 'Ordem de manutenção criada.',
          },
        },
      },
      include: this.includeManutencao(),
    });
  }

  async atualizarManutencao(
    condominioId: number,
    ordemId: number,
    dto: ManutencaoPayload,
  ) {
    const ordem = await this.garantirManutencao(condominioId, ordemId);

    const titulo = this.normalizarCampoManutencao(dto.titulo);
    const descricao = this.normalizarCampoManutencao(dto.descricao);

    if (!titulo) {
      throw new BadRequestException('O título da manutenção é obrigatório.');
    }

    if (!descricao) {
      throw new BadRequestException('A descrição da manutenção é obrigatória.');
    }

    const prestadorId = this.normalizarIdManutencao(dto.prestadorId);
    const unidadeId = this.normalizarIdManutencao(dto.unidadeId);
    const ocorrenciaId = this.normalizarIdManutencao(dto.ocorrenciaId);

    await this.validarRelacionamentosManutencao(
      condominioId,
      prestadorId,
      unidadeId,
      ocorrenciaId,
    );

    return this.prisma.ordemServico.update({
      where: {
        id: ordem.id,
      },
      data: {
        titulo,
        descricao,
        categoria: this.normalizarCampoManutencao(dto.categoria),
        prioridade: this.normalizarPrioridadeManutencao(dto.prioridade),
        prestadorId,
        unidadeId,
        ocorrenciaId,
        agendadaPara: this.normalizarDataManutencao(dto.agendadaPara),
        observacoes: this.normalizarCampoManutencao(dto.observacoes),
      },
      include: this.includeManutencao(),
    });
  }

  async alterarStatusManutencao(
    condominioId: number,
    ordemId: number,
    dto: ManutencaoStatusPayload,
    usuario: { id: number },
  ) {
    const ordem = await this.garantirManutencao(condominioId, ordemId);
    const statusNovo = this.normalizarStatusManutencao(dto.status);
    const agora = new Date();

    const data: Prisma.OrdemServicoUpdateInput = {
      status: statusNovo,
    };

    if (statusNovo === StatusOrdemServico.EM_EXECUCAO && !ordem.iniciadaEm) {
      data.iniciadaEm = agora;
    }

    if (statusNovo === StatusOrdemServico.CONCLUIDA) {
      data.concluidaEm = agora;
      data.canceladaEm = null;
      data.motivoCancelamento = null;
    }

    if (statusNovo === StatusOrdemServico.CANCELADA) {
      data.canceladaEm = agora;
      data.motivoCancelamento = this.normalizarCampoManutencao(
        dto.motivoCancelamento,
      );
    }

    if (
      statusNovo === StatusOrdemServico.ABERTA ||
      statusNovo === StatusOrdemServico.AGENDADA
    ) {
      data.iniciadaEm = null;
      data.concluidaEm = null;
      data.canceladaEm = null;
      data.motivoCancelamento = null;
    }

    return this.prisma.ordemServico.update({
      where: {
        id: ordem.id,
      },
      data: {
        ...data,
        historicoStatus: {
          create: {
            usuarioId: usuario.id,
            statusAnterior: ordem.status,
            statusNovo,
            observacao: this.normalizarCampoManutencao(dto.observacao),
          },
        },
      },
      include: this.includeManutencao(),
    });
  }

  async listarContratos(
    condominioId: number,
    filtros: ListagemFiltros = {},
  ) {
    await this.findOne(condominioId);

    const where = this.montarFiltroContratos(condominioId, filtros);
    const orderBy = [
      { status: 'asc' as const },
      { fimEm: 'asc' as const },
      { atualizadoEm: 'desc' as const },
    ];

    const paginacao = this.normalizarPaginacao(filtros);

    if (paginacao) {
      const [items, total] = await Promise.all([
        this.prisma.contratoCondominio.findMany({
          where,
          include: this.includeContratoCondominio(),
          orderBy,
          skip: paginacao.skip,
          take: paginacao.limit,
        }),
        this.prisma.contratoCondominio.count({ where }),
      ]);

      return this.respostaPaginada(items, total, paginacao);
    }

    return this.prisma.contratoCondominio.findMany({
      where,
      include: this.includeContratoCondominio(),
      orderBy,
    });
  }

  async resumoContratos(condominioId: number) {
    await this.findOne(condominioId);

    const contratos = await this.prisma.contratoCondominio.findMany({
      where: {
        condominioId,
      },
      select: {
        id: true,
        status: true,
        fimEm: true,
        renovacaoAutomatica: true,
        valorMensal: true,
      },
    });

    const agora = new Date();
    const limite = new Date(agora);
    limite.setDate(limite.getDate() + 30);

    const ativos = contratos.filter(
      (contrato) => contrato.status === StatusContratoCondominio.ATIVO,
    );

    const vencidos = ativos.filter(
      (contrato) => contrato.fimEm && new Date(contrato.fimEm).getTime() < agora.getTime(),
    );

    const vencendo = ativos.filter((contrato) => {
      if (!contrato.fimEm) {
        return false;
      }

      const fimEm = new Date(contrato.fimEm).getTime();

      return fimEm >= agora.getTime() && fimEm <= limite.getTime();
    });

    const valorMensalAtivo = ativos.reduce(
      (total, contrato) => total + Number(contrato.valorMensal ?? 0),
      0,
    );

    return {
      total: contratos.length,
      ativos: ativos.length,
      vencendo: vencendo.length,
      vencidos: vencidos.length,
      encerrados: contratos.filter(
        (contrato) => contrato.status === StatusContratoCondominio.ENCERRADO,
      ).length,
      cancelados: contratos.filter(
        (contrato) => contrato.status === StatusContratoCondominio.CANCELADO,
      ).length,
      renovacaoAutomatica: contratos.filter((contrato) => contrato.renovacaoAutomatica).length,
      valorMensalAtivo,
    };
  }

  async criarContrato(
    condominioId: number,
    dto: ContratoPayload,
    usuario: { id: number },
  ) {
    await this.findOne(condominioId);

    const data = await this.montarDadosContrato(condominioId, dto);

    return this.prisma.contratoCondominio.create({
      data: {
        ...data,
        condominioId,
        criadoPorUsuarioId: usuario.id,
      },
      include: this.includeContratoCondominio(),
    });
  }

  async atualizarContrato(
    condominioId: number,
    contratoId: number,
    dto: ContratoPayload,
  ) {
    const contrato = await this.garantirContrato(condominioId, contratoId);
    const data = await this.montarDadosContrato(condominioId, dto);

    return this.prisma.contratoCondominio.update({
      where: {
        id: contrato.id,
      },
      data,
      include: this.includeContratoCondominio(),
    });
  }

  async alterarStatusContrato(
    condominioId: number,
    contratoId: number,
    dto: ContratoStatusPayload,
  ) {
    const contrato = await this.garantirContrato(condominioId, contratoId);
    const status = this.normalizarStatusContrato(dto.status);

    return this.prisma.contratoCondominio.update({
      where: {
        id: contrato.id,
      },
      data: {
        status,
        observacoes:
          typeof dto.observacao === 'string' && dto.observacao.trim()
            ? dto.observacao.trim()
            : undefined,
      },
      include: this.includeContratoCondominio(),
    });
  }

  async listarAuditoriaGeral(
    condominioId: number,
    filtros: Record<string, string | undefined>,
  ) {
    await this.findOne(condominioId);

    const inicio = this.criarDataFiltro(filtros.inicio, 'inicio');
    const fim = this.criarDataFiltro(filtros.fim, 'fim');
    const moduloFiltro = this.normalizarOpcional(filtros.modulo) as
      | AuditoriaModulo
      | null;
    const nivelFiltro = this.normalizarOpcional(filtros.nivel) as
      | AuditoriaNivel
      | null;
    const usuarioIdFiltro = filtros.usuarioId ? Number(filtros.usuarioId) : null;
    const busca = this.normalizarOpcional(filtros.busca)?.toLocaleLowerCase('pt-BR') ?? null;

    const intervalo = this.montarIntervaloData(inicio, fim);
    const prisma = this.prisma as any;

    const executar = async <T>(consulta: Promise<T[]>): Promise<T[]> => {
      try {
        return await consulta;
      } catch {
        return [];
      }
    };

    const [
      historicosFinanceiros,
      usuariosCondominio,
      comunicados,
      ocorrenciasHistorico,
      reservas,
      autorizacoesVisitantes,
      registrosVisitantes,
      encomendas,
      assembleias,
      votacoes,
      votos,
    ] = await Promise.all([
      executar<any>(
        prisma.historicoFinanceiro.findMany({
          where: {
            condominioId,
            ...(intervalo ? { criadoEm: intervalo } : {}),
          },
          include: {
            usuario: { select: { id: true, nome: true, email: true } },
            lancamentoFinanceiro: { select: { id: true, descricao: true, status: true } },
            cobrancaCondominial: {
              select: {
                id: true,
                descricao: true,
                status: true,
                unidade: { select: { identificador: true, numero: true } },
              },
            },
          },
          orderBy: { criadoEm: 'desc' },
          take: 80,
        }),
      ),
      executar<any>(
        prisma.usuarioCondominio.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            usuario: { select: { id: true, nome: true, email: true, ativo: true, superAdmin: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.comunicado.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            criadoPorUsuario: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.ocorrenciaHistoricoStatus.findMany({
          where: {
            ocorrencia: { condominioId },
            ...(intervalo ? { criadoEm: intervalo } : {}),
          },
          include: {
            usuario: { select: { id: true, nome: true, email: true } },
            ocorrencia: { select: { id: true, titulo: true, prioridade: true } },
          },
          orderBy: { criadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.reservaAreaComum.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            areaComum: { select: { nome: true } },
            unidade: { select: { identificador: true, numero: true } },
            morador: { select: { nome: true } },
            criadoPorUsuario: { select: { id: true, nome: true, email: true } },
            aprovadoPorUsuario: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.autorizacaoVisitante.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            visitante: { select: { nome: true } },
            unidade: { select: { identificador: true, numero: true } },
            morador: { select: { nome: true } },
            criadoPorUsuario: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.registroAcessoVisitante.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            visitante: { select: { nome: true } },
            unidade: { select: { identificador: true, numero: true } },
            entradaRegistradaPor: { select: { id: true, nome: true, email: true } },
            saidaRegistradaPor: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.encomendaPortaria.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            unidade: { select: { identificador: true, numero: true } },
            morador: { select: { nome: true } },
            recebidoPorUsuario: { select: { id: true, nome: true, email: true } },
            retiradoPorUsuario: { select: { id: true, nome: true, email: true } },
            devolvidoPorUsuario: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.assembleia.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            criadoPorUsuario: { select: { id: true, nome: true, email: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.votacaoAssembleia.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          include: {
            criadoPorUsuario: { select: { id: true, nome: true, email: true } },
            assembleia: { select: { titulo: true } },
          },
          orderBy: { atualizadoEm: 'desc' },
          take: 60,
        }),
      ),
      executar<any>(
        prisma.votoAssembleia.findMany({
          where: {
            votacao: { condominioId },
            ...(intervalo ? { registradoEm: intervalo } : {}),
          },
          include: {
            registradoPorUsuario: { select: { id: true, nome: true, email: true } },
            votacao: { select: { id: true, titulo: true } },
            unidade: { select: { identificador: true, numero: true } },
          },
          orderBy: { registradoEm: 'desc' },
          take: 60,
        }),
      ),
    ]);

    const itens: AuditoriaItem[] = [
      ...historicosFinanceiros.map((item) => this.mapearAuditoriaFinanceira(item)),
      ...usuariosCondominio.map((item) => this.mapearAuditoriaUsuario(item)),
      ...comunicados.map((item) => this.mapearAuditoriaComunicado(item)),
      ...ocorrenciasHistorico.map((item) => this.mapearAuditoriaOcorrencia(item)),
      ...reservas.map((item) => this.mapearAuditoriaReserva(item)),
      ...autorizacoesVisitantes.map((item) => this.mapearAuditoriaVisitante(item)),
      ...registrosVisitantes.flatMap((item) => this.mapearAuditoriaRegistroVisitante(item)),
      ...encomendas.map((item) => this.mapearAuditoriaEncomenda(item)),
      ...assembleias.map((item) => this.mapearAuditoriaAssembleia(item)),
      ...votacoes.map((item) => this.mapearAuditoriaVotacao(item)),
      ...votos.map((item) => this.mapearAuditoriaVoto(item)),
    ]
      .filter((item) => !moduloFiltro || item.modulo === moduloFiltro)
      .filter((item) => !nivelFiltro || item.nivel === nivelFiltro)
      .filter((item) => !usuarioIdFiltro || item.usuario?.id === usuarioIdFiltro)
      .filter((item) => this.filtrarAuditoriaPorBusca(item, busca))
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .slice(0, 250);

    const usuarios = Array.from(
      new Map(
        itens
          .filter((item) => item.usuario)
          .map((item) => [item.usuario!.id, item.usuario!]),
      ).values(),
    ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    return {
      resumo: {
        total: itens.length,
        hoje: itens.filter((item) => item.criadoEm >= inicioHoje).length,
        usuarios: usuarios.length,
        porModulo: this.resumirAuditoriaPorModulo(itens),
        porNivel: this.resumirAuditoriaPorNivel(itens),
      },
      usuarios,
      itens,
    };
  }


  async relatorioGeral(
    condominioId: number,
    filtros: Record<string, string | undefined>,
  ) {
    const condominio = await this.findOne(condominioId);

    const hoje = new Date();
    const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimPadrao = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const inicio = this.criarDataFiltro(filtros.inicio, 'inicio') ?? inicioPadrao;
    const fim = this.criarDataFiltro(filtros.fim, 'fim') ?? fimPadrao;
    const intervalo = this.montarIntervaloData(inicio, fim);
    const prisma = this.prisma as any;

    const executar = async <T>(consulta: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await consulta;
      } catch {
        return fallback;
      }
    };

    const [
      lancamentos,
      cobrancas,
      unidades,
      moradores,
      usuariosCondominio,
      autorizacoesVisitantes,
      registrosVisitantes,
      encomendas,
      reservas,
      ocorrencias,
      comunicados,
      leiturasComunicados,
      assembleias,
      votacoes,
      votos,
    ] = await Promise.all([
      executar<any[]>(
        prisma.lancamentoFinanceiro.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { competenciaEm: intervalo },
                    { vencimentoEm: intervalo },
                    { pagoEm: intervalo },
                    { criadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            tipo: true,
            status: true,
            valor: true,
            pagoEm: true,
            vencimentoEm: true,
          },
        }),
        [],
      ),
      executar<any[]>(
        prisma.cobrancaCondominial.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { competenciaEm: intervalo },
                    { vencimentoEm: intervalo },
                    { pagoEm: intervalo },
                    { criadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            status: true,
            valor: true,
            vencimentoEm: true,
            pagoEm: true,
          },
        }),
        [],
      ),
      executar<any[]>(
        prisma.unidade.findMany({
          where: { condominioId },
          select: { id: true, ativo: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.morador.findMany({
          where: { condominioId },
          select: { id: true, ativo: true, usuarioId: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.usuarioCondominio.findMany({
          where: { condominioId },
          select: { id: true, papel: true, ativo: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.autorizacaoVisitante.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          select: { id: true, status: true, inicioEm: true, fimEm: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.registroAcessoVisitante.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { entradaEm: intervalo },
                    { saidaEm: intervalo },
                    { atualizadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: { id: true, entradaEm: true, saidaEm: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.encomendaPortaria.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { recebidoEm: intervalo },
                    { retiradoEm: intervalo },
                    { devolvidoEm: intervalo },
                    { atualizadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: { id: true, status: true, recebidoEm: true, retiradoEm: true, devolvidoEm: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.reservaAreaComum.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { inicioEm: intervalo },
                    { fimEm: intervalo },
                    { atualizadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: { id: true, status: true, inicioEm: true, fimEm: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.ocorrencia.findMany({
          where: {
            condominioId,
            ...(intervalo ? { atualizadoEm: intervalo } : {}),
          },
          select: { id: true, status: true, prioridade: true, encerradaEm: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.comunicado.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { publicadoEm: intervalo },
                    { criadoEm: intervalo },
                    { atualizadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: { id: true, status: true, prioridade: true, publicadoEm: true },
        }),
        [],
      ),
      executar<number>(
        prisma.comunicadoLeitura.count({
          where: {
            condominioId,
            ...(intervalo ? { lidoEm: intervalo } : {}),
          },
        }),
        0,
      ),
      executar<any[]>(
        prisma.assembleia.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { primeiraChamadaEm: intervalo },
                    { convocadaEm: intervalo },
                    { iniciadaEm: intervalo },
                    { encerradaEm: intervalo },
                    { atualizadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: { id: true, status: true, primeiraChamadaEm: true },
        }),
        [],
      ),
      executar<any[]>(
        prisma.votacaoAssembleia.findMany({
          where: {
            condominioId,
            ...(intervalo
              ? {
                  OR: [
                    { abertaEm: intervalo },
                    { encerradaEm: intervalo },
                    { criadoEm: intervalo },
                    { atualizadoEm: intervalo },
                  ],
                }
              : {}),
          },
          select: { id: true, status: true, abertaEm: true, encerradaEm: true },
        }),
        [],
      ),
      executar<number>(
        prisma.votoAssembleia.count({
          where: {
            votacao: { condominioId },
            ...(intervalo ? { registradoEm: intervalo } : {}),
          },
        }),
        0,
      ),
    ]);

    const agora = new Date();
    const valorLancamentos = (tipo: string, status?: string) =>
      this.somarValoresRelatorio(
        lancamentos.filter(
          (item) => item.tipo === tipo && (!status || item.status === status),
        ),
      );
    const valorCobrancas = (status?: string) =>
      this.somarValoresRelatorio(
        cobrancas.filter((item) => !status || item.status === status),
      );

    const receitaPrevista = valorLancamentos('RECEITA');
    const receitaPaga = valorLancamentos('RECEITA', 'PAGO');
    const despesaLancada = valorLancamentos('DESPESA');
    const despesaPaga = valorLancamentos('DESPESA', 'PAGO');
    const cobrancasPendentes = valorCobrancas('PENDENTE');
    const cobrancasPagas = valorCobrancas('PAGO');
    const cobrancasVencidas = cobrancas.filter(
      (item) => item.status === 'PENDENTE' && item.vencimentoEm && new Date(item.vencimentoEm) < agora,
    );
    const valorCobrancasVencidas = this.somarValoresRelatorio(cobrancasVencidas);
    const moradoresAtivos = moradores.filter((item) => item.ativo).length;
    const comunicadosPublicados = comunicados.filter((item) => item.status === 'PUBLICADO').length;
    const leiturasPendentesComunicados = Math.max(
      0,
      comunicadosPublicados * moradoresAtivos - Number(leiturasComunicados || 0),
    );

    const secoes = [
      this.criarSecaoRelatorio('FINANCEIRO', 'Financeiro', 'Receitas, despesas, cobranças e inadimplência.', [
        this.indicadorRelatorio('receita-prevista', 'Receitas lançadas', receitaPrevista, 'moeda'),
        this.indicadorRelatorio('receita-paga', 'Receitas pagas', receitaPaga, 'moeda', true),
        this.indicadorRelatorio('despesa-lancada', 'Despesas lançadas', despesaLancada, 'moeda'),
        this.indicadorRelatorio('despesa-paga', 'Despesas pagas', despesaPaga, 'moeda'),
        this.indicadorRelatorio('saldo-realizado', 'Saldo realizado', receitaPaga - despesaPaga, 'moeda', true),
        this.indicadorRelatorio('saldo-previsto', 'Saldo previsto', receitaPrevista - despesaLancada, 'moeda'),
        this.indicadorRelatorio('cobrancas-pendentes', 'Cobranças pendentes', cobrancas.filter((item) => item.status === 'PENDENTE').length, 'numero'),
        this.indicadorRelatorio('valor-pendente', 'Valor pendente', cobrancasPendentes, 'moeda'),
        this.indicadorRelatorio('cobrancas-vencidas', 'Cobranças vencidas', cobrancasVencidas.length, 'numero', true),
        this.indicadorRelatorio('valor-vencido', 'Valor vencido', valorCobrancasVencidas, 'moeda', true),
        this.indicadorRelatorio('cobrancas-pagas', 'Cobranças pagas', cobrancasPagas, 'moeda'),
      ]),
      this.criarSecaoRelatorio('ESTRUTURA', 'Moradores e unidades', 'Base cadastral do condomínio e vínculos de acesso.', [
        this.indicadorRelatorio('unidades-total', 'Unidades cadastradas', unidades.length, 'numero'),
        this.indicadorRelatorio('unidades-ativas', 'Unidades ativas', unidades.filter((item) => item.ativo).length, 'numero', true),
        this.indicadorRelatorio('moradores-total', 'Moradores cadastrados', moradores.length, 'numero'),
        this.indicadorRelatorio('moradores-ativos', 'Moradores ativos', moradoresAtivos, 'numero', true),
        this.indicadorRelatorio('moradores-vinculados', 'Moradores com usuário', moradores.filter((item) => item.usuarioId).length, 'numero'),
        this.indicadorRelatorio('usuarios-condominio', 'Usuários vinculados', usuariosCondominio.length, 'numero'),
        this.indicadorRelatorio('usuarios-ativos', 'Usuários ativos', usuariosCondominio.filter((item) => item.ativo).length, 'numero'),
      ]),
      this.criarSecaoRelatorio('PORTARIA', 'Portaria', 'Visitantes, entradas, saídas e encomendas.', [
        this.indicadorRelatorio('visitantes-autorizacoes', 'Autorizações de visitantes', autorizacoesVisitantes.length, 'numero'),
        this.indicadorRelatorio('visitantes-ativas', 'Autorizações ativas', autorizacoesVisitantes.filter((item) => item.status === 'ATIVA').length, 'numero'),
        this.indicadorRelatorio('entradas-visitantes', 'Entradas registradas', registrosVisitantes.filter((item) => item.entradaEm).length, 'numero', true),
        this.indicadorRelatorio('saidas-visitantes', 'Saídas registradas', registrosVisitantes.filter((item) => item.saidaEm).length, 'numero'),
        this.indicadorRelatorio('encomendas-recebidas', 'Encomendas recebidas', encomendas.filter((item) => item.status === 'RECEBIDA').length, 'numero', true),
        this.indicadorRelatorio('encomendas-retiradas', 'Encomendas retiradas', encomendas.filter((item) => item.status === 'RETIRADA').length, 'numero'),
        this.indicadorRelatorio('encomendas-devolvidas', 'Encomendas devolvidas', encomendas.filter((item) => item.status === 'DEVOLVIDA').length, 'numero'),
      ]),
      this.criarSecaoRelatorio('RESERVAS', 'Reservas', 'Solicitações e uso de áreas comuns.', [
        this.indicadorRelatorio('reservas-total', 'Reservas no período', reservas.length, 'numero'),
        this.indicadorRelatorio('reservas-solicitadas', 'Solicitadas', reservas.filter((item) => item.status === 'SOLICITADA').length, 'numero', true),
        this.indicadorRelatorio('reservas-aprovadas', 'Aprovadas', reservas.filter((item) => item.status === 'APROVADA').length, 'numero'),
        this.indicadorRelatorio('reservas-recusadas', 'Recusadas', reservas.filter((item) => item.status === 'RECUSADA').length, 'numero'),
        this.indicadorRelatorio('reservas-concluidas', 'Concluídas', reservas.filter((item) => item.status === 'CONCLUIDA').length, 'numero'),
        this.indicadorRelatorio('reservas-canceladas', 'Canceladas', reservas.filter((item) => item.status === 'CANCELADA').length, 'numero'),
      ]),
      this.criarSecaoRelatorio('OCORRENCIAS', 'Ocorrências', 'Chamados, prioridades e resolução.', [
        this.indicadorRelatorio('ocorrencias-total', 'Ocorrências no período', ocorrencias.length, 'numero'),
        this.indicadorRelatorio('ocorrencias-abertas', 'Abertas', ocorrencias.filter((item) => item.status === 'ABERTA').length, 'numero', true),
        this.indicadorRelatorio('ocorrencias-andamento', 'Em acompanhamento', ocorrencias.filter((item) => ['EM_ANALISE', 'EM_ANDAMENTO', 'AGUARDANDO_MORADOR'].includes(item.status)).length, 'numero', true),
        this.indicadorRelatorio('ocorrencias-resolvidas', 'Resolvidas', ocorrencias.filter((item) => item.status === 'RESOLVIDA').length, 'numero'),
        this.indicadorRelatorio('ocorrencias-urgentes', 'Urgentes', ocorrencias.filter((item) => item.prioridade === 'URGENTE' && !['RESOLVIDA', 'CANCELADA'].includes(item.status)).length, 'numero', true),
        this.indicadorRelatorio('ocorrencias-canceladas', 'Canceladas', ocorrencias.filter((item) => item.status === 'CANCELADA').length, 'numero'),
      ]),
      this.criarSecaoRelatorio('COMUNICACAO', 'Comunicação', 'Comunicados publicados e confirmações de leitura.', [
        this.indicadorRelatorio('comunicados-total', 'Comunicados no período', comunicados.length, 'numero'),
        this.indicadorRelatorio('comunicados-publicados', 'Publicados', comunicadosPublicados, 'numero', true),
        this.indicadorRelatorio('comunicados-urgentes', 'Urgentes/importantes', comunicados.filter((item) => ['URGENTE', 'IMPORTANTE'].includes(item.prioridade)).length, 'numero'),
        this.indicadorRelatorio('leituras-confirmadas', 'Leituras confirmadas', Number(leiturasComunicados || 0), 'numero'),
        this.indicadorRelatorio('leituras-pendentes', 'Leituras estimadas pendentes', leiturasPendentesComunicados, 'numero', true),
      ]),
      this.criarSecaoRelatorio('GOVERNANCA', 'Governança', 'Assembleias, votações e participação.', [
        this.indicadorRelatorio('assembleias-total', 'Assembleias no período', assembleias.length, 'numero'),
        this.indicadorRelatorio('assembleias-ativas', 'Assembleias ativas', assembleias.filter((item) => ['CONVOCADA', 'EM_ANDAMENTO'].includes(item.status)).length, 'numero', true),
        this.indicadorRelatorio('assembleias-encerradas', 'Assembleias encerradas', assembleias.filter((item) => item.status === 'ENCERRADA').length, 'numero'),
        this.indicadorRelatorio('votacoes-abertas', 'Votações abertas', votacoes.filter((item) => item.status === 'ABERTA').length, 'numero', true),
        this.indicadorRelatorio('votacoes-encerradas', 'Votações encerradas', votacoes.filter((item) => item.status === 'ENCERRADA').length, 'numero'),
        this.indicadorRelatorio('votos-registrados', 'Votos registrados', Number(votos || 0), 'numero'),
      ]),
    ];

    const linhas = secoes.flatMap((secao) =>
      secao.indicadores.map((indicador) => ({
        modulo: secao.modulo,
        moduloRotulo: secao.rotulo,
        indicador: indicador.rotulo,
        valor: indicador.valor,
        tipo: indicador.tipo,
        observacao: indicador.destaque ? 'Indicador de atenção/destaque' : null,
      })),
    );

    return {
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      condominio: {
        id: condominio.id,
        nome: condominio.nome,
        slug: condominio.slug,
      },
      resumo: {
        secoes: secoes.length,
        indicadores: linhas.length,
        alertas: linhas.filter((linha) => linha.observacao).length,
        saldoRealizado: receitaPaga - despesaPaga,
        inadimplenciaValor: valorCobrancasVencidas,
        inadimplenciaTitulos: cobrancasVencidas.length,
      },
      secoes,
      linhas,
    };
  }

  private somarValoresRelatorio(itens: Array<{ valor: unknown }>) {
    return itens.reduce((total, item) => total + Number(item.valor ?? 0), 0);
  }

  private indicadorRelatorio(
    chave: string,
    rotulo: string,
    valor: number,
    tipo: 'numero' | 'moeda' | 'percentual',
    destaque = false,
  ) {
    return {
      chave,
      rotulo,
      valor,
      tipo,
      destaque,
    };
  }

  private criarSecaoRelatorio(
    modulo: 'GERAL' | 'FINANCEIRO' | 'ESTRUTURA' | 'PORTARIA' | 'RESERVAS' | 'OCORRENCIAS' | 'COMUNICACAO' | 'GOVERNANCA',
    rotulo: string,
    descricao: string,
    indicadores: Array<{
      chave: string;
      rotulo: string;
      valor: number;
      tipo: 'numero' | 'moeda' | 'percentual';
      destaque: boolean;
    }>,
  ) {
    return {
      modulo,
      rotulo,
      descricao,
      indicadores,
    };
  }

  private criarDataFiltro(valor: string | undefined, tipo: 'inicio' | 'fim') {
    if (!valor) {
      return null;
    }

    const data = new Date(`${valor}T${tipo === 'inicio' ? '00:00:00' : '23:59:59'}`);

    return Number.isNaN(data.getTime()) ? null : data;
  }

  private montarIntervaloData(inicio: Date | null, fim: Date | null) {
    if (!inicio && !fim) {
      return null;
    }

    return {
      ...(inicio ? { gte: inicio } : {}),
      ...(fim ? { lte: fim } : {}),
    };
  }

  private usuarioAuditoria(usuario: any) {
    if (!usuario) {
      return null;
    }

    return {
      id: Number(usuario.id),
      nome: String(usuario.nome ?? 'Usuário'),
      email: String(usuario.email ?? ''),
    };
  }

  private nivelPorStatus(status: string | null | undefined): AuditoriaNivel {
    const valor = String(status ?? '').toUpperCase();

    if (valor.includes('CANCEL') || valor.includes('DEVOLVID') || valor.includes('RECUS')) {
      return 'ATENCAO';
    }

    if (valor.includes('PAGO') || valor.includes('RETIRADA') || valor.includes('CONCLUIDA') || valor.includes('RESOLVIDA') || valor.includes('ENCERRADA')) {
      return 'SUCESSO';
    }

    if (valor.includes('URGENTE') || valor.includes('VENCIDA')) {
      return 'CRITICO';
    }

    return 'INFO';
  }

  private moduloRotulo(modulo: AuditoriaModulo) {
    const mapa: Record<AuditoriaModulo, string> = {
      USUARIOS: 'Usuários',
      FINANCEIRO: 'Financeiro',
      COMUNICACAO: 'Comunicação',
      OCORRENCIAS: 'Ocorrências',
      RESERVAS: 'Reservas',
      PORTARIA: 'Portaria',
      ENCOMENDAS: 'Encomendas',
      GOVERNANCA: 'Governança',
    };

    return mapa[modulo];
  }

  private baseAuditoria(params: {
    origem: string;
    origemId: number;
    modulo: AuditoriaModulo;
    entidade: string;
    entidadeId?: number | null;
    acao: string;
    titulo: string;
    descricao: string;
    detalhes?: string | null;
    referencia?: string | null;
    nivel?: AuditoriaNivel;
    criadoEm: Date | string;
    usuario?: any;
  }): AuditoriaItem {
    return {
      id: `${params.origem}-${params.origemId}-${params.acao}`,
      origemId: params.origemId,
      modulo: params.modulo,
      moduloRotulo: this.moduloRotulo(params.modulo),
      entidade: params.entidade,
      entidadeId: params.entidadeId ?? params.origemId,
      acao: params.acao,
      titulo: params.titulo,
      descricao: params.descricao,
      detalhes: params.detalhes ?? null,
      referencia: params.referencia ?? null,
      nivel: params.nivel ?? 'INFO',
      criadoEm: new Date(params.criadoEm),
      usuario: this.usuarioAuditoria(params.usuario),
    };
  }

  private mapearAuditoriaFinanceira(item: any): AuditoriaItem {
    const referencia = item.cobrancaCondominial
      ? `Cobrança #${item.cobrancaCondominial.id}`
      : item.lancamentoFinanceiro
        ? `Lançamento #${item.lancamentoFinanceiro.id}`
        : null;

    return this.baseAuditoria({
      origem: 'historico-financeiro',
      origemId: item.id,
      modulo: 'FINANCEIRO',
      entidade: item.entidade ?? 'FINANCEIRO',
      entidadeId: item.cobrancaCondominialId ?? item.lancamentoFinanceiroId ?? item.id,
      acao: item.acao ?? 'AÇÃO_FINANCEIRA',
      titulo: item.descricao ?? 'Movimentação financeira',
      descricao: item.cobrancaCondominial?.descricao ?? item.lancamentoFinanceiro?.descricao ?? item.descricao ?? 'Registro financeiro.',
      detalhes: item.detalhes ?? null,
      referencia,
      nivel: this.nivelPorStatus(item.acao),
      criadoEm: item.criadoEm,
      usuario: item.usuario,
    });
  }

  private mapearAuditoriaUsuario(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'usuario-condominio',
      origemId: item.id,
      modulo: 'USUARIOS',
      entidade: 'USUARIO_CONDOMINIO',
      entidadeId: item.usuarioId,
      acao: item.ativo ? 'ACESSO_ATIVO' : 'ACESSO_INATIVO',
      titulo: `Acesso ${item.ativo ? 'ativo' : 'inativo'}: ${item.usuario?.nome ?? 'Usuário'}`,
      descricao: `Papel no condomínio: ${item.papel}. Principal: ${item.principal ? 'sim' : 'não'}.`,
      referencia: item.usuario?.email ?? null,
      nivel: item.ativo ? 'INFO' : 'ATENCAO',
      criadoEm: item.atualizadoEm ?? item.criadoEm,
      usuario: item.usuario,
    });
  }

  private mapearAuditoriaComunicado(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'comunicado',
      origemId: item.id,
      modulo: 'COMUNICACAO',
      entidade: 'COMUNICADO',
      acao: `COMUNICADO_${item.status}`,
      titulo: item.titulo,
      descricao: item.categoria ? `Categoria: ${item.categoria}` : 'Comunicado administrativo.',
      detalhes: item.prioridade ? `Prioridade: ${item.prioridade}` : null,
      referencia: `Comunicado #${item.id}`,
      nivel: item.prioridade === 'URGENTE' ? 'CRITICO' : item.prioridade === 'IMPORTANTE' ? 'ATENCAO' : 'INFO',
      criadoEm: item.atualizadoEm ?? item.criadoEm,
      usuario: item.criadoPorUsuario,
    });
  }

  private mapearAuditoriaOcorrencia(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'ocorrencia-historico',
      origemId: item.id,
      modulo: 'OCORRENCIAS',
      entidade: 'OCORRENCIA',
      entidadeId: item.ocorrenciaId,
      acao: `STATUS_${item.statusNovo}`,
      titulo: item.ocorrencia?.titulo ?? 'Ocorrência atualizada',
      descricao: `Status alterado de ${item.statusAnterior ?? 'inicial'} para ${item.statusNovo}.`,
      detalhes: item.observacao ?? null,
      referencia: `Ocorrência #${item.ocorrenciaId}`,
      nivel: item.statusNovo === 'CANCELADA' ? 'ATENCAO' : this.nivelPorStatus(item.statusNovo),
      criadoEm: item.criadoEm,
      usuario: item.usuario,
    });
  }

  private mapearAuditoriaReserva(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'reserva',
      origemId: item.id,
      modulo: 'RESERVAS',
      entidade: 'RESERVA_AREA_COMUM',
      acao: `RESERVA_${item.status}`,
      titulo: item.titulo ?? item.areaComum?.nome ?? 'Reserva de área comum',
      descricao: `Área: ${item.areaComum?.nome ?? '—'}${item.morador?.nome ? ` • Morador: ${item.morador.nome}` : ''}`,
      detalhes: item.motivoRecusa ?? item.observacoes ?? null,
      referencia: item.unidade ? `Unidade ${item.unidade.identificador ?? item.unidade.numero}` : `Reserva #${item.id}`,
      nivel: this.nivelPorStatus(item.status),
      criadoEm: item.atualizadoEm ?? item.criadoEm,
      usuario: item.aprovadoPorUsuario ?? item.criadoPorUsuario,
    });
  }

  private mapearAuditoriaVisitante(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'autorizacao-visitante',
      origemId: item.id,
      modulo: 'PORTARIA',
      entidade: 'AUTORIZACAO_VISITANTE',
      acao: `VISITANTE_${item.status}`,
      titulo: item.visitante?.nome ?? 'Autorização de visitante',
      descricao: `Autorização para ${item.unidade?.identificador ?? item.unidade?.numero ?? 'unidade'}.`,
      detalhes: item.observacoes ?? null,
      referencia: item.morador?.nome ?? `Autorização #${item.id}`,
      nivel: this.nivelPorStatus(item.status),
      criadoEm: item.atualizadoEm ?? item.criadoEm,
      usuario: item.criadoPorUsuario,
    });
  }

  private mapearAuditoriaRegistroVisitante(item: any): AuditoriaItem[] {
    const eventos: AuditoriaItem[] = [
      this.baseAuditoria({
        origem: 'registro-visitante-entrada',
        origemId: item.id,
        modulo: 'PORTARIA',
        entidade: 'REGISTRO_ACESSO_VISITANTE',
        acao: 'ENTRADA_VISITANTE',
        titulo: item.visitante?.nome ?? 'Entrada de visitante',
        descricao: `Entrada registrada para ${item.unidade?.identificador ?? item.unidade?.numero ?? 'unidade'}.`,
        detalhes: item.observacoesEntrada ?? null,
        referencia: `Registro #${item.id}`,
        nivel: 'INFO',
        criadoEm: item.entradaEm,
        usuario: item.entradaRegistradaPor,
      }),
    ];

    if (item.saidaEm) {
      eventos.push(
        this.baseAuditoria({
          origem: 'registro-visitante-saida',
          origemId: item.id,
          modulo: 'PORTARIA',
          entidade: 'REGISTRO_ACESSO_VISITANTE',
          acao: 'SAIDA_VISITANTE',
          titulo: item.visitante?.nome ?? 'Saída de visitante',
          descricao: `Saída registrada para ${item.unidade?.identificador ?? item.unidade?.numero ?? 'unidade'}.`,
          detalhes: item.observacoesSaida ?? null,
          referencia: `Registro #${item.id}`,
          nivel: 'SUCESSO',
          criadoEm: item.saidaEm,
          usuario: item.saidaRegistradaPor,
        }),
      );
    }

    return eventos;
  }

  private mapearAuditoriaEncomenda(item: any): AuditoriaItem {
    const usuario = item.status === 'RETIRADA'
      ? item.retiradoPorUsuario
      : item.status === 'DEVOLVIDA'
        ? item.devolvidoPorUsuario
        : item.recebidoPorUsuario;

    return this.baseAuditoria({
      origem: 'encomenda',
      origemId: item.id,
      modulo: 'ENCOMENDAS',
      entidade: 'ENCOMENDA_PORTARIA',
      acao: `ENCOMENDA_${item.status}`,
      titulo: item.descricao,
      descricao: `Destinatário: ${item.destinatarioNome ?? item.morador?.nome ?? '—'} • Unidade ${item.unidade?.identificador ?? item.unidade?.numero ?? '—'}`,
      detalhes: item.motivoDevolucao ?? item.observacoesRetirada ?? item.observacoes ?? null,
      referencia: item.codigoRastreio ?? `Encomenda #${item.id}`,
      nivel: this.nivelPorStatus(item.status),
      criadoEm: item.atualizadoEm ?? item.recebidoEm ?? item.criadoEm,
      usuario,
    });
  }

  private mapearAuditoriaAssembleia(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'assembleia',
      origemId: item.id,
      modulo: 'GOVERNANCA',
      entidade: 'ASSEMBLEIA',
      acao: `ASSEMBLEIA_${item.status}`,
      titulo: item.titulo,
      descricao: `Modalidade: ${item.modalidade}.`,
      detalhes: item.motivoCancelamento ?? null,
      referencia: `Assembleia #${item.id}`,
      nivel: this.nivelPorStatus(item.status),
      criadoEm: item.atualizadoEm ?? item.criadoEm,
      usuario: item.criadoPorUsuario,
    });
  }

  private mapearAuditoriaVotacao(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'votacao',
      origemId: item.id,
      modulo: 'GOVERNANCA',
      entidade: 'VOTACAO_ASSEMBLEIA',
      acao: `VOTACAO_${item.status}`,
      titulo: item.titulo,
      descricao: item.assembleia?.titulo ? `Assembleia: ${item.assembleia.titulo}` : 'Votação condominial.',
      detalhes: item.motivoCancelamento ?? null,
      referencia: `Votação #${item.id}`,
      nivel: this.nivelPorStatus(item.status),
      criadoEm: item.atualizadoEm ?? item.criadoEm,
      usuario: item.criadoPorUsuario,
    });
  }

  private mapearAuditoriaVoto(item: any): AuditoriaItem {
    return this.baseAuditoria({
      origem: 'voto',
      origemId: item.id,
      modulo: 'GOVERNANCA',
      entidade: 'VOTO_ASSEMBLEIA',
      entidadeId: item.votacaoId,
      acao: 'VOTO_REGISTRADO',
      titulo: item.votacao?.titulo ?? 'Voto registrado',
      descricao: `Voto registrado para ${item.unidade?.identificador ?? item.unidade?.numero ?? 'unidade'}.`,
      detalhes: item.observacoes ?? null,
      referencia: `Voto #${item.id}`,
      nivel: 'SUCESSO',
      criadoEm: item.registradoEm ?? item.criadoEm,
      usuario: item.registradoPorUsuario,
    });
  }

  private filtrarAuditoriaPorBusca(item: AuditoriaItem, busca: string | null) {
    if (!busca) {
      return true;
    }

    const texto = [
      item.moduloRotulo,
      item.acao,
      item.titulo,
      item.descricao,
      item.detalhes,
      item.referencia,
      item.usuario?.nome,
      item.usuario?.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR');

    return texto.includes(busca);
  }

  private resumirAuditoriaPorModulo(itens: AuditoriaItem[]) {
    const totais = new Map<AuditoriaModulo, number>();

    for (const item of itens) {
      totais.set(item.modulo, (totais.get(item.modulo) ?? 0) + 1);
    }

    return Array.from(totais.entries())
      .map(([modulo, total]) => ({ modulo, rotulo: this.moduloRotulo(modulo), total }))
      .sort((a, b) => b.total - a.total);
  }

  private resumirAuditoriaPorNivel(itens: AuditoriaItem[]) {
    const niveis: AuditoriaNivel[] = ['CRITICO', 'ATENCAO', 'SUCESSO', 'INFO'];

    return niveis.map((nivel) => ({
      nivel,
      total: itens.filter((item) => item.nivel === nivel).length,
    }));
  }




  private normalizarBuscaFiltro(filtros: ListagemFiltros) {
    return this.normalizarOpcional(filtros.q ?? filtros.busca)?.toLocaleLowerCase('pt-BR') ?? null;
  }

  private normalizarPaginacao(filtros: ListagemFiltros): Paginacao | null {
    const pageBruta = filtros.page ? Number(filtros.page) : null;
    const limitBruto = filtros.limit ? Number(filtros.limit) : null;

    if (!pageBruta && !limitBruto) {
      return null;
    }

    const page = Number.isInteger(pageBruta) && pageBruta! > 0 ? pageBruta! : 1;
    const limitBase = Number.isInteger(limitBruto) && limitBruto! > 0 ? limitBruto! : 20;
    const limit = Math.min(Math.max(limitBase, 1), 100);

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  private respostaPaginada<T>(
    items: T[],
    total: number,
    paginacao: Paginacao,
  ): ListagemPaginada<T> {
    return {
      items,
      total,
      page: paginacao.page,
      limit: paginacao.limit,
      totalPages: Math.max(1, Math.ceil(total / paginacao.limit)),
    };
  }

  private montarFiltroDocumentos(
    condominioId: number,
    filtros: ListagemFiltros,
  ): Prisma.DocumentoCondominioWhereInput {
    const busca = this.normalizarBuscaFiltro(filtros);
    const categoria = this.normalizarOpcional(filtros.categoria);
    const status = this.normalizarStatusDocumentoFiltro(filtros.status);

    return {
      condominioId,
      ...(status ? { status } : {}),
      ...(categoria ? { categoria: { contains: categoria } } : {}),
      ...(busca
        ? {
            OR: [
              { titulo: { contains: busca } },
              { categoria: { contains: busca } },
              { descricao: { contains: busca } },
              { url: { contains: busca } },
            ],
          }
        : {}),
    };
  }

  private normalizarStatusDocumentoFiltro(valor: unknown) {
    if (
      valor === StatusDocumentoCondominio.RASCUNHO ||
      valor === StatusDocumentoCondominio.PUBLICADO ||
      valor === StatusDocumentoCondominio.ARQUIVADO
    ) {
      return valor;
    }

    return null;
  }

  private montarFiltroManutencoes(
    condominioId: number,
    filtros: ListagemFiltros,
  ): Prisma.OrdemServicoWhereInput {
    const busca = this.normalizarBuscaFiltro(filtros);
    const status = this.normalizarStatusManutencaoFiltro(filtros.status);
    const prioridade = this.normalizarPrioridadeManutencaoFiltro(filtros.prioridade);
    const dataInicio = this.criarDataFiltro(filtros.dataInicio ?? filtros.inicio, 'inicio');
    const dataFim = this.criarDataFiltro(filtros.dataFim ?? filtros.fim, 'fim');
    const intervalo = this.montarIntervaloData(dataInicio, dataFim);

    return {
      condominioId,
      ...(status ? { status } : {}),
      ...(prioridade ? { prioridade } : {}),
      ...(intervalo
        ? {
            OR: [
              { agendadaPara: intervalo },
              { criadoEm: intervalo },
              { atualizadoEm: intervalo },
            ],
          }
        : {}),
      ...(busca
        ? {
            AND: [
              {
                OR: [
                  { titulo: { contains: busca } },
                  { descricao: { contains: busca } },
                  { categoria: { contains: busca } },
                  { observacoes: { contains: busca } },
                ],
              },
            ],
          }
        : {}),
    };
  }

  private normalizarStatusManutencaoFiltro(valor: unknown) {
    if (!valor || valor === 'TODOS') {
      return null;
    }

    if (valor === 'EM_ANDAMENTO') {
      return StatusOrdemServico.EM_EXECUCAO;
    }

    if (
      valor === StatusOrdemServico.ABERTA ||
      valor === StatusOrdemServico.AGENDADA ||
      valor === StatusOrdemServico.EM_EXECUCAO ||
      valor === StatusOrdemServico.CONCLUIDA ||
      valor === StatusOrdemServico.CANCELADA
    ) {
      return valor;
    }

    return null;
  }

  private normalizarPrioridadeManutencaoFiltro(valor: unknown) {
    if (!valor || valor === 'TODAS') {
      return null;
    }

    if (
      valor === PrioridadeOrdemServico.BAIXA ||
      valor === PrioridadeOrdemServico.MEDIA ||
      valor === PrioridadeOrdemServico.ALTA ||
      valor === PrioridadeOrdemServico.URGENTE
    ) {
      return valor;
    }

    return null;
  }

  private montarFiltroContratos(
    condominioId: number,
    filtros: ListagemFiltros,
  ): Prisma.ContratoCondominioWhereInput {
    const busca = this.normalizarBuscaFiltro(filtros);
    const categoria = this.normalizarOpcional(filtros.categoria);
    const status = this.normalizarStatusContratoFiltro(filtros.status);

    return {
      condominioId,
      ...(status ? { status } : {}),
      ...(categoria ? { categoria: { contains: categoria } } : {}),
      ...(busca
        ? {
            OR: [
              { titulo: { contains: busca } },
              { categoria: { contains: busca } },
              { descricao: { contains: busca } },
              { numeroContrato: { contains: busca } },
              { observacoes: { contains: busca } },
            ],
          }
        : {}),
    };
  }

  private normalizarStatusContratoFiltro(valor: unknown) {
    if (!valor || valor === 'TODOS') {
      return null;
    }

    if (
      valor === StatusContratoCondominio.ATIVO ||
      valor === StatusContratoCondominio.ENCERRADO ||
      valor === StatusContratoCondominio.CANCELADO
    ) {
      return valor;
    }

    return null;
  }

  private includeDocumentoCondominio() {
    return {
      criadoPorUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
    };
  }

  private async garantirDocumento(condominioId: number, documentoId: number) {
    const documento = await this.prisma.documentoCondominio.findFirst({
      where: {
        id: documentoId,
        condominioId,
      },
      select: {
        id: true,
      },
    });

    if (!documento) {
      throw new NotFoundException('Documento não encontrado.');
    }

    return documento;
  }

  private normalizarCampoDocumento(valor: unknown): string | null {
    if (typeof valor !== 'string') {
      return null;
    }

    const normalizado = valor.trim();
    return normalizado ? normalizado : null;
  }

  private booleanoDocumento(valor: unknown, padrao: boolean) {
    if (typeof valor === 'boolean') {
      return valor;
    }

    if (typeof valor === 'string') {
      return ['true', '1', 'sim', 'on'].includes(valor.toLowerCase());
    }

    return padrao;
  }

  private selectConfiguracoesPortalCondominio() {
    return {
      id: true,
      nome: true,
      slug: true,
      email: true,
      telefone: true,
      nomeExibicaoPortal: true,
      logoUrl: true,
      mensagemBoasVindasPortal: true,
      instrucoesGeraisPortal: true,
      contatosUteisPortal: true,
      instrucoesVisitantes: true,
      instrucoesEncomendas: true,
      politicaReservas: true,
      assinaturaComunicados: true,
      pixChave: true,
      pixTipo: true,
      beneficiarioPagamento: true,
      bancoPagamento: true,
      instrucoesPagamento: true,
      mensagemCobrancaPadrao: true,
      atualizadoEm: true,
    };
  }



  private includeContratoCondominio() {
    return {
      prestador: {
        select: {
          id: true,
          nome: true,
          empresa: true,
          tipoServico: true,
          telefone: true,
          ativo: true,
        },
      },
      criadoPorUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
    };
  }

  private async garantirContrato(condominioId: number, contratoId: number) {
    const contrato = await this.prisma.contratoCondominio.findFirst({
      where: {
        id: contratoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado.');
    }

    return contrato;
  }

  private async montarDadosContrato(
    condominioId: number,
    dto: ContratoPayload,
  ) {
    const titulo = this.normalizarCampoContrato(dto.titulo);
    const inicioEm = this.normalizarDataContrato(dto.inicioEm, 'início');
    const fimEm = this.normalizarDataContratoOpcional(dto.fimEm, 'vencimento');
    const prestadorId = this.normalizarIdContrato(dto.prestadorId);

    if (!titulo) {
      throw new BadRequestException('O título do contrato é obrigatório.');
    }

    if (fimEm && fimEm < inicioEm) {
      throw new BadRequestException('A data de vencimento não pode ser anterior ao início.');
    }

    if (prestadorId) {
      const prestador = await this.prisma.prestadorServico.findFirst({
        where: {
          id: prestadorId,
          condominioId,
        },
        select: {
          id: true,
        },
      });

      if (!prestador) {
        throw new NotFoundException('Prestador não encontrado.');
      }
    }

    return {
      titulo,
      categoria: this.normalizarCampoContrato(dto.categoria),
      descricao: this.normalizarCampoContrato(dto.descricao),
      numeroContrato: this.normalizarCampoContrato(dto.numeroContrato),
      valorMensal: this.normalizarValorContrato(dto.valorMensal),
      prestadorId,
      inicioEm,
      fimEm,
      renovacaoAutomatica: Boolean(dto.renovacaoAutomatica),
      observacoes: this.normalizarCampoContrato(dto.observacoes),
      arquivoUrl: this.normalizarCampoContrato(dto.arquivoUrl),
    };
  }

  private normalizarCampoContrato(valor: unknown) {
    if (typeof valor !== 'string') {
      return null;
    }

    const texto = valor.trim();

    return texto || null;
  }

  private normalizarIdContrato(valor: unknown) {
    if (valor === undefined || valor === null || valor === '') {
      return null;
    }

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
      return null;
    }

    return numero;
  }

  private normalizarValorContrato(valor: unknown) {
    if (valor === undefined || valor === null || valor === '') {
      return null;
    }

    const numero = Number(String(valor).replace(',', '.'));

    if (!Number.isFinite(numero) || numero < 0) {
      throw new BadRequestException('Informe um valor mensal válido para o contrato.');
    }

    return numero;
  }

  private normalizarDataContrato(valor: unknown, campo: string) {
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new BadRequestException(`Informe a data de ${campo} do contrato.`);
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException(`Informe uma data válida para ${campo}.`);
    }

    return data;
  }

  private normalizarDataContratoOpcional(valor: unknown, campo: string) {
    if (valor === undefined || valor === null || valor === '') {
      return null;
    }

    if (typeof valor !== 'string') {
      return null;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException(`Informe uma data válida para ${campo}.`);
    }

    return data;
  }

  private normalizarStatusContrato(valor: unknown) {
    if (
      valor === StatusContratoCondominio.ATIVO ||
      valor === StatusContratoCondominio.ENCERRADO ||
      valor === StatusContratoCondominio.CANCELADO
    ) {
      return valor;
    }

    throw new BadRequestException('Status do contrato inválido.');
  }

  private includeManutencao() {
    return {
      prestador: {
        select: {
          id: true,
          nome: true,
          empresa: true,
          tipoServico: true,
          telefone: true,
          ativo: true,
        },
      },
      unidade: {
        select: {
          id: true,
          identificador: true,
          numero: true,
        },
      },
      ocorrencia: {
        select: {
          id: true,
          titulo: true,
          status: true,
          prioridade: true,
        },
      },
      criadoPorUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      historicoStatus: {
        orderBy: {
          criadoEm: 'desc' as const,
        },
        take: 5,
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      },
    };
  }

  private async garantirManutencao(condominioId: number, ordemId: number) {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: {
        id: ordemId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        iniciadaEm: true,
      },
    });

    if (!ordem) {
      throw new NotFoundException('Ordem de manutenção não encontrada.');
    }

    return ordem;
  }

  private normalizarCampoManutencao(valor: unknown) {
    if (typeof valor !== 'string') {
      return null;
    }

    const texto = valor.trim();

    return texto || null;
  }

  private normalizarIdManutencao(valor: unknown) {
    if (valor === undefined || valor === null || valor === '') {
      return null;
    }

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
      return null;
    }

    return numero;
  }

  private normalizarDataManutencao(valor: unknown) {
    if (typeof valor !== 'string' || !valor.trim()) {
      return null;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException('Informe uma data válida para a manutenção.');
    }

    return data;
  }

  private normalizarPrioridadeManutencao(valor: unknown) {
    if (
      valor === PrioridadeOrdemServico.BAIXA ||
      valor === PrioridadeOrdemServico.MEDIA ||
      valor === PrioridadeOrdemServico.ALTA ||
      valor === PrioridadeOrdemServico.URGENTE
    ) {
      return valor;
    }

    return PrioridadeOrdemServico.MEDIA;
  }

  private normalizarStatusManutencao(valor: unknown) {
    if (valor === 'EM_ANDAMENTO') {
      return StatusOrdemServico.EM_EXECUCAO;
    }

    if (
      valor === StatusOrdemServico.ABERTA ||
      valor === StatusOrdemServico.AGENDADA ||
      valor === StatusOrdemServico.EM_EXECUCAO ||
      valor === StatusOrdemServico.CONCLUIDA ||
      valor === StatusOrdemServico.CANCELADA
    ) {
      return valor;
    }

    throw new BadRequestException('Status da manutenção inválido.');
  }

  private async validarRelacionamentosManutencao(
    condominioId: number,
    prestadorId: number | null,
    unidadeId: number | null,
    ocorrenciaId: number | null,
  ) {
    if (prestadorId) {
      const prestador = await this.prisma.prestadorServico.findFirst({
        where: {
          id: prestadorId,
          condominioId,
        },
        select: {
          id: true,
        },
      });

      if (!prestador) {
        throw new NotFoundException('Prestador não encontrado.');
      }
    }

    if (unidadeId) {
      const unidade = await this.prisma.unidade.findFirst({
        where: {
          id: unidadeId,
          condominioId,
        },
        select: {
          id: true,
        },
      });

      if (!unidade) {
        throw new NotFoundException('Unidade não encontrada.');
      }
    }

    if (ocorrenciaId) {
      const ocorrencia = await this.prisma.ocorrencia.findFirst({
        where: {
          id: ocorrenciaId,
          condominioId,
        },
        select: {
          id: true,
        },
      });

      if (!ocorrencia) {
        throw new NotFoundException('Ocorrência não encontrada.');
      }
    }
  }
  private selectConfiguracoesCondominio() {
    return {
      id: true,
      nome: true,
      slug: true,
      cnpj: true,
      email: true,
      telefone: true,
      cep: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
      ativo: true,
      nomeExibicaoPortal: true,
      logoUrl: true,
      mensagemBoasVindasPortal: true,
      instrucoesGeraisPortal: true,
      contatosUteisPortal: true,
      prazoPadraoCobrancaDias: true,
      instrucoesVisitantes: true,
      instrucoesEncomendas: true,
      politicaReservas: true,
      assinaturaComunicados: true,
      pixChave: true,
      pixTipo: true,
      beneficiarioPagamento: true,
      bancoPagamento: true,
      instrucoesPagamento: true,
      mensagemCobrancaPadrao: true,
      atualizadoEm: true,
    };
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }

  private gerarSlugBase(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async gerarSlugUnico(nome: string): Promise<string> {
    const base = this.gerarSlugBase(nome) || 'condominio';

    let slug = base;
    let contador = 2;

    while (
      await this.prisma.condominio.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      slug = `${base}-${contador}`;
      contador += 1;
    }

    return slug;
  }
}
