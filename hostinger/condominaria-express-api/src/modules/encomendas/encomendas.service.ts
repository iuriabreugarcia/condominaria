import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatusEncomendaPortaria,
  TipoEncomendaPortaria,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateEncomendaDto } from './dto/create-encomenda.dto';
import { DevolverEncomendaDto } from './dto/devolver-encomenda.dto';
import { RetirarEncomendaDto } from './dto/retirar-encomenda.dto';

@Injectable()
export class EncomendasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    condominioId: number,
    dto: CreateEncomendaDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);
    await this.garantirUnidade(condominioId, dto.unidadeId);

    if (dto.moradorId) {
      await this.garantirMorador(condominioId, dto.moradorId);
      await this.garantirVinculoMoradorUnidade(
        dto.moradorId,
        dto.unidadeId,
      );
    }

    return this.prisma.encomendaPortaria.create({
      data: {
        condominioId,
        unidadeId: dto.unidadeId,
        moradorId: dto.moradorId ?? null,
        recebidoPorUsuarioId: usuario.id,
        tipo: dto.tipo ?? TipoEncomendaPortaria.ENCOMENDA,
        descricao: dto.descricao.trim(),
        remetente: this.normalizarOpcional(dto.remetente),
        codigoRastreio: this.normalizarOpcional(dto.codigoRastreio),
        destinatarioNome: this.normalizarOpcional(dto.destinatarioNome),
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: this.includeEncomendaResumo(),
    });
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.encomendaPortaria.findMany({
      where: {
        condominioId,
      },
      include: this.includeEncomendaResumo(),
      orderBy: {
        recebidoEm: 'desc',
      },
    });
  }

  async findOne(condominioId: number, encomendaId: number) {
    const encomenda = await this.prisma.encomendaPortaria.findFirst({
      where: {
        id: encomendaId,
        condominioId,
      },
      include: {
        unidade: true,
        morador: true,
        recebidoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        retiradoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        devolvidoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!encomenda) {
      throw new NotFoundException('Encomenda não encontrada.');
    }

    return encomenda;
  }

  async retirar(
    condominioId: number,
    encomendaId: number,
    dto: RetirarEncomendaDto,
    usuario: AuthenticatedUser,
  ) {
    const encomenda = await this.prisma.encomendaPortaria.findFirst({
      where: {
        id: encomendaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!encomenda) {
      throw new NotFoundException('Encomenda não encontrada.');
    }

    if (encomenda.status !== StatusEncomendaPortaria.RECEBIDA) {
      throw new BadRequestException(
        'Apenas encomendas recebidas podem ser retiradas.',
      );
    }

    return this.prisma.encomendaPortaria.update({
      where: {
        id: encomenda.id,
      },
      data: {
        status: StatusEncomendaPortaria.RETIRADA,
        retiradoEm: new Date(),
        retiradoPorUsuarioId: usuario.id,
        retiradoPorNome: dto.retiradoPorNome.trim(),
        observacoesRetirada: this.normalizarOpcional(
          dto.observacoesRetirada,
        ),
      },
      include: this.includeEncomendaResumo(),
    });
  }

  async devolver(
    condominioId: number,
    encomendaId: number,
    dto: DevolverEncomendaDto,
    usuario: AuthenticatedUser,
  ) {
    const encomenda = await this.prisma.encomendaPortaria.findFirst({
      where: {
        id: encomendaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!encomenda) {
      throw new NotFoundException('Encomenda não encontrada.');
    }

    if (encomenda.status !== StatusEncomendaPortaria.RECEBIDA) {
      throw new BadRequestException(
        'Apenas encomendas recebidas podem ser devolvidas.',
      );
    }

    return this.prisma.encomendaPortaria.update({
      where: {
        id: encomenda.id,
      },
      data: {
        status: StatusEncomendaPortaria.DEVOLVIDA,
        devolvidoEm: new Date(),
        devolvidoPorUsuarioId: usuario.id,
        motivoDevolucao: dto.motivoDevolucao.trim(),
      },
      include: this.includeEncomendaResumo(),
    });
  }

  async findAllPortal(
    condominioId: number,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const morador = await this.prisma.morador.findFirst({
      where: {
        condominioId,
        ativo: true,
        OR: [
          {
            usuarioId: usuario.id,
          },
          ...(usuario.email
            ? [
                {
                  email: usuario.email,
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
      },
    });

    if (!morador) {
      return [];
    }

    const vinculos = await this.prisma.moradorUnidade.findMany({
      where: {
        moradorId: morador.id,
        ativo: true,
        unidade: {
          condominioId,
          ativo: true,
        },
      },
      select: {
        unidadeId: true,
      },
    });

    const unidadeIds = vinculos.map((vinculo) => vinculo.unidadeId);

    if (unidadeIds.length === 0) {
      return [];
    }

    const encomendas = await this.prisma.encomendaPortaria.findMany({
      where: {
        condominioId,
        OR: [
          {
            moradorId: morador.id,
          },
          {
            unidadeId: {
              in: unidadeIds,
            },
          },
        ],
      },
      include: this.includeEncomendaResumo(),
      orderBy: {
        recebidoEm: 'desc',
      },
    });

    return encomendas.map((encomenda) => ({
      ...encomenda,
      nomeDestinatario: encomenda.destinatarioNome,
      transportadora: null,
    }));
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

  private includeEncomendaResumo() {
    return {
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
          email: true,
        },
      },
      recebidoPorUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      retiradoPorUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      devolvidoPorUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
    };
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
