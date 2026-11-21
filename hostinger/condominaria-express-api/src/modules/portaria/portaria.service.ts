import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusAutorizacaoVisitante,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateAutorizacaoVisitanteDto } from './dto/create-autorizacao-visitante.dto';
import { CreateVisitanteDto } from './dto/create-visitante.dto';
import { RegistrarEntradaVisitanteDto } from './dto/registrar-entrada-visitante.dto';
import { RegistrarSaidaVisitanteDto } from './dto/registrar-saida-visitante.dto';

@Injectable()
export class PortariaService {
  constructor(private readonly prisma: PrismaService) {}

  async criarVisitante(
    condominioId: number,
    dto: CreateVisitanteDto,
  ) {
    await this.garantirCondominio(condominioId);

    try {
      return await this.prisma.visitante.create({
        data: {
          condominioId,
          nome: dto.nome.trim(),
          tipoDocumento: dto.tipoDocumento ?? null,
          documento: this.normalizarOpcional(dto.documento),
          telefone: this.normalizarOpcional(dto.telefone),
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um visitante com esse documento neste condomínio.',
        );
      }

      throw error;
    }
  }

  async listarVisitantes(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.visitante.findMany({
      where: {
        condominioId,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async buscarVisitante(condominioId: number, visitanteId: number) {
    const visitante = await this.prisma.visitante.findFirst({
      where: {
        id: visitanteId,
        condominioId,
      },
      include: {
        autorizacoes: {
          orderBy: {
            criadoEm: 'desc',
          },
          take: 10,
          include: {
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
    });

    if (!visitante) {
      throw new NotFoundException('Visitante não encontrado.');
    }

    return visitante;
  }

  async criarAutorizacao(
    condominioId: number,
    dto: CreateAutorizacaoVisitanteDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const visitante = await this.prisma.visitante.findFirst({
      where: {
        id: dto.visitanteId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!visitante) {
      throw new NotFoundException('Visitante não encontrado.');
    }

    const unidade = await this.prisma.unidade.findFirst({
      where: {
        id: dto.unidadeId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada.');
    }

    if (dto.moradorId) {
      const morador = await this.prisma.morador.findFirst({
        where: {
          id: dto.moradorId,
          condominioId,
          ativo: true,
        },
        select: {
          id: true,
        },
      });

      if (!morador) {
        throw new NotFoundException('Morador não encontrado.');
      }
    }

    const inicioEm = new Date(dto.inicioEm);
    const fimEm = new Date(dto.fimEm);

    if (fimEm <= inicioEm) {
      throw new BadRequestException(
        'A data final da autorização deve ser posterior à data inicial.',
      );
    }

    return this.prisma.autorizacaoVisitante.create({
      data: {
        condominioId,
        visitanteId: dto.visitanteId,
        unidadeId: dto.unidadeId,
        moradorId: dto.moradorId ?? null,
        criadoPorUsuarioId: usuario.id,
        inicioEm,
        fimEm,
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            documento: true,
            telefone: true,
          },
        },
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
          },
        },
      },
    });
  }

  async listarAutorizacoesAtivas(condominioId: number) {
    await this.garantirCondominio(condominioId);

    const agora = new Date();

    return this.prisma.autorizacaoVisitante.findMany({
      where: {
        condominioId,
        status: StatusAutorizacaoVisitante.ATIVA,
        inicioEm: {
          lte: agora,
        },
        fimEm: {
          gte: agora,
        },
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            documento: true,
            telefone: true,
          },
        },
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
          },
        },
      },
      orderBy: {
        fimEm: 'asc',
      },
    });
  }


  async listarAutorizacoes(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.autorizacaoVisitante.findMany({
      where: {
        condominioId,
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            documento: true,
            telefone: true,
          },
        },
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
          },
        },
        criadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        registrosAcesso: {
          orderBy: {
            entradaEm: 'desc',
          },
          take: 3,
          include: {
            entradaRegistradaPor: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            saidaRegistradaPor: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          status: 'asc',
        },
        {
          fimEm: 'asc',
        },
        {
          criadoEm: 'desc',
        },
      ],
    });
  }

  async cancelarAutorizacaoVisitante(
    condominioId: number,
    autorizacaoId: number,
    usuario: AuthenticatedUser,
  ) {
    const autorizacao = await this.prisma.autorizacaoVisitante.findFirst({
      where: {
        id: autorizacaoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!autorizacao) {
      throw new NotFoundException('Autorização de visitante não encontrada.');
    }

    if (autorizacao.status !== StatusAutorizacaoVisitante.ATIVA) {
      throw new BadRequestException('Apenas autorizações ativas podem ser canceladas.');
    }

    const acessoAberto = await this.prisma.registroAcessoVisitante.findFirst({
      where: {
        autorizacaoVisitanteId: autorizacao.id,
        saidaEm: null,
      },
      select: {
        id: true,
      },
    });

    if (acessoAberto) {
      throw new ConflictException(
        'Não é possível cancelar uma autorização com entrada em aberto.',
      );
    }

    return this.prisma.autorizacaoVisitante.update({
      where: {
        id: autorizacao.id,
      },
      data: {
        status: StatusAutorizacaoVisitante.CANCELADA,
        atualizadoEm: new Date(),
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            documento: true,
            telefone: true,
          },
        },
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

  async agendaVisitantes(condominioId: number) {
    await this.garantirCondominio(condominioId);

    const agora = new Date();
    const inicioHoje = new Date(agora);
    inicioHoje.setHours(0, 0, 0, 0);

    const fimHoje = new Date(agora);
    fimHoje.setHours(23, 59, 59, 999);

    const [autorizacoesHoje, acessosEmAberto] = await Promise.all([
      this.prisma.autorizacaoVisitante.findMany({
        where: {
          condominioId,
          status: StatusAutorizacaoVisitante.ATIVA,
          inicioEm: {
            lte: fimHoje,
          },
          fimEm: {
            gte: inicioHoje,
          },
        },
        include: {
          visitante: {
            select: {
              id: true,
              nome: true,
              documento: true,
              telefone: true,
            },
          },
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
            },
          },
        },
        orderBy: {
          inicioEm: 'asc',
        },
      }),
      this.listarAcessosEmAberto(condominioId),
    ]);

    return {
      autorizacoesHoje,
      acessosEmAberto,
      resumo: {
        autorizacoesHoje: autorizacoesHoje.length,
        acessosEmAberto: acessosEmAberto.length,
      },
    };
  }

  async registrarEntrada(
    condominioId: number,
    autorizacaoId: number,
    dto: RegistrarEntradaVisitanteDto,
    usuario: AuthenticatedUser,
  ) {
    const autorizacao = await this.prisma.autorizacaoVisitante.findFirst({
      where: {
        id: autorizacaoId,
        condominioId,
        status: StatusAutorizacaoVisitante.ATIVA,
      },
      select: {
        id: true,
        visitanteId: true,
        unidadeId: true,
        inicioEm: true,
        fimEm: true,
      },
    });

    if (!autorizacao) {
      throw new NotFoundException('Autorização de visitante não encontrada.');
    }

    const agora = new Date();

    if (agora < autorizacao.inicioEm || agora > autorizacao.fimEm) {
      throw new BadRequestException(
        'Esta autorização não está válida para o horário atual.',
      );
    }

    const acessoAberto = await this.prisma.registroAcessoVisitante.findFirst({
      where: {
        autorizacaoVisitanteId: autorizacao.id,
        saidaEm: null,
      },
      select: {
        id: true,
      },
    });

    if (acessoAberto) {
      throw new ConflictException(
        'Já existe uma entrada em aberto para esta autorização.',
      );
    }

    return this.prisma.registroAcessoVisitante.create({
      data: {
        condominioId,
        autorizacaoVisitanteId: autorizacao.id,
        visitanteId: autorizacao.visitanteId,
        unidadeId: autorizacao.unidadeId,
        entradaRegistradaPorId: usuario.id,
        observacoesEntrada: this.normalizarOpcional(dto.observacoesEntrada),
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            documento: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
          },
        },
      },
    });
  }

  async listarAcessosEmAberto(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.registroAcessoVisitante.findMany({
      where: {
        condominioId,
        saidaEm: null,
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            documento: true,
            telefone: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
      },
      orderBy: {
        entradaEm: 'desc',
      },
    });
  }

  async registrarSaida(
    condominioId: number,
    registroId: number,
    dto: RegistrarSaidaVisitanteDto,
    usuario: AuthenticatedUser,
  ) {
    const registro = await this.prisma.registroAcessoVisitante.findFirst({
      where: {
        id: registroId,
        condominioId,
        saidaEm: null,
      },
      select: {
        id: true,
      },
    });

    if (!registro) {
      throw new NotFoundException(
        'Registro de acesso em aberto não encontrado.',
      );
    }

    return this.prisma.registroAcessoVisitante.update({
      where: {
        id: registro.id,
      },
      data: {
        saidaEm: new Date(),
        saidaRegistradaPorId: usuario.id,
        observacoesSaida: this.normalizarOpcional(dto.observacoesSaida),
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
          },
        },
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
      throw new NotFoundException('Condomínio não encontrado.');
    }
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
