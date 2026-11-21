import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  PapelCondominio,
  Prisma,
  StatusAssembleia,
  StatusCobrancaCondominial,
  StatusComunicado,
  StatusEncomendaPortaria,
  StatusLancamentoFinanceiro,
  StatusOcorrencia,
  StatusReservaAreaComum,
  StatusVotacaoAssembleia,
  TipoCategoriaFinanceira,
  TipoLancamentoFinanceiro,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CancelarCobrancaDto } from "./dto/cancelar-cobranca.dto";
import { CreateCobrancaDto } from "./dto/create-cobranca.dto";
import { CreateCobrancasLoteDto } from "./dto/create-cobrancas-lote.dto";
import { PagarCobrancaDto } from "./dto/pagar-cobranca.dto";
import { UpdateCobrancaDto } from "./dto/update-cobranca.dto";

type NotificacaoPortalPersistente = {
  id: string;
  tipo:
    | "COBRANCAS"
    | "COMUNICADOS"
    | "RESERVAS"
    | "OCORRENCIAS"
    | "ENCOMENDAS"
    | "VOTACOES"
    | "ASSEMBLEIAS";
  label: string;
  descricao: string;
  valor: number;
  to: string;
  prioridade: "ALTA" | "MEDIA" | "NORMAL";
  criadoEm: Date | null;
  atualizadoEm: Date | null;
};

type MoradorNotificacoesPortal = {
  id: number;
  unidadeIds: number[];
};

type PreferenciasNotificacoesPortal = Record<
  NotificacaoPortalPersistente["tipo"],
  boolean
>;

const TIPOS_NOTIFICACAO_PORTAL: Array<
  NotificacaoPortalPersistente["tipo"]
> = [
  "COBRANCAS",
  "COMUNICADOS",
  "RESERVAS",
  "OCORRENCIAS",
  "ENCOMENDAS",
  "VOTACOES",
  "ASSEMBLEIAS",
];

