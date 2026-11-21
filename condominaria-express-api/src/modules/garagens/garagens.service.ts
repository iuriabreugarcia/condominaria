import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoVagaGaragem } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateVagaGaragemDto } from './dto/create-vaga-garagem.dto';

@Injectable()
export class GaragensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(condominioId: number, dto: CreateVagaGaragemDto) {
    await this.garantirCondominio(condominioId);

    if (dto.unidadeId) {
      await this.garantirUnidade(condominioId, dto.unidadeId);
    }

    try {
      return await this.prisma.vagaGaragem.create({
        data: {
          condominioId,
          unidadeId: dto.unidadeId ?? null,
          identificador: dto.identificador.trim(),
          tipo: dto.tipo ?? TipoVagaGaragem.PRIVATIVA,
          descricao: this.normalizarOpcional(dto.descricao),
        },
        include: {
          unidade: {
            select: {
              id: true,
              identificador: true,
              numero: true,
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
          'Já existe uma vaga com esse identificador neste condomínio.',
        );
      }

      throw error;
    }
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.vagaGaragem.findMany({
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
      },
      orderBy: {
        identificador: 'asc',
      },
    });
  }

  async findOne(condominioId: number, vagaId: number) {
    const vaga = await this.prisma.vagaGaragem.findFirst({
      where: {
        id: vagaId,
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
        veiculos: {
          where: {
            ativo: true,
          },
          select: {
            id: true,
            tipo: true,
            placa: true,
            marca: true,
            modelo: true,
            cor: true,
          },
        },
      },
    });

    if (!vaga) {
      throw new NotFoundException('Vaga de garagem não encontrada.');
    }

    return vaga;
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

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
