import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  StatusLancamentoFinanceiro,
  TipoCategoriaFinanceira,
  TipoLancamentoFinanceiro,
  StatusCobrancaCondominial,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CancelarLancamentoFinanceiroDto } from "./dto/cancelar-lancamento-financeiro.dto";
import { CreateCategoriaFinanceiraDto } from "./dto/create-categoria-financeira.dto";
import { CreateLancamentoFinanceiroDto } from "./dto/create-lancamento-financeiro.dto";
import { PagarLancamentoFinanceiroDto } from "./dto/pagar-lancamento-financeiro.dto";
import { UpdateCategoriaFinanceiraDto } from "./dto/update-categoria-financeira.dto";
import { UpdateLancamentoFinanceiroDto } from "./dto/update-lancamento-financeiro.dto";
import { UpdateConfiguracoesPagamentoDto } from "./dto/update-configuracoes-pagamento.dto";

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  async obterConfiguracoesPagamento(condominioId: number) {
    const condominio = await this.prisma.condominio.findUnique({
      where: { id: condominioId },
      select: {
        id: true,
        nome: true,
        pixChave: true,
        pixTipo: true,
        beneficiarioPagamento: true,
        bancoPagamento: true,
        instrucoesPagamento: true,
        mensagemCobrancaPadrao: true,
      },
    });

    if (!condominio) {
      throw new NotFoundException("Condomínio não encontrado.");
    }

    return condominio;
  }

  async obterConfiguracoesPagamentoPortal(condominioId: number) {
    const condominio = await this.prisma.condominio.findUnique({
      where: { id: condominioId },
      select: {
        id: true,
        nome: true,
        pixChave: true,
        pixTipo: true,
        beneficiarioPagamento: true,
        bancoPagamento: true,
        instrucoesPagamento: true,
        mensagemCobrancaPadrao: true,
      },
    });

    if (!condominio) {
      throw new NotFoundException("Condomínio não encontrado.");
    }

    return condominio;
  }

  async atualizarConfiguracoesPagamento(
    condominioId: number,
    dto: UpdateConfiguracoesPagamentoDto,
  ) {
    await this.garantirCondominio(condominioId);

    return this.prisma.condominio.update({
      where: { id: condominioId },
      data: {
        pixChave: this.normalizarOpcional(dto.pixChave),
        pixTipo: this.normalizarOpcional(dto.pixTipo),
        beneficiarioPagamento: this.normalizarOpcional(
          dto.beneficiarioPagamento,
        ),
        bancoPagamento: this.normalizarOpcional(dto.bancoPagamento),
        instrucoesPagamento: this.normalizarOpcional(
          dto.instrucoesPagamento,
        ),
        mensagemCobrancaPadrao: this.normalizarOpcional(
          dto.mensagemCobrancaPadrao,
        ),
      },
      select: {
        id: true,
        nome: true,
        pixChave: true,
        pixTipo: true,
        beneficiarioPagamento: true,
        bancoPagamento: true,
        instrucoesPagamento: true,
        mensagemCobrancaPadrao: true,
      },
    });
  }

  async criarCategoria(
    condominioId: number,
    dto: CreateCategoriaFinanceiraDto,
  ) {
    await this.garantirCondominio(condominioId);

    try {
      return await this.prisma.categoriaFinanceira.create({
        data: {
          condominioId,
          nome: dto.nome.trim(),
          tipo: dto.tipo,
          descricao: this.normalizarOpcional(dto.descricao),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Já existe uma categoria financeira com esse nome e tipo.",
        );
      }

      throw error;
    }
  }

  async listarCategorias(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.categoriaFinanceira.findMany({
      where: {
        condominioId,
      },
      orderBy: [
        {
          tipo: "asc",
        },
        {
          nome: "asc",
        },
      ],
    });
  }

  async atualizarCategoria(
    condominioId: number,
    categoriaId: number,
    dto: UpdateCategoriaFinanceiraDto,
  ) {
    await this.garantirCondominio(condominioId);

    const categoria = await this.prisma.categoriaFinanceira.findFirst({
      where: {
        id: categoriaId,
        condominioId,
      },
      select: {
        id: true,
        tipo: true,
      },
    });

    if (!categoria) {
      throw new NotFoundException("Categoria financeira não encontrada.");
    }

    if (dto.tipo !== TipoCategoriaFinanceira.AMBOS) {
      const tipoLancamentoIncompativel =
        dto.tipo === TipoCategoriaFinanceira.RECEITA
          ? TipoLancamentoFinanceiro.DESPESA
          : TipoLancamentoFinanceiro.RECEITA;

      const totalLancamentosIncompativeis =
        await this.prisma.lancamentoFinanceiro.count({
          where: {
            condominioId,
            categoriaId: categoria.id,
            tipo: tipoLancamentoIncompativel,
          },
        });

      if (totalLancamentosIncompativeis > 0) {
        throw new BadRequestException(
          "Não é possível alterar o tipo da categoria porque ela possui lançamentos financeiros incompatíveis vinculados.",
        );
      }
    }

    try {
      return await this.prisma.categoriaFinanceira.update({
        where: {
          id: categoria.id,
        },
        data: {
          nome: dto.nome.trim(),
          tipo: dto.tipo,
          descricao: this.normalizarOpcional(dto.descricao),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Já existe uma categoria financeira com esse nome e tipo.",
        );
      }

      throw error;
    }
  }

  async desativarCategoria(condominioId: number, categoriaId: number) {
    await this.garantirCondominio(condominioId);

    const categoria = await this.prisma.categoriaFinanceira.findFirst({
      where: {
        id: categoriaId,
        condominioId,
      },
      select: {
        id: true,
        ativo: true,
      },
    });

    if (!categoria) {
      throw new NotFoundException("Categoria financeira não encontrada.");
    }

    if (!categoria.ativo) {
      throw new BadRequestException(
        "Esta categoria financeira já está inativa.",
      );
    }

    return this.prisma.categoriaFinanceira.update({
      where: {
        id: categoria.id,
      },
      data: {
        ativo: false,
      },
    });
  }

  async ativarCategoria(condominioId: number, categoriaId: number) {
    await this.garantirCondominio(condominioId);

    const categoria = await this.prisma.categoriaFinanceira.findFirst({
      where: {
        id: categoriaId,
        condominioId,
      },
      select: {
        id: true,
        ativo: true,
      },
    });

    if (!categoria) {
      throw new NotFoundException("Categoria financeira não encontrada.");
    }

    if (categoria.ativo) {
      throw new BadRequestException("Esta categoria financeira já está ativa.");
    }

    return this.prisma.categoriaFinanceira.update({
      where: {
        id: categoria.id,
      },
      data: {
        ativo: true,
      },
    });
  }

  async criarLancamento(
    condominioId: number,
    dto: CreateLancamentoFinanceiroDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    if (dto.categoriaId) {
      await this.garantirCategoriaCompatível(
        condominioId,
        dto.categoriaId,
        dto.tipo,
      );
    }

    const competenciaEm = new Date(dto.competenciaEm);
    const vencimentoEm = dto.vencimentoEm ? new Date(dto.vencimentoEm) : null;

    return this.prisma.lancamentoFinanceiro.create({
      data: {
        condominioId,
        categoriaId: dto.categoriaId ?? null,
        criadoPorUsuarioId: usuario.id,
        tipo: dto.tipo,
        descricao: dto.descricao.trim(),
        valor: new Prisma.Decimal(dto.valor),
        competenciaEm,
        vencimentoEm,
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
        },
        criadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  async listarLancamentos(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.lancamentoFinanceiro.findMany({
      where: {
        condominioId,
      },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            tipo: true,
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
        competenciaEm: "desc",
      },
    });
  }

  async buscarLancamento(condominioId: number, lancamentoId: number) {
    const lancamento = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        id: lancamentoId,
        condominioId,
      },
      include: {
        categoria: true,
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

    if (!lancamento) {
      throw new NotFoundException("Lançamento financeiro não encontrado.");
    }

    return lancamento;
  }

  async atualizarLancamento(
    condominioId: number,
    lancamentoId: number,
    dto: UpdateLancamentoFinanceiroDto,
  ) {
    await this.garantirCondominio(condominioId);

    const lancamento = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        id: lancamentoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        cobrancaCondominial: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!lancamento) {
      throw new NotFoundException("Lançamento financeiro não encontrado.");
    }

    if (lancamento.status !== StatusLancamentoFinanceiro.PENDENTE) {
      throw new BadRequestException(
        "Apenas lançamentos pendentes podem ser editados.",
      );
    }

    if (lancamento.cobrancaCondominial) {
      throw new BadRequestException(
        "Lançamentos vinculados a cobranças devem ser editados pelo módulo de cobranças.",
      );
    }

    if (dto.categoriaId) {
      await this.garantirCategoriaCompatível(
        condominioId,
        dto.categoriaId,
        dto.tipo,
      );
    }

    const competenciaEm = new Date(dto.competenciaEm);
    const vencimentoEm = dto.vencimentoEm ? new Date(dto.vencimentoEm) : null;

    return this.prisma.lancamentoFinanceiro.update({
      where: {
        id: lancamento.id,
      },
      data: {
        categoriaId: dto.categoriaId ?? null,
        tipo: dto.tipo,
        descricao: dto.descricao.trim(),
        valor: new Prisma.Decimal(dto.valor),
        competenciaEm,
        vencimentoEm,
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: {
        categoria: {
          select: {
            id: true,
            nome: true,
            tipo: true,
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
  }

  async listarHistoricoFinanceiro(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.historicoFinanceiro.findMany({
      where: {
        condominioId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        lancamentoFinanceiro: {
          select: {
            id: true,
            descricao: true,
            status: true,
            valor: true,
          },
        },
        cobrancaCondominial: {
          select: {
            id: true,
            descricao: true,
            status: true,
            valor: true,
            unidade: {
              select: {
                id: true,
                identificador: true,
                numero: true,
              },
            },
          },
        },
      },
      orderBy: {
        criadoEm: "desc",
      },
      take: 150,
    });
  }

  async pagarLancamento(
    condominioId: number,
    lancamentoId: number,
    dto: PagarLancamentoFinanceiroDto,
    usuario: AuthenticatedUser,
  ) {
    const lancamento = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        id: lancamentoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!lancamento) {
      throw new NotFoundException("Lançamento financeiro não encontrado.");
    }

    if (lancamento.status !== StatusLancamentoFinanceiro.PENDENTE) {
      throw new BadRequestException(
        "Apenas lançamentos pendentes podem ser marcados como pagos.",
      );
    }

    const atualizado = await this.prisma.lancamentoFinanceiro.update({
      where: {
        id: lancamento.id,
      },
      data: {
        status: StatusLancamentoFinanceiro.PAGO,
        pagoEm: dto.pagoEm ? new Date(dto.pagoEm) : new Date(),
        pagoPorUsuarioId: usuario.id,
      },
    });

    await this.registrarHistoricoFinanceiro({
      condominioId,
      usuarioId: usuario.id,
      lancamentoFinanceiroId: lancamento.id,
      acao: "PAGAMENTO_LANCAMENTO",
      entidade: "LANCAMENTO",
      descricao: "Lançamento marcado como pago.",
    });

    return atualizado;
  }

  async estornarPagamentoLancamento(
    condominioId: number,
    lancamentoId: number,
    usuario: AuthenticatedUser,
  ) {
    const lancamento = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        id: lancamentoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        cobrancaCondominial: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!lancamento) {
      throw new NotFoundException("Lançamento financeiro não encontrado.");
    }

    if (lancamento.status !== StatusLancamentoFinanceiro.PAGO) {
      throw new BadRequestException(
        "Apenas lançamentos pagos podem ter o pagamento desfeito.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (lancamento.cobrancaCondominial) {
        if (
          lancamento.cobrancaCondominial.status !==
          StatusCobrancaCondominial.PAGO
        ) {
          throw new BadRequestException(
            "O lançamento está vinculado a uma cobrança que não está paga.",
          );
        }

        await tx.cobrancaCondominial.update({
          where: {
            id: lancamento.cobrancaCondominial.id,
          },
          data: {
            status: StatusCobrancaCondominial.PENDENTE,
            pagoEm: null,
            pagoPorUsuarioId: null,
          },
        });
      }

      const atualizado = await tx.lancamentoFinanceiro.update({
        where: {
          id: lancamento.id,
        },
        data: {
          status: StatusLancamentoFinanceiro.PENDENTE,
          pagoEm: null,
          pagoPorUsuarioId: null,
        },
      });

      await this.registrarHistoricoFinanceiro(
        {
          condominioId,
          usuarioId: usuario.id,
          lancamentoFinanceiroId: lancamento.id,
          cobrancaCondominialId: lancamento.cobrancaCondominial?.id ?? null,
          acao: "ESTORNO_PAGAMENTO_LANCAMENTO",
          entidade: "LANCAMENTO",
          descricao: "Pagamento do lançamento desfeito.",
        },
        tx,
      );

      return atualizado;
    });
  }

  async cancelarLancamento(
    condominioId: number,
    lancamentoId: number,
    dto: CancelarLancamentoFinanceiroDto,
    usuario: AuthenticatedUser,
  ) {
    const lancamento = await this.prisma.lancamentoFinanceiro.findFirst({
      where: {
        id: lancamentoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!lancamento) {
      throw new NotFoundException("Lançamento financeiro não encontrado.");
    }

    if (lancamento.status === StatusLancamentoFinanceiro.CANCELADO) {
      throw new BadRequestException("Este lançamento já está cancelado.");
    }

    if (lancamento.status === StatusLancamentoFinanceiro.PAGO) {
      throw new BadRequestException(
        "Um lançamento pago não pode ser cancelado diretamente.",
      );
    }

    const atualizado = await this.prisma.lancamentoFinanceiro.update({
      where: {
        id: lancamento.id,
      },
      data: {
        status: StatusLancamentoFinanceiro.CANCELADO,
        canceladoEm: new Date(),
        canceladoPorUsuarioId: usuario.id,
        motivoCancelamento: dto.motivoCancelamento.trim(),
      },
    });

    await this.registrarHistoricoFinanceiro({
      condominioId,
      usuarioId: usuario.id,
      lancamentoFinanceiroId: lancamento.id,
      acao: "CANCELAMENTO_LANCAMENTO",
      entidade: "LANCAMENTO",
      descricao: "Lançamento cancelado.",
      detalhes: dto.motivoCancelamento.trim(),
    });

    return atualizado;
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

    const grupos = await this.prisma.lancamentoFinanceiro.groupBy({
      by: ["tipo", "status"],
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

    return {
      periodo: {
        inicio,
        fim,
      },
      grupos,
    };
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

  private async garantirCategoriaCompatível(
    condominioId: number,
    categoriaId: number,
    tipoLancamento: TipoLancamentoFinanceiro,
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

    const compativel =
      categoria.tipo === TipoCategoriaFinanceira.AMBOS ||
      categoria.tipo === tipoLancamento;

    if (!compativel) {
      throw new BadRequestException(
        "A categoria informada não é compatível com o tipo do lançamento.",
      );
    }
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

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
