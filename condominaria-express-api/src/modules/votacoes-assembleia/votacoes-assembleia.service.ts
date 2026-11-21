import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusAssembleia,
  StatusPautaAssembleia,
  StatusVotacaoAssembleia,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateOpcaoVotacaoDto } from './dto/create-opcao-votacao.dto';
import { CreateVotacaoAssembleiaDto } from './dto/create-votacao-assembleia.dto';
import { RegistrarVotoAssembleiaDto } from './dto/registrar-voto-assembleia.dto';

@Injectable()
export class VotacoesAssembleiaService {
  constructor(private readonly prisma: PrismaService) {}


  async resumoAdmin(condominioId: number) {
    const [contagensPorStatus, totalVotos, votacoesAbertasPorAssembleia] =
      await Promise.all([
        this.prisma.votacaoAssembleia.groupBy({
          by: ['status'],
          where: {
            condominioId,
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.votoAssembleia.count({
          where: {
            votacao: {
              condominioId,
            },
          },
        }),
        this.prisma.votacaoAssembleia.groupBy({
          by: ['assembleiaId'],
          where: {
            condominioId,
            status: StatusVotacaoAssembleia.ABERTA,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    const contarStatus = (status: StatusVotacaoAssembleia) =>
      contagensPorStatus.find((item) => item.status === status)?._count._all ??
      0;

    const rascunho = contarStatus(StatusVotacaoAssembleia.RASCUNHO);
    const abertas = contarStatus(StatusVotacaoAssembleia.ABERTA);
    const encerradas = contarStatus(StatusVotacaoAssembleia.ENCERRADA);
    const canceladas = contarStatus(StatusVotacaoAssembleia.CANCELADA);

    return {
      abertas,
      encerradas,
      rascunho,
      canceladas,
      totalVotacoes: rascunho + abertas + encerradas + canceladas,
      totalVotos,
      assembleiasComVotacaoAberta: votacoesAbertasPorAssembleia.length,
      votacoesAbertasPorAssembleia: votacoesAbertasPorAssembleia.map(
        (item) => ({
          assembleiaId: item.assembleiaId,
          abertas: item._count._all,
        }),
      ),
    };
  }

  async criarVotacao(
    condominioId: number,
    assembleiaId: number,
    pautaId: number,
    dto: CreateVotacaoAssembleiaDto,
    usuario: AuthenticatedUser,
  ) {
    const assembleia = await this.buscarAssembleia(
      condominioId,
      assembleiaId,
    );

    if (
      assembleia.status === StatusAssembleia.ENCERRADA ||
      assembleia.status === StatusAssembleia.CANCELADA
    ) {
      throw new BadRequestException(
        'Não é possível criar votação em assembleia encerrada ou cancelada.',
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
        'A votação só pode ser criada para uma pauta aberta.',
      );
    }

    try {
      return await this.prisma.votacaoAssembleia.create({
        data: {
          condominioId,
          assembleiaId,
          pautaId,
          criadoPorUsuarioId: usuario.id,
          titulo: dto.titulo.trim(),
          descricao: this.normalizarOpcional(dto.descricao),
        },
        include: {
          pauta: {
            select: {
              id: true,
              titulo: true,
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esta pauta já possui uma votação vinculada.',
        );
      }

      throw error;
    }
  }

  async criarOpcao(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
    dto: CreateOpcaoVotacaoDto,
  ) {
    const votacao = await this.buscarVotacaoBase(
      condominioId,
      assembleiaId,
      votacaoId,
    );

    if (votacao.status !== StatusVotacaoAssembleia.RASCUNHO) {
      throw new BadRequestException(
        'Opções só podem ser adicionadas antes da abertura da votação.',
      );
    }

    try {
      return await this.prisma.opcaoVotacaoAssembleia.create({
        data: {
          votacaoId,
          descricao: dto.descricao.trim(),
          ordem: dto.ordem ?? 0,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe uma opção com essa descrição nesta votação.',
        );
      }

      throw error;
    }
  }

  async buscarVotacao(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    const votacao = await this.prisma.votacaoAssembleia.findFirst({
      where: {
        id: votacaoId,
        condominioId,
        assembleiaId,
      },
      include: {
        pauta: {
          select: {
            id: true,
            titulo: true,
            status: true,
          },
        },
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
        votos: {
          include: {
            opcao: {
              select: {
                id: true,
                descricao: true,
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
            registradoEm: 'desc',
          },
        },
      },
    });

    if (!votacao) {
      throw new NotFoundException('Votação não encontrada.');
    }

    return votacao;
  }

  async abrir(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    const assembleia = await this.buscarAssembleia(
      condominioId,
      assembleiaId,
    );

    if (assembleia.status !== StatusAssembleia.EM_ANDAMENTO) {
      throw new BadRequestException(
        'A votação só pode ser aberta durante uma assembleia em andamento.',
      );
    }

    const votacao = await this.prisma.votacaoAssembleia.findFirst({
      where: {
        id: votacaoId,
        condominioId,
        assembleiaId,
      },
      include: {
        _count: {
          select: {
            opcoes: true,
          },
        },
      },
    });

    if (!votacao) {
      throw new NotFoundException('Votação não encontrada.');
    }

    if (votacao.status !== StatusVotacaoAssembleia.RASCUNHO) {
      throw new BadRequestException(
        'Apenas votações em rascunho podem ser abertas.',
      );
    }

    if (votacao._count.opcoes < 2) {
      throw new BadRequestException(
        'A votação precisa ter pelo menos duas opções antes de ser aberta.',
      );
    }

    return this.prisma.votacaoAssembleia.update({
      where: {
        id: votacao.id,
      },
      data: {
        status: StatusVotacaoAssembleia.ABERTA,
        abertaEm: new Date(),
      },
    });
  }

  async encerrar(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    const votacao = await this.buscarVotacaoBase(
      condominioId,
      assembleiaId,
      votacaoId,
    );

    if (votacao.status !== StatusVotacaoAssembleia.ABERTA) {
      throw new BadRequestException(
        'Apenas votações abertas podem ser encerradas.',
      );
    }

    return this.prisma.votacaoAssembleia.update({
      where: {
        id: votacao.id,
      },
      data: {
        status: StatusVotacaoAssembleia.ENCERRADA,
        encerradaEm: new Date(),
      },
    });
  }

  async registrarVoto(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
    dto: RegistrarVotoAssembleiaDto,
    usuario: AuthenticatedUser,
  ) {
    const votacao = await this.buscarVotacaoBase(
      condominioId,
      assembleiaId,
      votacaoId,
    );

    if (votacao.status !== StatusVotacaoAssembleia.ABERTA) {
      throw new BadRequestException(
        'A votação não está aberta para recebimento de votos.',
      );
    }

    await this.garantirOpcao(votacaoId, dto.opcaoId);
    await this.garantirUnidade(condominioId, dto.unidadeId);

    if (dto.moradorId) {
      await this.garantirMorador(condominioId, dto.moradorId);
      await this.garantirVinculoMoradorUnidade(
        dto.moradorId,
        dto.unidadeId,
      );
    }

    try {
      return await this.prisma.votoAssembleia.create({
        data: {
          votacaoId,
          opcaoId: dto.opcaoId,
          unidadeId: dto.unidadeId,
          moradorId: dto.moradorId ?? null,
          registradoPorUsuarioId: usuario.id,
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
        include: {
          opcao: {
            select: {
              id: true,
              descricao: true,
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esta unidade já registrou voto nesta votação.',
        );
      }

      throw error;
    }
  }

  async resultados(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    await this.buscarVotacaoBase(
      condominioId,
      assembleiaId,
      votacaoId,
    );

    const opcoes = await this.prisma.opcaoVotacaoAssembleia.findMany({
      where: {
        votacaoId,
      },
      orderBy: [
        {
          ordem: 'asc',
        },
        {
          criadoEm: 'asc',
        },
      ],
      select: {
        id: true,
        descricao: true,
        ordem: true,
      },
    });

    const grupos = await this.prisma.votoAssembleia.groupBy({
      by: ['opcaoId'],
      where: {
        votacaoId,
      },
      _count: {
        _all: true,
      },
    });

    const totalVotos = grupos.reduce(
      (total, grupo) => total + grupo._count._all,
      0,
    );

    const mapaContagem = new Map(
      grupos.map((grupo) => [grupo.opcaoId, grupo._count._all]),
    );

    return {
      votacaoId,
      totalVotos,
      opcoes: opcoes.map((opcao) => {
        const votos = mapaContagem.get(opcao.id) ?? 0;
        const percentual =
          totalVotos > 0
            ? Number(((votos / totalVotos) * 100).toFixed(2))
            : 0;

        return {
          ...opcao,
          votos,
          percentual,
        };
      }),
    };
  }

  async auditoriaParticipacao(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    await this.buscarVotacaoBase(
      condominioId,
      assembleiaId,
      votacaoId,
    );

    const [
      unidadesAptas,
      votos,
      presencas,
    ] = await Promise.all([
      this.prisma.unidade.findMany({
        where: {
          condominioId,
          ativo: true,
        },
        orderBy: [
          {
            identificador: 'asc',
          },
          {
            numero: 'asc',
          },
        ],
        select: {
          id: true,
          identificador: true,
          numero: true,
          bloco: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      }),

      this.prisma.votoAssembleia.findMany({
        where: {
          votacaoId,
        },
        orderBy: [
          {
            registradoEm: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        select: {
          id: true,
          unidadeId: true,
          moradorId: true,
          registradoEm: true,
          unidade: {
            select: {
              id: true,
              identificador: true,
              numero: true,
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
            },
          },
        },
      }),

      this.prisma.presencaAssembleia.findMany({
        where: {
          condominioId,
          assembleiaId,
        },
        select: {
          unidadeId: true,
          porProcuracao: true,
        },
      }),
    ]);

    const mapaPresencas = new Map(
      presencas.map((presenca) => [
        presenca.unidadeId,
        presenca.porProcuracao,
      ]),
    );

    const idsParticipantes = new Set(
      votos.map((voto) => voto.unidadeId),
    );

    const participantes = votos.map((voto) => ({
      id: voto.id,
      unidadeId: voto.unidadeId,
      registradoEm: voto.registradoEm,
      porProcuracao: mapaPresencas.get(voto.unidadeId) ?? false,
      unidade: voto.unidade,
      morador: voto.morador,
    }));

    const ausentes = unidadesAptas.filter(
      (unidade) => !idsParticipantes.has(unidade.id),
    );

    const totalUnidadesAptas = unidadesAptas.length;
    const totalParticipantes = participantes.length;
    const totalAusentes = ausentes.length;

    const percentualParticipacao =
      totalUnidadesAptas > 0
        ? Number(
            ((totalParticipantes / totalUnidadesAptas) * 100).toFixed(2),
          )
        : 0;

    return {
      votacaoId,
      resumo: {
        totalUnidadesAptas,
        totalParticipantes,
        totalAusentes,
        percentualParticipacao,
      },
      participantes,
      ausentes,
    };
  }

  private async buscarAssembleia(
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

  private async buscarVotacaoBase(
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    const votacao = await this.prisma.votacaoAssembleia.findFirst({
      where: {
        id: votacaoId,
        condominioId,
        assembleiaId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!votacao) {
      throw new NotFoundException('Votação não encontrada.');
    }

    return votacao;
  }

  private async garantirOpcao(
    votacaoId: number,
    opcaoId: number,
  ): Promise<void> {
    const opcao = await this.prisma.opcaoVotacaoAssembleia.findFirst({
      where: {
        id: opcaoId,
        votacaoId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!opcao) {
      throw new NotFoundException('Opção de voto não encontrada.');
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
