import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatusAssembleia,
  StatusPautaAssembleia,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CancelarAssembleiaDto } from './dto/cancelar-assembleia.dto';
import { CreateAssembleiaDto } from './dto/create-assembleia.dto';
import { CreatePautaAssembleiaDto } from './dto/create-pauta-assembleia.dto';
import { CreatePresencaAssembleiaDto } from './dto/create-presenca-assembleia.dto';
import { DeliberarPautaAssembleiaDto } from './dto/deliberar-pauta-assembleia.dto';

@Injectable()
export class AssembleiasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    condominioId: number,
    dto: CreateAssembleiaDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const primeiraChamadaEm = new Date(dto.primeiraChamadaEm);
    const segundaChamadaEm = dto.segundaChamadaEm
      ? new Date(dto.segundaChamadaEm)
      : null;

    if (
      segundaChamadaEm &&
      segundaChamadaEm <= primeiraChamadaEm
    ) {
      throw new BadRequestException(
        'A segunda chamada deve ser posterior à primeira chamada.',
      );
    }

    return this.prisma.assembleia.create({
      data: {
        condominioId,
        criadoPorUsuarioId: usuario.id,
        titulo: dto.titulo.trim(),
        descricao: this.normalizarOpcional(dto.descricao),
        modalidade: dto.modalidade,
        local: this.normalizarOpcional(dto.local),
        linkOnline: this.normalizarOpcional(dto.linkOnline),
        primeiraChamadaEm,
        segundaChamadaEm,
      },
      include: {
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

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.assembleia.findMany({
      where: {
        condominioId,
      },
      include: {
        _count: {
          select: {
            pautas: true,
          },
        },
      },
      orderBy: {
        primeiraChamadaEm: 'desc',
      },
    });
  }

  async findOne(condominioId: number, assembleiaId: number) {
    const assembleia = await this.prisma.assembleia.findFirst({
      where: {
        id: assembleiaId,
        condominioId,
      },
      include: {
        criadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        pautas: {
          include: {
            criadoPorUsuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            votacao: {
              include: {
                opcoes: {
                  orderBy: [
                    {
                      ordem: 'asc',
                    },
                    {
                      criadoEm: 'asc',
                    },
                  ],
                },
                _count: {
                  select: {
                    votos: true,
                  },
                },
              },
            },
          },
          orderBy: [
            {
              ordem: 'asc',
            },
            {
              criadoEm: 'asc',
            },
          ],
        },
      },
    });

    if (!assembleia) {
      throw new NotFoundException('Assembleia não encontrada.');
    }

    return assembleia;
  }

  async convocar(condominioId: number, assembleiaId: number) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (assembleia.status !== StatusAssembleia.RASCUNHO) {
      throw new BadRequestException(
        'Apenas assembleias em rascunho podem ser convocadas.',
      );
    }

    return this.prisma.assembleia.update({
      where: {
        id: assembleia.id,
      },
      data: {
        status: StatusAssembleia.CONVOCADA,
        convocadaEm: new Date(),
      },
    });
  }

  async iniciar(condominioId: number, assembleiaId: number) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (assembleia.status !== StatusAssembleia.CONVOCADA) {
      throw new BadRequestException(
        'Apenas assembleias convocadas podem ser iniciadas.',
      );
    }

    return this.prisma.assembleia.update({
      where: {
        id: assembleia.id,
      },
      data: {
        status: StatusAssembleia.EM_ANDAMENTO,
        iniciadaEm: new Date(),
      },
    });
  }

  async encerrar(condominioId: number, assembleiaId: number) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (assembleia.status !== StatusAssembleia.EM_ANDAMENTO) {
      throw new BadRequestException(
        'Apenas assembleias em andamento podem ser encerradas.',
      );
    }

    return this.prisma.assembleia.update({
      where: {
        id: assembleia.id,
      },
      data: {
        status: StatusAssembleia.ENCERRADA,
        encerradaEm: new Date(),
      },
    });
  }

  async cancelar(
    condominioId: number,
    assembleiaId: number,
    dto: CancelarAssembleiaDto,
  ) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (
      assembleia.status === StatusAssembleia.ENCERRADA ||
      assembleia.status === StatusAssembleia.CANCELADA
    ) {
      throw new BadRequestException(
        'Esta assembleia não pode mais ser cancelada.',
      );
    }

    return this.prisma.assembleia.update({
      where: {
        id: assembleia.id,
      },
      data: {
        status: StatusAssembleia.CANCELADA,
        canceladaEm: new Date(),
        motivoCancelamento: dto.motivoCancelamento.trim(),
      },
    });
  }

  async criarPauta(
    condominioId: number,
    assembleiaId: number,
    dto: CreatePautaAssembleiaDto,
    usuario: AuthenticatedUser,
  ) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (
      assembleia.status === StatusAssembleia.ENCERRADA ||
      assembleia.status === StatusAssembleia.CANCELADA
    ) {
      throw new BadRequestException(
        'Não é possível adicionar pautas a uma assembleia encerrada ou cancelada.',
      );
    }

    return this.prisma.pautaAssembleia.create({
      data: {
        assembleiaId,
        criadoPorUsuarioId: usuario.id,
        titulo: dto.titulo.trim(),
        descricao: this.normalizarOpcional(dto.descricao),
        ordem: dto.ordem ?? 0,
      },
      include: {
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

  async deliberarPauta(
    condominioId: number,
    assembleiaId: number,
    pautaId: number,
    dto: DeliberarPautaAssembleiaDto,
  ) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (assembleia.status !== StatusAssembleia.EM_ANDAMENTO) {
      throw new BadRequestException(
        'Pautas só podem ser deliberadas durante assembleias em andamento.',
      );
    }

    const pauta = await this.prisma.pautaAssembleia.findFirst({
      where: {
        id: pautaId,
        assembleiaId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!pauta) {
      throw new NotFoundException('Pauta não encontrada.');
    }

    if (pauta.status !== StatusPautaAssembleia.ABERTA) {
      throw new BadRequestException(
        'Apenas pautas abertas podem ser deliberadas.',
      );
    }

    return this.prisma.pautaAssembleia.update({
      where: {
        id: pauta.id,
      },
      data: {
        status: StatusPautaAssembleia.DELIBERADA,
        deliberacao: dto.deliberacao.trim(),
        deliberadaEm: new Date(),
      },
    });
  }

  async listarPresencas(
    condominioId: number,
    assembleiaId: number,
  ) {
    await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    return this.prisma.presencaAssembleia.findMany({
      where: {
        condominioId,
        assembleiaId,
      },
      include: {
        unidade: {
          select: {
            id: true,
            numero: true,
            identificador: true,
            bloco: {
              select: {
                id: true,
                nome: true,
              },
            },
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
        registradoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          registradoEm: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async resumoQuorum(
    condominioId: number,
    assembleiaId: number,
  ) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    const [
      totalUnidades,
      unidadesPresentes,
    ] = await Promise.all([
      this.prisma.unidade.count({
        where: {
          condominioId,
        },
      }),
      this.prisma.presencaAssembleia.count({
        where: {
          condominioId,
          assembleiaId,
        },
      }),
    ]);

    const percentualPresenca =
      totalUnidades > 0
        ? Number(((unidadesPresentes / totalUnidades) * 100).toFixed(2))
        : 0;

    return {
      assembleiaId: assembleia.id,
      totalUnidades,
      unidadesPresentes,
      unidadesAusentes: Math.max(totalUnidades - unidadesPresentes, 0),
      percentualPresenca,
    };
  }

  async registrarPresenca(
    condominioId: number,
    assembleiaId: number,
    dto: CreatePresencaAssembleiaDto,
    usuario: AuthenticatedUser,
  ) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (
      assembleia.status === StatusAssembleia.RASCUNHO ||
      assembleia.status === StatusAssembleia.ENCERRADA ||
      assembleia.status === StatusAssembleia.CANCELADA
    ) {
      throw new BadRequestException(
        'Presenças só podem ser registradas em assembleias convocadas ou em andamento.',
      );
    }

    const unidade = await this.prisma.unidade.findFirst({
      where: {
        id: dto.unidadeId,
        condominioId,
      },
      select: {
        id: true,
      },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada neste condomínio.');
    }

    if (dto.moradorId) {
      const morador = await this.prisma.morador.findFirst({
        where: {
          id: dto.moradorId,
          condominioId,
        },
        select: {
          id: true,
        },
      });

      if (!morador) {
        throw new NotFoundException('Morador não encontrado neste condomínio.');
      }
    }

    if (
      dto.porProcuracao &&
      !this.normalizarOpcional(dto.nomeRepresentante)
    ) {
      throw new BadRequestException(
        'A presença por procuração exige o nome do representante.',
      );
    }

    const presencaExistente =
      await this.prisma.presencaAssembleia.findFirst({
        where: {
          assembleiaId,
          unidadeId: dto.unidadeId,
        },
        select: {
          id: true,
        },
      });

    if (presencaExistente) {
      throw new BadRequestException(
        'Esta unidade já possui presença registrada nesta assembleia.',
      );
    }

    return this.prisma.presencaAssembleia.create({
      data: {
        condominioId,
        assembleiaId,
        unidadeId: dto.unidadeId,
        moradorId: dto.moradorId ?? null,
        registradoPorUsuarioId: usuario.id,
        nomeRepresentante: this.normalizarOpcional(dto.nomeRepresentante),
        documentoRepresentante: this.normalizarOpcional(
          dto.documentoRepresentante,
        ),
        porProcuracao: dto.porProcuracao ?? false,
        procuracaoObservacoes: dto.porProcuracao
          ? this.normalizarOpcional(dto.procuracaoObservacoes)
          : null,
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: {
        unidade: {
          select: {
            id: true,
            numero: true,
            identificador: true,
            bloco: {
              select: {
                id: true,
                nome: true,
              },
            },
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
        registradoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  async removerPresenca(
    condominioId: number,
    assembleiaId: number,
    presencaId: number,
  ) {
    const assembleia = await this.buscarAssembleiaBase(
      condominioId,
      assembleiaId,
    );

    if (
      assembleia.status === StatusAssembleia.ENCERRADA ||
      assembleia.status === StatusAssembleia.CANCELADA
    ) {
      throw new BadRequestException(
        'Presenças não podem ser removidas de assembleias encerradas ou canceladas.',
      );
    }

    const presenca = await this.prisma.presencaAssembleia.findFirst({
      where: {
        id: presencaId,
        condominioId,
        assembleiaId,
      },
      select: {
        id: true,
      },
    });

    if (!presenca) {
      throw new NotFoundException('Presença não encontrada.');
    }

    return this.prisma.presencaAssembleia.delete({
      where: {
        id: presenca.id,
      },
    });
  }

  private async buscarAssembleiaBase(
    condominioId: number,
    assembleiaId: number,
  ) {
    const assembleia = await this.prisma.assembleia.findFirst({
      where: {
        id: assembleiaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!assembleia) {
      throw new NotFoundException('Assembleia não encontrada.');
    }

    return assembleia;
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
