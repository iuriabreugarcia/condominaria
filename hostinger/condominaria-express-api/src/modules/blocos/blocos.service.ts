import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateBlocoDto } from './dto/create-bloco.dto';

@Injectable()
export class BlocosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(condominioId: number, dto: CreateBlocoDto) {
    await this.garantirCondominio(condominioId);

    try {
      return await this.prisma.bloco.create({
        data: {
          condominioId,
          nome: dto.nome.trim(),
          descricao: this.normalizarOpcional(dto.descricao),
          ordem: dto.ordem ?? 0,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um bloco com esse nome neste condomínio.',
        );
      }

      throw error;
    }
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.bloco.findMany({
      where: {
        condominioId,
      },
      orderBy: [
        {
          ordem: 'asc',
        },
        {
          nome: 'asc',
        },
      ],
    });
  }

  async findOne(condominioId: number, blocoId: number) {
    const bloco = await this.prisma.bloco.findFirst({
      where: {
        id: blocoId,
        condominioId,
      },
    });

    if (!bloco) {
      throw new NotFoundException('Bloco não encontrado.');
    }

    return bloco;
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
