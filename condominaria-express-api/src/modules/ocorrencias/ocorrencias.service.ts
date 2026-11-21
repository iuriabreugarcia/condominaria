import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrioridadeOcorrencia,
  StatusOcorrencia,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateOcorrenciaDto } from './dto/create-ocorrencia.dto';
import { UpdateStatusOcorrenciaDto } from './dto/update-status-ocorrencia.dto';

@Injectable()
export class OcorrenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    condominioId: number,
    dto: CreateOcorrenciaDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    if (dto.unidadeId) {
      await this.garantirUnidade(condominioId, dto.unidadeId);
    }

    if (dto.moradorId) {
      await this.garantirMorador(condominioId, dto.moradorId);
    }

    if (dto.unidadeId && dto.moradorId) {
      await this.garantirVinculoMoradorUnidade(
        dto.moradorId,
        dto.unidadeId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const ocorrencia = await tx.ocorrencia.create({
        data: {
          condominioId,
          unidadeId: dto.unidadeId ?? null,
          moradorId: dto.moradorId ?? null,
          criadoPorUsuarioId: usuario.id,
          titulo: dto.titulo.trim(),
          descricao: dto.descricao.trim(),
          categoria: this.normalizarOpcional(dto.categoria),
          prioridade: dto.prioridade ?? PrioridadeOcorrencia.MEDIA,
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
          criadoPorUsuario: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      });

      await tx.ocorrenciaHistoricoStatus.create({
        data: {
          ocorrenciaId: ocorrencia.id,
          usuarioId: usuario.id,
          statusAnterior: null,
          statusNovo: StatusOcorrencia.ABERTA,
          observacao: 'Ocorrência registrada.',
        },
      });

      return ocorrencia;
    });
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.ocorrencia.findMany({
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
        criadoPorUsuario: {
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
    });
  }

  async findOne(condominioId: number, ocorrenciaId: number) {
    const ocorrencia = await this.prisma.ocorrencia.findFirst({
      where: {
        id: ocorrenciaId,
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

    if (!ocorrencia) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    return ocorrencia;
  }

  async atualizarStatus(
    condominioId: number,
    ocorrenciaId: number,
    dto: UpdateStatusOcorrenciaDto,
    usuario: AuthenticatedUser,
  ) {
    const ocorrencia = await this.prisma.ocorrencia.findFirst({
      where: {
        id: ocorrenciaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!ocorrencia) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    if (ocorrencia.status === dto.status) {
      throw new BadRequestException(
        'A ocorrência já está com esse status.',
      );
    }

    const encerra =
      dto.status === StatusOcorrencia.RESOLVIDA ||
      dto.status === StatusOcorrencia.CANCELADA;

    return this.prisma.$transaction(async (tx) => {
      const atualizada = await tx.ocorrencia.update({
        where: {
          id: ocorrencia.id,
        },
        data: {
          status: dto.status,
          encerradaEm: encerra ? new Date() : null,
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
            },
          },
        },
      });

      await tx.ocorrenciaHistoricoStatus.create({
        data: {
          ocorrenciaId: ocorrencia.id,
          usuarioId: usuario.id,
          statusAnterior: ocorrencia.status,
          statusNovo: dto.status,
          observacao: this.normalizarOpcional(dto.observacao),
        },
      });

      return atualizada;
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
      throw new NotFoundException('Morador não encontrado.');
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
        'O morador informado não está vinculado à unidade informada.',
      );
    }
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
