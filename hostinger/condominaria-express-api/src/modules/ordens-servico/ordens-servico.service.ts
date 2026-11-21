import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrioridadeOrdemServico,
  StatusOrdemServico,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AgendarOrdemServicoDto } from './dto/agendar-ordem-servico.dto';
import { CancelarOrdemServicoDto } from './dto/cancelar-ordem-servico.dto';
import { ConcluirOrdemServicoDto } from './dto/concluir-ordem-servico.dto';
import { CreateOrdemServicoDto } from './dto/create-ordem-servico.dto';

@Injectable()
export class OrdensServicoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    condominioId: number,
    dto: CreateOrdemServicoDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    if (dto.ocorrenciaId) {
      await this.garantirOcorrencia(condominioId, dto.ocorrenciaId);
    }

    if (dto.unidadeId) {
      await this.garantirUnidade(condominioId, dto.unidadeId);
    }

    if (dto.prestadorId) {
      await this.garantirPrestador(condominioId, dto.prestadorId);
    }

    const agendadaPara = dto.agendadaPara
      ? new Date(dto.agendadaPara)
      : null;

    const statusInicial = agendadaPara
      ? StatusOrdemServico.AGENDADA
      : StatusOrdemServico.ABERTA;

    return this.prisma.$transaction(async (tx) => {
      const ordem = await tx.ordemServico.create({
        data: {
          condominioId,
          ocorrenciaId: dto.ocorrenciaId ?? null,
          unidadeId: dto.unidadeId ?? null,
          prestadorId: dto.prestadorId ?? null,
          criadoPorUsuarioId: usuario.id,
          titulo: dto.titulo.trim(),
          descricao: dto.descricao.trim(),
          categoria: this.normalizarOpcional(dto.categoria),
          prioridade: dto.prioridade ?? PrioridadeOrdemServico.MEDIA,
          status: statusInicial,
          agendadaPara,
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
        include: {
          ocorrencia: {
            select: {
              id: true,
              titulo: true,
              status: true,
            },
          },
          unidade: {
            select: {
              id: true,
              identificador: true,
              numero: true,
            },
          },
          prestador: {
            select: {
              id: true,
              nome: true,
              empresa: true,
              tipoServico: true,
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

      await tx.ordemServicoHistoricoStatus.create({
        data: {
          ordemServicoId: ordem.id,
          usuarioId: usuario.id,
          statusAnterior: null,
          statusNovo: statusInicial,
          observacao: agendadaPara
            ? 'Ordem criada já com agendamento.'
            : 'Ordem de serviço criada.',
        },
      });

      return ordem;
    });
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.ordemServico.findMany({
      where: {
        condominioId,
      },
      include: {
        ocorrencia: {
          select: {
            id: true,
            titulo: true,
            status: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
        prestador: {
          select: {
            id: true,
            nome: true,
            empresa: true,
            tipoServico: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });
  }

  async findOne(condominioId: number, ordemId: number) {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: {
        id: ordemId,
        condominioId,
      },
      include: {
        ocorrencia: true,
        unidade: true,
        prestador: true,
        criadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        historicoStatus: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
          orderBy: {
            criadoEm: 'desc',
          },
        },
      },
    });

    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    return ordem;
  }

  async agendar(
    condominioId: number,
    ordemId: number,
    dto: AgendarOrdemServicoDto,
    usuario: AuthenticatedUser,
  ) {
    const ordem = await this.buscarOrdemBase(condominioId, ordemId);

    if (
      ordem.status === StatusOrdemServico.CONCLUIDA ||
      ordem.status === StatusOrdemServico.CANCELADA
    ) {
      throw new BadRequestException(
        'Esta ordem não pode mais ser agendada.',
      );
    }

    const agendadaPara = new Date(dto.agendadaPara);

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.ordemServico.update({
        where: {
          id: ordem.id,
        },
        data: {
          status: StatusOrdemServico.AGENDADA,
          agendadaPara,
        },
      });

      await tx.ordemServicoHistoricoStatus.create({
        data: {
          ordemServicoId: ordem.id,
          usuarioId: usuario.id,
          statusAnterior: ordem.status,
          statusNovo: StatusOrdemServico.AGENDADA,
          observacao:
            this.normalizarOpcional(dto.observacao) ??
            'Ordem de serviço agendada.',
        },
      });

      return atualizada;
    });
  }

  async iniciar(
    condominioId: number,
    ordemId: number,
    usuario: AuthenticatedUser,
  ) {
    const ordem = await this.buscarOrdemBase(condominioId, ordemId);

    if (
      ordem.status !== StatusOrdemServico.ABERTA &&
      ordem.status !== StatusOrdemServico.AGENDADA
    ) {
      throw new BadRequestException(
        'Apenas ordens abertas ou agendadas podem ser iniciadas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.ordemServico.update({
        where: {
          id: ordem.id,
        },
        data: {
          status: StatusOrdemServico.EM_EXECUCAO,
          iniciadaEm: new Date(),
        },
      });

      await tx.ordemServicoHistoricoStatus.create({
        data: {
          ordemServicoId: ordem.id,
          usuarioId: usuario.id,
          statusAnterior: ordem.status,
          statusNovo: StatusOrdemServico.EM_EXECUCAO,
          observacao: 'Execução iniciada.',
        },
      });

      return atualizada;
    });
  }

  async concluir(
    condominioId: number,
    ordemId: number,
    dto: ConcluirOrdemServicoDto,
    usuario: AuthenticatedUser,
  ) {
    const ordem = await this.buscarOrdemBase(condominioId, ordemId);

    if (ordem.status !== StatusOrdemServico.EM_EXECUCAO) {
      throw new BadRequestException(
        'Apenas ordens em execução podem ser concluídas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.ordemServico.update({
        where: {
          id: ordem.id,
        },
        data: {
          status: StatusOrdemServico.CONCLUIDA,
          concluidaEm: new Date(),
        },
      });

      await tx.ordemServicoHistoricoStatus.create({
        data: {
          ordemServicoId: ordem.id,
          usuarioId: usuario.id,
          statusAnterior: ordem.status,
          statusNovo: StatusOrdemServico.CONCLUIDA,
          observacao:
            this.normalizarOpcional(dto.observacao) ??
            'Ordem de serviço concluída.',
        },
      });

      return atualizada;
    });
  }

  async cancelar(
    condominioId: number,
    ordemId: number,
    dto: CancelarOrdemServicoDto,
    usuario: AuthenticatedUser,
  ) {
    const ordem = await this.buscarOrdemBase(condominioId, ordemId);

    if (
      ordem.status === StatusOrdemServico.CONCLUIDA ||
      ordem.status === StatusOrdemServico.CANCELADA
    ) {
      throw new BadRequestException(
        'Esta ordem não pode mais ser cancelada.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.ordemServico.update({
        where: {
          id: ordem.id,
        },
        data: {
          status: StatusOrdemServico.CANCELADA,
          canceladaEm: new Date(),
          motivoCancelamento: dto.motivoCancelamento.trim(),
        },
      });

      await tx.ordemServicoHistoricoStatus.create({
        data: {
          ordemServicoId: ordem.id,
          usuarioId: usuario.id,
          statusAnterior: ordem.status,
          statusNovo: StatusOrdemServico.CANCELADA,
          observacao: dto.motivoCancelamento.trim(),
        },
      });

      return atualizada;
    });
  }

  private async buscarOrdemBase(
    condominioId: number,
    ordemId: number,
  ) {
    const ordem = await this.prisma.ordemServico.findFirst({
      where: {
        id: ordemId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    return ordem;
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

  private async garantirOcorrencia(
    condominioId: number,
    ocorrenciaId: number,
  ): Promise<void> {
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
      throw new NotFoundException('Unidade não encontrada.');
    }
  }

  private async garantirPrestador(
    condominioId: number,
    prestadorId: number,
  ): Promise<void> {
    const prestador = await this.prisma.prestadorServico.findFirst({
      where: {
        id: prestadorId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!prestador) {
      throw new NotFoundException('Prestador não encontrado.');
    }
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