@Injectable()
export class CobrancasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    condominioId: number,
    dto: CreateCobrancaDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);
    await this.garantirUnidade(condominioId, dto.unidadeId);

    if (dto.moradorId) {
      await this.garantirMorador(condominioId, dto.moradorId);
      await this.garantirVinculoMoradorUnidade(dto.moradorId, dto.unidadeId);
    }

    if (dto.categoriaId) {
      await this.garantirCategoriaReceita(condominioId, dto.categoriaId);
    }

    const valorNumero = Number(dto.valor);

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      throw new BadRequestException(
        "O valor da cobrança deve ser maior que zero.",
      );
    }

    const competenciaEm = new Date(dto.competenciaEm);
    const vencimentoEm = new Date(dto.vencimentoEm);

    if (vencimentoEm < competenciaEm) {
      throw new BadRequestException(
        "O vencimento não pode ser anterior à competência.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const lancamento = await tx.lancamentoFinanceiro.create({
        data: {
          condominioId,
          categoriaId: dto.categoriaId ?? null,
          criadoPorUsuarioId: usuario.id,
          tipo: TipoLancamentoFinanceiro.RECEITA,
          status: StatusLancamentoFinanceiro.PENDENTE,
          descricao: dto.descricao.trim(),
          valor: new Prisma.Decimal(dto.valor),
          competenciaEm,
          vencimentoEm,
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
      });

      return tx.cobrancaCondominial.create({
        data: {
          condominioId,
          unidadeId: dto.unidadeId,
          moradorId: dto.moradorId ?? null,
          lancamentoFinanceiroId: lancamento.id,
          criadoPorUsuarioId: usuario.id,
          descricao: dto.descricao.trim(),
          valor: new Prisma.Decimal(dto.valor),
          competenciaEm,
          vencimentoEm,
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
        include: {
          unidade: {
            select: {
              id: true,
              identificador: true,
              numero: true,
            },
          },
          morador: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
          lancamentoFinanceiro: {
            select: {
              id: true,
              tipo: true,
              status: true,
              valor: true,
              categoriaId: true,
              categoria: {
                select: {
                  id: true,
                  nome: true,
                  tipo: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async createLote(
    condominioId: number,
    dto: CreateCobrancasLoteDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    if (dto.categoriaId) {
      await this.garantirCategoriaReceita(condominioId, dto.categoriaId);
    }

    const valorNumero = Number(dto.valor);

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      throw new BadRequestException(
        "O valor da cobrança deve ser maior que zero.",
      );
    }

    const competenciaEm = new Date(dto.competenciaEm);
    const vencimentoEm = new Date(dto.vencimentoEm);

    if (vencimentoEm < competenciaEm) {
      throw new BadRequestException(
        "O vencimento não pode ser anterior à competência.",
      );
    }

    const descricao = dto.descricao.trim();
    const observacoes = this.normalizarOpcional(dto.observacoes);

    const unidadesAtivas = await this.prisma.unidade.findMany({
      where: {
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
        moradores: {
          where: {
            ativo: true,
            principal: true,
            morador: {
              ativo: true,
            },
          },
          select: {
            moradorId: true,
          },
          take: 1,
        },
      },
      orderBy: {
        identificador: "asc",
      },
    });

    if (unidadesAtivas.length === 0) {
      throw new BadRequestException(
        "Não existem unidades ativas para gerar cobranças.",
      );
    }

    const unidadeIds = unidadesAtivas.map((unidade) => unidade.id);

    const cobrancasJaExistentes =
      await this.prisma.cobrancaCondominial.findMany({
        where: {
          condominioId,
          unidadeId: {
            in: unidadeIds,
          },
          descricao,
          competenciaEm,
        },
        select: {
          unidadeId: true,
        },
      });

    const unidadesComCobrancaExistente = new Set(
      cobrancasJaExistentes.map((cobranca) => cobranca.unidadeId),
    );

    const unidadesParaCriar = unidadesAtivas.filter(
      (unidade) => !unidadesComCobrancaExistente.has(unidade.id),
    );

    if (unidadesParaCriar.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        for (const unidade of unidadesParaCriar) {
          const lancamento = await tx.lancamentoFinanceiro.create({
            data: {
              condominioId,
              categoriaId: dto.categoriaId ?? null,
              criadoPorUsuarioId: usuario.id,
              tipo: TipoLancamentoFinanceiro.RECEITA,
              status: StatusLancamentoFinanceiro.PENDENTE,
              descricao,
              valor: new Prisma.Decimal(dto.valor),
              competenciaEm,
              vencimentoEm,
              observacoes,
            },
          });

          await tx.cobrancaCondominial.create({
            data: {
              condominioId,
              unidadeId: unidade.id,
              moradorId: unidade.moradores[0]?.moradorId ?? null,
              lancamentoFinanceiroId: lancamento.id,
              criadoPorUsuarioId: usuario.id,
              descricao,
              valor: new Prisma.Decimal(dto.valor),
              competenciaEm,
              vencimentoEm,
              observacoes,
            },
          });
        }
      });
    }

    return {
      totalUnidadesAtivas: unidadesAtivas.length,
      criadas: unidadesParaCriar.length,
      ignoradasDuplicidade: unidadesComCobrancaExistente.size,
    };
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.cobrancaCondominial.findMany({
      where: {
        condominioId,
      },
      include: {
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
        morador: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
          },
        },
        lancamentoFinanceiro: {
          select: {
            id: true,
            status: true,
            tipo: true,
            valor: true,
            categoriaId: true,
            categoria: {
              select: {
                id: true,
                nome: true,
                tipo: true,
              },
            },
          },
        },
        criadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        pagoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        canceladoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: {
        vencimentoEm: "desc",
      },
    });
  }

  async findOne(condominioId: number, cobrancaId: number) {
    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      include: {
        unidade: true,
        morador: true,
        lancamentoFinanceiro: {
          include: {
            categoria: {
              select: {
                id: true,
                nome: true,
                tipo: true,
              },
            },
          },
        },
        criadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        pagoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        canceladoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    return cobranca;
  }

  async update(
    condominioId: number,
    cobrancaId: number,
    dto: UpdateCobrancaDto,
  ) {
    await this.garantirCondominio(condominioId);
    await this.garantirUnidade(condominioId, dto.unidadeId);

    if (dto.moradorId) {
      await this.garantirMorador(condominioId, dto.moradorId);
      await this.garantirVinculoMoradorUnidade(dto.moradorId, dto.unidadeId);
    }

    if (dto.categoriaId) {
      await this.garantirCategoriaReceita(condominioId, dto.categoriaId);
    }

    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        lancamentoFinanceiroId: true,
        lancamentoFinanceiro: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    if (cobranca.status !== StatusCobrancaCondominial.PENDENTE) {
      throw new BadRequestException(
        "Apenas cobranças pendentes podem ser editadas.",
      );
    }

    if (
      cobranca.lancamentoFinanceiro &&
      cobranca.lancamentoFinanceiro.status !==
        StatusLancamentoFinanceiro.PENDENTE
    ) {
      throw new BadRequestException(
        "O lançamento financeiro vinculado não está pendente.",
      );
    }

    const valorNumero = Number(dto.valor);

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      throw new BadRequestException(
        "O valor da cobrança deve ser maior que zero.",
      );
    }

    const competenciaEm = new Date(dto.competenciaEm);
    const vencimentoEm = new Date(dto.vencimentoEm);

    if (vencimentoEm < competenciaEm) {
      throw new BadRequestException(
        "O vencimento não pode ser anterior à competência.",
      );
    }

    const descricao = dto.descricao.trim();
    const observacoes = this.normalizarOpcional(dto.observacoes);

    return this.prisma.$transaction(async (tx) => {
      if (cobranca.lancamentoFinanceiroId) {
        await tx.lancamentoFinanceiro.update({
          where: {
            id: cobranca.lancamentoFinanceiroId,
          },
          data: {
            categoriaId: dto.categoriaId ?? null,
            descricao,
            valor: new Prisma.Decimal(dto.valor),
            competenciaEm,
            vencimentoEm,
            observacoes,
          },
        });
      }

      return tx.cobrancaCondominial.update({
        where: {
          id: cobranca.id,
        },
        data: {
          unidadeId: dto.unidadeId,
          moradorId: dto.moradorId ?? null,
          descricao,
          valor: new Prisma.Decimal(dto.valor),
          competenciaEm,
          vencimentoEm,
          observacoes,
        },
        include: {
          unidade: {
            select: {
              id: true,
              identificador: true,
              numero: true,
            },
          },
          morador: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
            },
          },
          lancamentoFinanceiro: {
            select: {
              id: true,
              tipo: true,
              status: true,
              valor: true,
              categoriaId: true,
              categoria: {
                select: {
                  id: true,
                  nome: true,
                  tipo: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async pagar(
    condominioId: number,
    cobrancaId: number,
    dto: PagarCobrancaDto,
    usuario: AuthenticatedUser,
  ) {
    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      include: {
        lancamentoFinanceiro: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    if (cobranca.status !== StatusCobrancaCondominial.PENDENTE) {
      throw new BadRequestException(
        "Apenas cobranças pendentes podem ser pagas.",
      );
    }

    // Se a cobrança ainda está pendente, a baixa deve prevalecer.
    // Isso também corrige cobranças pendentes cujo lançamento financeiro vinculado
    // tenha ficado cancelado por uma inconsistência operacional anterior.
    const pagoEm = dto.pagoEm ? new Date(dto.pagoEm) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.cobrancaCondominial.update({
        where: {
          id: cobranca.id,
        },
        data: {
          status: StatusCobrancaCondominial.PAGO,
          pagoEm,
          pagoPorUsuarioId: usuario.id,
        },
      });

      if (cobranca.lancamentoFinanceiroId) {
        await tx.lancamentoFinanceiro.update({
          where: {
            id: cobranca.lancamentoFinanceiroId,
          },
          data: {
            status: StatusLancamentoFinanceiro.PAGO,
            pagoEm,
            pagoPorUsuarioId: usuario.id,
            canceladoEm: null,
            canceladoPorUsuarioId: null,
            motivoCancelamento: null,
          },
        });
      }

      await this.registrarHistoricoFinanceiro(
        {
          condominioId,
          usuarioId: usuario.id,
          cobrancaCondominialId: cobranca.id,
          lancamentoFinanceiroId: cobranca.lancamentoFinanceiroId,
          acao: "PAGAMENTO_COBRANCA",
          entidade: "COBRANCA",
          descricao: "Cobrança marcada como paga.",
        },
        tx,
      );

      return atualizada;
    });
  }

  async estornarPagamento(
    condominioId: number,
    cobrancaId: number,
    usuario: AuthenticatedUser,
  ) {
    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        lancamentoFinanceiroId: true,
        lancamentoFinanceiro: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    if (cobranca.status !== StatusCobrancaCondominial.PAGO) {
      throw new BadRequestException(
        "Apenas cobranças pagas podem ter o pagamento desfeito.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.cobrancaCondominial.update({
        where: {
          id: cobranca.id,
        },
        data: {
          status: StatusCobrancaCondominial.PENDENTE,
          pagoEm: null,
          pagoPorUsuarioId: null,
        },
      });

      if (cobranca.lancamentoFinanceiroId) {
        await tx.lancamentoFinanceiro.update({
          where: {
            id: cobranca.lancamentoFinanceiroId,
          },
          data: {
            status: StatusLancamentoFinanceiro.PENDENTE,
            pagoEm: null,
            pagoPorUsuarioId: null,
            canceladoEm: null,
            canceladoPorUsuarioId: null,
            motivoCancelamento: null,
          },
        });
      }

      await this.registrarHistoricoFinanceiro(
        {
          condominioId,
          usuarioId: usuario.id,
          cobrancaCondominialId: cobranca.id,
          lancamentoFinanceiroId: cobranca.lancamentoFinanceiroId,
          acao: "ESTORNO_PAGAMENTO_COBRANCA",
          entidade: "COBRANCA",
          descricao: "Pagamento da cobrança desfeito.",
        },
        tx,
      );

      return atualizada;
    });
  }

  async cancelar(
    condominioId: number,
    cobrancaId: number,
    dto: CancelarCobrancaDto,
    usuario: AuthenticatedUser,
  ) {
    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        lancamentoFinanceiroId: true,
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    if (cobranca.status === StatusCobrancaCondominial.CANCELADA) {
      throw new BadRequestException("Esta cobrança já está cancelada.");
    }

    if (cobranca.status === StatusCobrancaCondominial.PAGO) {
      throw new BadRequestException(
        "Uma cobrança paga não pode ser cancelada diretamente.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.cobrancaCondominial.update({
        where: {
          id: cobranca.id,
        },
        data: {
          status: StatusCobrancaCondominial.CANCELADA,
          canceladoEm: new Date(),
          canceladoPorUsuarioId: usuario.id,
          motivoCancelamento: dto.motivoCancelamento.trim(),
        },
      });

      if (cobranca.lancamentoFinanceiroId) {
        await tx.lancamentoFinanceiro.update({
          where: {
            id: cobranca.lancamentoFinanceiroId,
          },
          data: {
            status: StatusLancamentoFinanceiro.CANCELADO,
            canceladoEm: new Date(),
            canceladoPorUsuarioId: usuario.id,
            motivoCancelamento: dto.motivoCancelamento.trim(),
          },
        });
      }

      await this.registrarHistoricoFinanceiro(
        {
          condominioId,
          usuarioId: usuario.id,
          cobrancaCondominialId: cobranca.id,
          lancamentoFinanceiroId: cobranca.lancamentoFinanceiroId,
          acao: "CANCELAMENTO_COBRANCA",
          entidade: "COBRANCA",
          descricao: "Cobrança cancelada.",
          detalhes: dto.motivoCancelamento.trim(),
        },
        tx,
      );

      return atualizada;
    });
  }

  async resumoPorPeriodo(condominioId: number, inicio: string, fim: string) {
    await this.garantirCondominio(condominioId);

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);

    if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(fimDate.getTime())) {
      throw new BadRequestException(
        "Os parâmetros inicio e fim devem ser datas válidas.",
      );
    }

    if (fimDate < inicioDate) {
      throw new BadRequestException(
        "A data final deve ser posterior ou igual à data inicial.",
      );
    }

    const grupos = await this.prisma.cobrancaCondominial.groupBy({
      by: ["status"],
      where: {
        condominioId,
        competenciaEm: {
          gte: inicioDate,
          lte: fimDate,
        },
      },
      _sum: {
        valor: true,
      },
      _count: {
        _all: true,
      },
    });

    const agora = new Date();

    const filtroVencidasPendentes = {
      condominioId,
      status: StatusCobrancaCondominial.PENDENTE,
      vencimentoEm: {
        lt: agora,
      },
    };

    const [somaVencidasPendentes, quantidadeVencidasPendentes] =
      await Promise.all([
        this.prisma.cobrancaCondominial.aggregate({
          where: filtroVencidasPendentes,
          _sum: {
            valor: true,
          },
        }),
        this.prisma.cobrancaCondominial.count({
          where: filtroVencidasPendentes,
        }),
      ]);

    return {
      periodo: {
        inicio,
        fim,
      },
      grupos,
      vencidasPendentes: {
        _sum: {
          valor: somaVencidasPendentes._sum.valor,
        },
        _count: {
          _all: quantidadeVencidasPendentes,
        },
      },
    };
  }

  async preferenciasNotificacoesPortal(
    condominioId: number,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const morador = await this.obterMoradorNotificacoesPortal(
      condominioId,
      usuario,
    );

    const preferencias = await this.buscarPreferenciasNotificacoesPortal(
      condominioId,
      usuario.id,
      morador.id,
    );

    return {
      preferencias,
    };
  }

  async atualizarPreferenciasNotificacoesPortal(
    condominioId: number,
    dto: { preferencias?: Record<string, boolean> },
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const morador = await this.obterMoradorNotificacoesPortal(
      condominioId,
      usuario,
    );

    const preferenciasAtuais = await this.buscarPreferenciasNotificacoesPortal(
      condominioId,
      usuario.id,
      morador.id,
    );

    const preferencias = {
      ...preferenciasAtuais,
    };

    Object.entries(dto.preferencias ?? {}).forEach(([tipo, ativo]) => {
      if (this.tipoNotificacaoPortalValido(tipo)) {
        preferencias[tipo] = Boolean(ativo);
      }
    });

    await this.salvarPreferenciasNotificacoesPortal(
      condominioId,
      usuario.id,
      morador.id,
      preferencias,
    );

    return {
      preferencias,
    };
  }

  async notificacoesPortal(
    condominioId: number,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const morador = await this.obterMoradorNotificacoesPortal(
      condominioId,
      usuario,
    );

    const itens = await this.montarNotificacoesPortal(condominioId, morador);
    const leituras = await this.buscarNotificacoesLidasPortal(
      condominioId,
      usuario.id,
      morador.id,
    );

    const itensComLeitura = itens.map((item) => ({
      ...item,
      lida: item.valor <= 0 || leituras.has(item.id),
      criadoEm: item.criadoEm?.toISOString() ?? null,
      atualizadoEm: item.atualizadoEm?.toISOString() ?? null,
    }));

    return {
      itens: itensComLeitura,
      totalNaoLidas: itensComLeitura
        .filter((item) => item.valor > 0 && !item.lida)
        .reduce((total, item) => total + item.valor, 0),
    };
  }

  async marcarNotificacaoPortalComoLida(
    condominioId: number,
    notificacaoId: string,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const morador = await this.obterMoradorNotificacoesPortal(
      condominioId,
      usuario,
    );

    await this.registrarLeituraNotificacaoPortal(
      condominioId,
      usuario.id,
      morador.id,
      notificacaoId,
    );

    return {
      ok: true,
    };
  }

  async marcarNotificacoesPortalComoLidas(
    condominioId: number,
    dto: { ids?: string[] },
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const morador = await this.obterMoradorNotificacoesPortal(
      condominioId,
      usuario,
    );

    const ids = Array.from(
      new Set(
        (dto.ids ?? [])
          .map((id) => String(id).trim())
          .filter((id) => id.length > 0),
      ),
    );

    await Promise.all(
      ids.map((id) =>
        this.registrarLeituraNotificacaoPortal(
          condominioId,
          usuario.id,
          morador.id,
          id,
        ),
      ),
    );

    return {
      ok: true,
      total: ids.length,
    };
  }

  private async obterMoradorNotificacoesPortal(
    condominioId: number,
    usuario: AuthenticatedUser,
  ): Promise<MoradorNotificacoesPortal> {
    const morador = await this.prisma.morador.findFirst({
      where: {
        condominioId,
        usuarioId: usuario.id,
        ativo: true,
      },
      select: {
        id: true,
        unidades: {
          where: {
            ativo: true,
          },
          select: {
            unidadeId: true,
          },
        },
      },
    });

    if (!morador) {
      throw new BadRequestException(
        "Nenhum perfil de morador ativo foi encontrado para este condomínio.",
      );
    }

    return {
      id: morador.id,
      unidadeIds: morador.unidades.map((vinculo) => vinculo.unidadeId),
    };
  }

  private preferenciasPadraoNotificacoesPortal(): PreferenciasNotificacoesPortal {
    return TIPOS_NOTIFICACAO_PORTAL.reduce((preferencias, tipo) => {
      preferencias[tipo] = true;
      return preferencias;
    }, {} as PreferenciasNotificacoesPortal);
  }

  private tipoNotificacaoPortalValido(
    tipo: string,
  ): tipo is NotificacaoPortalPersistente["tipo"] {
    return TIPOS_NOTIFICACAO_PORTAL.includes(
      tipo as NotificacaoPortalPersistente["tipo"],
    );
  }

  private async buscarPreferenciasNotificacoesPortal(
    condominioId: number,
    usuarioId: number,
    moradorId: number,
  ): Promise<PreferenciasNotificacoesPortal> {
    const preferencias = this.preferenciasPadraoNotificacoesPortal();

    try {
      const registros = await this.prisma.$queryRaw<
        Array<{ tipo: string; ativo: boolean | number }>
      >(
        Prisma.sql`
          SELECT tipo, ativo
          FROM notificacoes_preferencias
          WHERE condominio_id = ${condominioId}
            AND usuario_id = ${usuarioId}
            AND morador_id = ${moradorId}
        `,
      );

      registros.forEach((registro) => {
        if (this.tipoNotificacaoPortalValido(registro.tipo)) {
          preferencias[registro.tipo] = Boolean(registro.ativo);
        }
      });
    } catch {
      return preferencias;
    }

    return preferencias;
  }

  private async salvarPreferenciasNotificacoesPortal(
    condominioId: number,
    usuarioId: number,
    moradorId: number,
    preferencias: PreferenciasNotificacoesPortal,
  ) {
    try {
      await Promise.all(
        TIPOS_NOTIFICACAO_PORTAL.map((tipo) =>
          this.prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO notificacoes_preferencias
                (condominio_id, usuario_id, morador_id, tipo, ativo, criado_em, atualizado_em)
              VALUES
                (${condominioId}, ${usuarioId}, ${moradorId}, ${tipo}, ${preferencias[tipo]}, NOW(), NOW())
              ON DUPLICATE KEY UPDATE
                ativo = VALUES(ativo),
                atualizado_em = VALUES(atualizado_em)
            `,
          ),
        ),
      );
    } catch {
      return;
    }
  }

  private async buscarNotificacoesLidasPortal(
    condominioId: number,
    usuarioId: number,
    moradorId: number,
  ) {
    try {
      const registros = await this.prisma.$queryRaw<
        Array<{ notificacao_id: string }>
      >(
        Prisma.sql`
          SELECT notificacao_id
          FROM notificacoes_leituras
          WHERE condominio_id = ${condominioId}
            AND usuario_id = ${usuarioId}
            AND morador_id = ${moradorId}
        `,
      );

      return new Set(registros.map((registro) => registro.notificacao_id));
    } catch {
      return new Set<string>();
    }
  }

  private async registrarLeituraNotificacaoPortal(
    condominioId: number,
    usuarioId: number,
    moradorId: number,
    notificacaoId: string,
  ) {
    try {
      await this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO notificacoes_leituras
            (condominio_id, usuario_id, morador_id, notificacao_id, lida_em, criado_em, atualizado_em)
          VALUES
            (${condominioId}, ${usuarioId}, ${moradorId}, ${notificacaoId}, NOW(), NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            lida_em = VALUES(lida_em),
            atualizado_em = VALUES(atualizado_em)
        `,
      );
    } catch {
      return;
    }
  }

  private async montarNotificacoesPortal(
    condominioId: number,
    morador: MoradorNotificacoesPortal,
  ): Promise<NotificacaoPortalPersistente[]> {
    const agora = new Date();
    const escopoMorador = [
      {
        moradorId: morador.id,
      },
      {
        unidadeId: {
          in: morador.unidadeIds,
        },
      },
    ];

    const [
      cobrancasPendentes,
      cobrancasVencidas,
      comunicadosPublicados,
      reservasAtivas,
      ocorrenciasAbertas,
      encomendasPendentes,
      votacoesAbertas,
      assembleiasAtivas,
    ] = await Promise.all([
      this.prisma.cobrancaCondominial.aggregate({
        where: {
          condominioId,
          status: StatusCobrancaCondominial.PENDENTE,
          OR: escopoMorador,
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
      this.prisma.cobrancaCondominial.aggregate({
        where: {
          condominioId,
          status: StatusCobrancaCondominial.PENDENTE,
          vencimentoEm: {
            lt: agora,
          },
          OR: escopoMorador,
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
      this.prisma.comunicado.aggregate({
        where: {
          condominioId,
          status: StatusComunicado.PUBLICADO,
          OR: [
            {
              expiraEm: null,
            },
            {
              expiraEm: {
                gte: agora,
              },
            },
          ],
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
      this.prisma.reservaAreaComum.aggregate({
        where: {
          condominioId,
          status: {
            in: [
              StatusReservaAreaComum.SOLICITADA,
              StatusReservaAreaComum.APROVADA,
            ],
          },
          OR: escopoMorador,
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
      this.prisma.ocorrencia.aggregate({
        where: {
          condominioId,
          status: {
            in: [
              StatusOcorrencia.ABERTA,
              StatusOcorrencia.EM_ANALISE,
              StatusOcorrencia.EM_ANDAMENTO,
              StatusOcorrencia.AGUARDANDO_MORADOR,
            ],
          },
          OR: escopoMorador,
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
      this.prisma.encomendaPortaria.aggregate({
        where: {
          condominioId,
          status: StatusEncomendaPortaria.RECEBIDA,
          OR: escopoMorador,
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
      this.prisma.votacaoAssembleia.aggregate({
        where: {
          condominioId,
          status: StatusVotacaoAssembleia.ABERTA,
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
      this.prisma.assembleia.aggregate({
        where: {
          condominioId,
          status: {
            in: [StatusAssembleia.CONVOCADA, StatusAssembleia.EM_ANDAMENTO],
          },
        },
        _count: {
          _all: true,
        },
        _max: {
          atualizadoEm: true,
        },
      }),
    ]);

    const totalCobrancas = cobrancasPendentes._count._all;
    const totalVencidas = cobrancasVencidas._count._all;
    const descricaoCobrancas = totalVencidas > 0
      ? `${totalVencidas} título(s) vencido(s) dentro de ${totalCobrancas} cobrança(s) pendente(s).`
      : "Títulos em aberto para acompanhamento e pagamento.";

    return [
      this.criarNotificacaoPortal({
        tipo: "COBRANCAS",
        label: totalVencidas > 0 ? "Cobranças vencidas" : "Cobranças pendentes",
        descricao: descricaoCobrancas,
        valor: totalCobrancas,
        to: "/cobrancas",
        prioridade: totalVencidas > 0 || totalCobrancas > 0 ? "ALTA" : "NORMAL",
        atualizadoEm: cobrancasPendentes._max.atualizadoEm,
      }),
      this.criarNotificacaoPortal({
        tipo: "COMUNICADOS",
        label: "Comunicados publicados",
        descricao: "Avisos e comunicados recentes do condomínio.",
        valor: comunicadosPublicados._count._all,
        to: "/comunicados",
        prioridade: comunicadosPublicados._count._all > 0 ? "MEDIA" : "NORMAL",
        atualizadoEm: comunicadosPublicados._max.atualizadoEm,
      }),
      this.criarNotificacaoPortal({
        tipo: "RESERVAS",
        label: "Reservas em acompanhamento",
        descricao: "Solicitações pendentes de aprovação, reservas aprovadas e eventuais recusas.",
        valor: reservasAtivas._count._all,
        to: "/reservas",
        prioridade: reservasAtivas._count._all > 0 ? "MEDIA" : "NORMAL",
        atualizadoEm: reservasAtivas._max.atualizadoEm,
      }),
      this.criarNotificacaoPortal({
        tipo: "OCORRENCIAS",
        label: "Ocorrências abertas",
        descricao: "Chamados abertos ou em análise.",
        valor: ocorrenciasAbertas._count._all,
        to: "/ocorrencias",
        prioridade: ocorrenciasAbertas._count._all > 0 ? "ALTA" : "NORMAL",
        atualizadoEm: ocorrenciasAbertas._max.atualizadoEm,
      }),
      this.criarNotificacaoPortal({
        tipo: "ENCOMENDAS",
        label: "Encomendas aguardando retirada",
        descricao: "Pacotes recebidos na portaria aguardando retirada pelo morador.",
        valor: encomendasPendentes._count._all,
        to: "/encomendas",
        prioridade: encomendasPendentes._count._all > 0 ? "MEDIA" : "NORMAL",
        atualizadoEm: encomendasPendentes._max.atualizadoEm,
      }),
      this.criarNotificacaoPortal({
        tipo: "VOTACOES",
        label: "Votações abertas",
        descricao: "Votações disponíveis para participação.",
        valor: votacoesAbertas._count._all,
        to: "/votacoes",
        prioridade: votacoesAbertas._count._all > 0 ? "MEDIA" : "NORMAL",
        atualizadoEm: votacoesAbertas._max.atualizadoEm,
      }),
      this.criarNotificacaoPortal({
        tipo: "ASSEMBLEIAS",
        label: "Assembleias ativas",
        descricao: "Convocações, pautas e assembleias em andamento.",
        valor: assembleiasAtivas._count._all,
        to: "/assembleias",
        prioridade: assembleiasAtivas._count._all > 0 ? "MEDIA" : "NORMAL",
        atualizadoEm: assembleiasAtivas._max.atualizadoEm,
      }),
    ];
  }

  private criarNotificacaoPortal(dados: {
    tipo: NotificacaoPortalPersistente["tipo"];
    label: string;
    descricao: string;
    valor: number;
    to: string;
    prioridade: NotificacaoPortalPersistente["prioridade"];
    atualizadoEm: Date | null;
  }): NotificacaoPortalPersistente {
    const assinatura = dados.atualizadoEm?.toISOString() ?? "sem-movimento";
    const id = `${dados.tipo}:${dados.valor}:${assinatura}`;

    return {
      id,
      tipo: dados.tipo,
      label: dados.label,
      descricao: dados.descricao,
      valor: dados.valor,
      to: dados.to,
      prioridade: dados.prioridade,
      criadoEm: dados.atualizadoEm,
      atualizadoEm: dados.atualizadoEm,
    };
  }

  private async usuarioPodeAcessarCobranca(
    condominioId: number,
    cobranca: {
      morador?: { usuarioId: number | null } | null;
      unidade?: {
        moradores?: Array<{
          morador?: { usuarioId: number | null } | null;
        }>;
      } | null;
    },
    usuario: AuthenticatedUser,
  ) {
    if (!usuario?.id) {
      throw new UnauthorizedException("Faça login para acessar esta cobrança.");
    }

    if (usuario.superAdmin) {
      return true;
    }

    const ehMoradorDireto = cobranca.morador?.usuarioId === usuario.id;
    const ehMoradorDaUnidade = Boolean(
      cobranca.unidade?.moradores?.some(
        (vinculo) => vinculo.morador?.usuarioId === usuario.id,
      ),
    );

    if (ehMoradorDireto || ehMoradorDaUnidade) {
      return true;
    }

    const vinculoAdministrativo = await this.prisma.usuarioCondominio.findFirst({
      where: {
        usuarioId: usuario.id,
        condominioId,
        ativo: true,
        papel: {
          in: [
            PapelCondominio.ADMINISTRADOR,
            PapelCondominio.SINDICO,
            PapelCondominio.FINANCEIRO,
          ],
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(vinculoAdministrativo);
  }

  async enviarComprovante(
    condominioId: number,
    cobrancaId: number,
    dto: {
      arquivoNome?: string;
      arquivoTipo?: string;
      arquivoDados?: string;
      observacao?: string;
    },
    usuario: AuthenticatedUser,
  ) {
    if (!usuario?.id) {
      throw new UnauthorizedException("Faça login para enviar comprovante.");
    }

    const arquivoDados = this.normalizarOpcional(dto.arquivoDados);
    const arquivoNome = this.normalizarOpcional(dto.arquivoNome);
    const arquivoTipo = this.normalizarOpcional(dto.arquivoTipo);
    const observacao = this.normalizarOpcional(dto.observacao);

    if (!arquivoDados || !arquivoNome || !arquivoTipo) {
      throw new BadRequestException("Informe o arquivo do comprovante.");
    }

    if (arquivoDados.length > 4_500_000) {
      throw new BadRequestException(
        "O comprovante é muito grande. Envie um arquivo de até 3 MB.",
      );
    }

    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      include: {
        morador: {
          select: {
            usuarioId: true,
          },
        },
        unidade: {
          select: {
            moradores: {
              where: {
                ativo: true,
                morador: {
                  ativo: true,
                },
              },
              select: {
                morador: {
                  select: {
                    usuarioId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    if (cobranca.status !== StatusCobrancaCondominial.PENDENTE) {
      throw new BadRequestException(
        "Apenas cobranças pendentes podem receber comprovante.",
      );
    }

    const podeAcessar = await this.usuarioPodeAcessarCobranca(
      condominioId,
      cobranca,
      usuario,
    );

    if (!podeAcessar) {
      throw new BadRequestException(
        "Você não tem permissão para enviar comprovante desta cobrança.",
      );
    }

    const atualizada = await this.prisma.cobrancaCondominial.update({
      where: {
        id: cobranca.id,
      },
      data: {
        comprovanteStatus: "ENVIADO",
        comprovanteArquivoNome: arquivoNome,
        comprovanteArquivoTipo: arquivoTipo,
        comprovanteArquivoDados: arquivoDados,
        comprovanteObservacao: observacao,
        comprovanteEnviadoEm: new Date(),
        comprovanteAnalisadoEm: null,
        comprovanteAnalisadoPorUsuarioId: null,
        comprovanteMotivoRecusa: null,
      },
    });

    await this.registrarHistoricoFinanceiro({
      condominioId,
      usuarioId: usuario.id,
      cobrancaCondominialId: cobranca.id,
      lancamentoFinanceiroId: cobranca.lancamentoFinanceiroId,
      acao: "COMPROVANTE_COBRANCA_ENVIADO",
      entidade: "COBRANCA",
      descricao: "Comprovante de pagamento enviado.",
      detalhes: observacao,
    });

    return atualizada;
  }

  async obterComprovante(
    condominioId: number,
    cobrancaId: number,
    usuario: AuthenticatedUser,
  ) {
    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      include: {
        morador: {
          select: {
            usuarioId: true,
          },
        },
        unidade: {
          select: {
            moradores: {
              where: {
                ativo: true,
                morador: {
                  ativo: true,
                },
              },
              select: {
                morador: {
                  select: {
                    usuarioId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    const podeAcessar = await this.usuarioPodeAcessarCobranca(
      condominioId,
      cobranca,
      usuario,
    );

    if (!podeAcessar) {
      throw new BadRequestException(
        "Você não tem permissão para visualizar este comprovante.",
      );
    }

    if (!cobranca.comprovanteArquivoDados) {
      throw new NotFoundException("Comprovante não encontrado.");
    }

    return {
      arquivoNome: cobranca.comprovanteArquivoNome,
      arquivoTipo: cobranca.comprovanteArquivoTipo,
      arquivoDados: cobranca.comprovanteArquivoDados,
      observacao: cobranca.comprovanteObservacao,
      status: cobranca.comprovanteStatus,
      enviadoEm: cobranca.comprovanteEnviadoEm,
    };
  }

  async aprovarComprovante(
    condominioId: number,
    cobrancaId: number,
    usuario: AuthenticatedUser,
  ) {
    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        lancamentoFinanceiroId: true,
        comprovanteStatus: true,
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    if (cobranca.comprovanteStatus !== "ENVIADO") {
      throw new BadRequestException(
        "Esta cobrança não possui comprovante pendente de análise.",
      );
    }

    const pagoEm = new Date();

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.cobrancaCondominial.update({
        where: {
          id: cobranca.id,
        },
        data: {
          status: StatusCobrancaCondominial.PAGO,
          pagoEm,
          pagoPorUsuarioId: usuario.id,
          comprovanteStatus: "APROVADO",
          comprovanteAnalisadoEm: pagoEm,
          comprovanteAnalisadoPorUsuarioId: usuario.id,
          comprovanteMotivoRecusa: null,
        },
      });

      if (cobranca.lancamentoFinanceiroId) {
        await tx.lancamentoFinanceiro.update({
          where: {
            id: cobranca.lancamentoFinanceiroId,
          },
          data: {
            status: StatusLancamentoFinanceiro.PAGO,
            pagoEm,
            pagoPorUsuarioId: usuario.id,
            canceladoEm: null,
            canceladoPorUsuarioId: null,
            motivoCancelamento: null,
          },
        });
      }

      await this.registrarHistoricoFinanceiro(
        {
          condominioId,
          usuarioId: usuario.id,
          cobrancaCondominialId: cobranca.id,
          lancamentoFinanceiroId: cobranca.lancamentoFinanceiroId,
          acao: "COMPROVANTE_COBRANCA_APROVADO",
          entidade: "COBRANCA",
          descricao: "Comprovante aprovado e cobrança marcada como paga.",
        },
        tx,
      );

      return atualizada;
    });
  }

  async recusarComprovante(
    condominioId: number,
    cobrancaId: number,
    dto: { motivo?: string },
    usuario: AuthenticatedUser,
  ) {
    const motivo = this.normalizarOpcional(dto.motivo);

    if (!motivo) {
      throw new BadRequestException("Informe o motivo da recusa.");
    }

    const cobranca = await this.prisma.cobrancaCondominial.findFirst({
      where: {
        id: cobrancaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        lancamentoFinanceiroId: true,
        comprovanteStatus: true,
      },
    });

    if (!cobranca) {
      throw new NotFoundException("Cobrança condominial não encontrada.");
    }

    if (cobranca.comprovanteStatus !== "ENVIADO") {
      throw new BadRequestException(
        "Esta cobrança não possui comprovante pendente de análise.",
      );
    }

    const atualizada = await this.prisma.cobrancaCondominial.update({
      where: {
        id: cobranca.id,
      },
      data: {
        comprovanteStatus: "RECUSADO",
        comprovanteAnalisadoEm: new Date(),
        comprovanteAnalisadoPorUsuarioId: usuario.id,
        comprovanteMotivoRecusa: motivo,
      },
    });

    await this.registrarHistoricoFinanceiro({
      condominioId,
      usuarioId: usuario.id,
      cobrancaCondominialId: cobranca.id,
      lancamentoFinanceiroId: cobranca.lancamentoFinanceiroId,
      acao: "COMPROVANTE_COBRANCA_RECUSADO",
      entidade: "COBRANCA",
      descricao: "Comprovante de pagamento recusado.",
      detalhes: motivo,
    });

    return atualizada;
  }

  private async registrarHistoricoFinanceiro(
    dados: {
      condominioId: number;
      usuarioId?: number | null;
      lancamentoFinanceiroId?: number | null;
      cobrancaCondominialId?: number | null;
      acao: string;
      entidade: string;
      descricao: string;
      detalhes?: string | null;
    },
    cliente: any = this.prisma,
  ) {
    await cliente.historicoFinanceiro.create({
      data: {
        condominioId: dados.condominioId,
        usuarioId: dados.usuarioId ?? null,
        lancamentoFinanceiroId: dados.lancamentoFinanceiroId ?? null,
        cobrancaCondominialId: dados.cobrancaCondominialId ?? null,
        acao: dados.acao,
        entidade: dados.entidade,
        descricao: dados.descricao,
        detalhes: dados.detalhes ?? null,
      },
    });
  }

  private async garantirCondominio(condominioId: number): Promise<void> {
    const condominio = await this.prisma.condominio.findUnique({
      where: {
        id: condominioId,
      },
      select: {
        id: true,
      },
    });

    if (!condominio) {
      throw new NotFoundException("Condomínio não encontrado.");
    }
  }

  private async garantirUnidade(
    condominioId: number,
    unidadeId: number,
  ): Promise<void> {
    const unidade = await this.prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!unidade) {
      throw new NotFoundException("Unidade não encontrada.");
    }
  }

  private async garantirMorador(
    condominioId: number,
    moradorId: number,
  ): Promise<void> {
    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!morador) {
      throw new NotFoundException("Morador não encontrado.");
    }
  }

  private async garantirVinculoMoradorUnidade(
    moradorId: number,
    unidadeId: number,
  ): Promise<void> {
    const vinculo = await this.prisma.moradorUnidade.findFirst({
      where: {
        moradorId,
        unidadeId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!vinculo) {
      throw new BadRequestException(
        "O morador informado não está vinculado à unidade informada.",
      );
    }
  }

  private async garantirCategoriaReceita(
    condominioId: number,
    categoriaId: number,
  ): Promise<void> {
    const categoria = await this.prisma.categoriaFinanceira.findFirst({
      where: {
        id: categoriaId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
        tipo: true,
      },
    });

    if (!categoria) {
      throw new NotFoundException("Categoria financeira não encontrada.");
    }

    if (
      categoria.tipo !== TipoCategoriaFinanceira.RECEITA &&
      categoria.tipo !== TipoCategoriaFinanceira.AMBOS
    ) {
      throw new BadRequestException(
        "A categoria informada não é compatível com cobranças de receita.",
      );
    }
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
