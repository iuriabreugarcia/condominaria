import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateAreaComumDto } from './dto/create-area-comum.dto';

@Injectable()
export class AreasComunsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(condominioId: number, dto: CreateAreaComumDto) {
    await this.garantirCondominio(condominioId);

    try {
      return await this.prisma.areaComum.create({
        data: {
          condominioId,
          nome: dto.nome.trim(),
          descricao: this.normalizarOpcional(dto.descricao),
          capacidade: dto.capacidade ?? null,
          exigeAprovacao: dto.exigeAprovacao ?? true,
          permiteReserva: dto.permiteReserva ?? true,
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma área comum com esse nome neste condomínio.',
        );
      }

      throw error;
    }
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.areaComum.findMany({
      where: {
        condominioId,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async findOne(condominioId: number, areaComumId: number) {
    const area = await this.prisma.areaComum.findFirst({
      where: {
        id: areaComumId,
        condominioId,
      },
      include: {
        reservas: {
          orderBy: {
            inicioEm: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!area) {
      throw new NotFoundException('Área comum não encontrada.');
    }

    return area;
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
