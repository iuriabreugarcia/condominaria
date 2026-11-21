import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoUnidade } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateUnidadeDto } from './dto/create-unidade.dto';

@Injectable()
export class UnidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(condominioId: number, dto: CreateUnidadeDto) {
    await this.garantirCondominio(condominioId);

    const numero = dto.numero.trim();

    const bloco = dto.blocoId
      ? await this.prisma.bloco.findFirst({
          where: {
            id: dto.blocoId,
            condominioId,
            ativo: true,
          },
          select: {
            id: true,
            nome: true,
          },
        })
      : null;

    if (dto.blocoId && !bloco) {
      throw new NotFoundException('Bloco não encontrado neste condomínio.');
    }

    const identificador = bloco ? `${bloco.nome} - ${numero}` : numero;

    try {
      return await this.prisma.unidade.create({
        data: {
          condominioId,
          blocoId: bloco?.id ?? null,
          numero,
          identificador,
          tipo: dto.tipo ?? TipoUnidade.APARTAMENTO,
          andar: dto.andar ?? null,
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
        include: {
          bloco: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma unidade com esse identificador no condomínio.',
        );
      }

      throw error;
    }
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.unidade.findMany({
      where: {
        condominioId,
      },
      include: {
        bloco: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        identificador: 'asc',
      },
    });
  }

  async findOne(condominioId: number, unidadeId: number) {
    const unidade = await this.prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        condominioId,
      },
      include: {
        bloco: {
          select: {
            id: true,
            nome: true,
          },
        },
        moradores: {
          where: {
            ativo: true,
          },
          select: {
            id: true,
            papel: true,
            principal: true,
            ativo: true,
            morador: {
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                ativo: true,
              },
            },
          },
          orderBy: {
            principal: 'desc',
          },
        },
      },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada.');
    }

    return unidade;
  }

  private async garantirCondominio(condominioId: number): Promise<void> {
    const condominio = await this.prisma.condominio.findUnique({
      where: { id: condominioId },
      select: { id: true },
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
