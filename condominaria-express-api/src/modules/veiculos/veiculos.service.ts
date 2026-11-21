import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';

@Injectable()
export class VeiculosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(condominioId: number, dto: CreateVeiculoDto) {
    await this.garantirCondominio(condominioId);
    await this.garantirUnidade(condominioId, dto.unidadeId);

    if (dto.moradorId) {
      await this.garantirMorador(condominioId, dto.moradorId);
      await this.garantirVinculoMoradorUnidade(
        dto.moradorId,
        dto.unidadeId,
      );
    }

    if (dto.vagaGaragemId) {
      const vaga = await this.prisma.vagaGaragem.findFirst({
        where: {
          id: dto.vagaGaragemId,
          condominioId,
          ativo: true,
        },
        select: {
          id: true,
          unidadeId: true,
        },
      });

      if (!vaga) {
        throw new NotFoundException('Vaga de garagem não encontrada.');
      }

      if (vaga.unidadeId && vaga.unidadeId !== dto.unidadeId) {
        throw new BadRequestException(
          'A vaga informada pertence a outra unidade.',
        );
      }
    }

    try {
      return await this.prisma.veiculo.create({
        data: {
          condominioId,
          unidadeId: dto.unidadeId,
          moradorId: dto.moradorId ?? null,
          vagaGaragemId: dto.vagaGaragemId ?? null,
          tipo: dto.tipo,
          placa: this.normalizarPlaca(dto.placa),
          marca: this.normalizarOpcional(dto.marca),
          modelo: this.normalizarOpcional(dto.modelo),
          cor: this.normalizarOpcional(dto.cor),
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
          vagaGaragem: {
            select: {
              id: true,
              identificador: true,
              tipo: true,
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
          'Já existe veículo com essa placa neste condomínio.',
        );
      }

      throw error;
    }
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.veiculo.findMany({
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
            telefone: true,
          },
        },
        vagaGaragem: {
          select: {
            id: true,
            identificador: true,
            tipo: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
    });
  }

  async findOne(condominioId: number, veiculoId: number) {
    const veiculo = await this.prisma.veiculo.findFirst({
      where: {
        id: veiculoId,
        condominioId,
      },
      include: {
        unidade: true,
        morador: true,
        vagaGaragem: true,
      },
    });

    if (!veiculo) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    return veiculo;
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

  private normalizarPlaca(valor?: string): string | null {
    const normalizado = valor?.trim().toUpperCase();
    return normalizado ? normalizado : null;
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
