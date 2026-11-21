import { BadRequestException, ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  PapelCondominio,
  Prisma,
  PrioridadeComunicado,
  PrioridadeOcorrencia,
  StatusCobrancaCondominial,
  StatusComunicado,
  StatusEncomendaPortaria,
  StatusOcorrencia,
  StatusReservaAreaComum,
  StatusAssembleia,
  StatusAutorizacaoVisitante,
  StatusVotacaoAssembleia,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AutorizarVisitantePortalDto } from './dto/autorizar-visitante-portal.dto';
import { CreateOcorrenciaPortalDto } from './dto/create-ocorrencia-portal.dto';
import { CreateReservaPortalDto } from './dto/create-reserva-portal.dto';
import { RegistrarVotoPortalDto } from './dto/registrar-voto-portal.dto';
import { CriarAcessoPortalMoradorDto } from './dto/criar-acesso-portal-morador.dto';
import { VincularUsuarioMoradorDto } from './dto/vincular-usuario-morador.dto';

function registrarErroPortalGovernanca(escopo: string, error: unknown) {
  try {
    const fs = require('fs');
    const path = require('path');

    const root = process.cwd();
    const logDir = path.join(root, 'tmp');
    const logFile = path.join(logDir, 'portal-governanca-erros.log');

    fs.mkdirSync(logDir, { recursive: true });

    const erro = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : { error };

    fs.appendFileSync(
      logFile,
      JSON.stringify(
        {
          data: new Date().toISOString(),
          escopo,
          erro,
        },
        null,
        2,
      ) + '\n---\n',
      'utf8',
    );
  } catch {
    // Não quebra a resposta por falha de log.
  }
}



function normalizarStatusAssembleiaPortal(valor: unknown) {
  const status = String(valor ?? '').trim().toUpperCase();

  if (
    status === 'AGENDADA' ||
    status === 'EM_ANDAMENTO' ||
    status === 'ENCERRADA' ||
    status === 'CANCELADA'
  ) {
    return status;
  }

  return undefined;
}

function normalizarDataPortal(valor: unknown) {
  const data = String(valor ?? '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }

  return undefined;
}



type PortalListQuery = Record<string, string | string[] | undefined>;

type PaginationOptions = {
  paginated: boolean;
  page: number;
  limit: number;
  skip: number;
  take: number;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class PortalMoradorService {
  constructor(private readonly prisma: PrismaService) {}

  private queryValue(query: PortalListQuery | undefined, key: string) {
    const value = query?.[key];

    if (Array.isArray(value)) {
      return value[0]?.trim() || undefined;
    }

    return value?.trim() || undefined;
  }

  private queryText(query: PortalListQuery | undefined, ...keys: string[]) {
    for (const key of keys) {
      const value = this.queryValue(query, key);

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private queryBoolean(query: PortalListQuery | undefined, key: string) {
    const value = this.queryValue(query, key)?.toLowerCase();

    if (!value) {
      return undefined;
    }

    if (['1', 'true', 'sim', 'yes'].includes(value)) {
      return true;
    }

    if (['0', 'false', 'nao', 'não', 'no'].includes(value)) {
      return false;
    }

    return undefined;
  }

  private queryEnum<T extends string>(
    query: PortalListQuery | undefined,
    key: string,
    values: Record<string, T>,
  ) {
    const value = this.queryValue(query, key)?.toUpperCase();

    if (!value) {
      return undefined;
    }

    return Object.values(values).includes(value as T) ? (value as T) : undefined;
  }

  private pagination(query: PortalListQuery | undefined): PaginationOptions {
    const rawPage = Number(this.queryValue(query, 'page') ?? 0);
    const rawLimit = Number(this.queryValue(query, 'limit') ?? 0);
    const paginated = Number.isFinite(rawPage) && rawPage > 0 || Number.isFinite(rawLimit) && rawLimit > 0;
    const page = Math.max(1, Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20),
    );

    return {
      paginated,
      page,
      limit,
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private async listResponse<T>(
    itemsPromise: Promise<T[]>,
    countPromise: Promise<number>,
    pagination: PaginationOptions,
  ): Promise<T[] | PaginatedResponse<T>> {
    if (!pagination.paginated) {
      return itemsPromise;
    }

    const [items, total] = await Promise.all([
      itemsPromise,
      countPromise,
    ]);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    };
  }

  private dateRange(
    query: PortalListQuery | undefined,
    startKey = 'dataInicio',
    endKey = 'dataFim',
  ) {
    const dataInicio = this.queryValue(query, startKey);
    const dataFim = this.queryValue(query, endKey);
    const range: { gte?: Date; lte?: Date } = {};

    if (dataInicio) {
      const parsed = new Date(`${dataInicio}T00:00:00`);

      if (!Number.isNaN(parsed.getTime())) {
        range.gte = parsed;
      }
    }

    if (dataFim) {
      const parsed = new Date(`${dataFim}T23:59:59`);

      if (!Number.isNaN(parsed.getTime())) {
        range.lte = parsed;
      }
    }

    return Object.keys(range).length > 0 ? range : undefined;
  }

  async vincularUsuario(
    condominioId: number,
    moradorId: number,
    dto: VincularUsuarioMoradorDto,
  ) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
        usuarioId: true,
      },
    });

    if (!morador) {
      throw new NotFoundException('Morador não encontrado.');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: dto.usuarioId,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const moradorJaVinculado = await this.prisma.morador.findFirst({
      where: {
        condominioId,
        usuarioId: dto.usuarioId,
        id: {
          not: moradorId,
        },
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (moradorJaVinculado) {
      throw new ConflictException(
        'Este usuário já está vinculado a outro morador neste condomínio.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const atualizado = await tx.morador.update({
          where: {
            id: moradorId,
          },
          data: {
            usuarioId: dto.usuarioId,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            condominio: {
              select: {
                id: true,
                nome: true,
                slug: true,
              },
            },
            unidades: {
              where: {
                ativo: true,
              },
              include: {
                unidade: {
                  select: {
                    id: true,
                    identificador: true,
                    numero: true,
                    tipo: true,
                  },
                },
              },
            },
          },
        });

        const vinculoUsuarioCondominio =
          await tx.usuarioCondominio.findUnique({
            where: {
              usuarioId_condominioId: {
                usuarioId: dto.usuarioId,
                condominioId,
              },
            },
          });

        if (!vinculoUsuarioCondominio) {
          await tx.usuarioCondominio.create({
            data: {
              usuarioId: dto.usuarioId,
              condominioId,
              papel: PapelCondominio.MORADOR,
              principal: false,
              ativo: true,
            },
          });
        } else if (!vinculoUsuarioCondominio.ativo) {
          await tx.usuarioCondominio.update({
            where: {
              id: vinculoUsuarioCondominio.id,
            },
            data: {
              ativo: true,
            },
          });
        }

        return atualizado;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este usuário já está vinculado a outro morador neste condomínio.',
        );
      }

      throw error;
    }
  }

  async criarAcessoPortal(
    condominioId: number,
    moradorId: number,
    dto: CriarAcessoPortalMoradorDto,
  ) {
    const email = dto.email.trim().toLowerCase();
    const telefoneInformado = dto.telefone?.trim() || null;

    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        usuarioId: true,
      },
    });

    if (!morador) {
      throw new NotFoundException('Morador não encontrado.');
    }

    if (morador.usuarioId) {
      throw new ConflictException(
        'Este morador já possui acesso ao Portal do Morador.',
      );
    }

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'Já existe um usuário com esse e-mail.',
      );
    }

    const senhaHash = await bcrypt.hash(dto.senha, 12);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            nome: morador.nome,
            email,
            telefone: telefoneInformado ?? morador.telefone,
            senhaHash,
          },
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            superAdmin: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        });

        const moradorAtualizado = await tx.morador.update({
          where: {
            id: morador.id,
          },
          data: {
            usuarioId: usuario.id,
            email: morador.email ?? email,
            telefone: morador.telefone ?? telefoneInformado,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            condominio: {
              select: {
                id: true,
                nome: true,
                slug: true,
              },
            },
            unidades: {
              where: {
                ativo: true,
              },
              include: {
                unidade: {
                  select: {
                    id: true,
                    identificador: true,
                    numero: true,
                    tipo: true,
                  },
                },
              },
            },
          },
        });

        await tx.usuarioCondominio.create({
          data: {
            usuarioId: usuario.id,
            condominioId,
            papel: PapelCondominio.MORADOR,
            principal: false,
            ativo: true,
          },
        });

        return {
          usuario,
          morador: moradorAtualizado,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Não foi possível criar o acesso. Verifique se o e-mail já está em uso.',
        );
      }

      throw error;
    }
  }

  async desvincularUsuario(
    condominioId: number,
    moradorId: number,
  ) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
      },
      select: {
        id: true,
      },
    });

    if (!morador) {
      throw new NotFoundException('Morador não encontrado.');
    }

    return this.prisma.morador.update({
      where: {
        id: morador.id,
      },
      data: {
        usuarioId: null,
      },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  async meuContexto(usuario: AuthenticatedUser) {
    const moradores = await this.prisma.morador.findMany({
      where: {
        usuarioId: usuario.id,
        ativo: true,
      },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
            slug: true,
            ativo: true,
          },
        },
        unidades: {
          where: {
            ativo: true,
          },
          include: {
            unidade: {
              select: {
                id: true,
                identificador: true,
                numero: true,
                tipo: true,
                andar: true,
                ativo: true,
              },
            },
          },
          orderBy: {
            criadoEm: 'asc',
          },
        },
      },
      orderBy: {
        criadoEm: 'asc',
      },
    });

    return {
      usuario: {
        id: usuario.id,
        email: usuario.email,
        superAdmin: usuario.superAdmin,
      },
      moradores,
    };
  }

  async dashboard(
    usuario: AuthenticatedUser,
    condominioId: number,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );

    const agora = new Date();

    const [
      comunicadosPublicados,
      cobrancasPendentes,
      encomendasPendentes,
      reservasAtivas,
      assembleiasAtivas,
      votacoesAbertas,
      ocorrenciasAbertas,
    ] = await Promise.all([
      this.prisma.comunicado.count({
        where: {
          condominioId,
          status: StatusComunicado.PUBLICADO,
          OR: [
            {
              expiraEm: null,
            },
            {
              expiraEm: {
                gte: agora,
              },
            },
          ],
        },
      }),

      this.prisma.cobrancaCondominial.count({
        where: {
          condominioId,
          unidadeId: {
            in: unidadeIds,
          },
          status: StatusCobrancaCondominial.PENDENTE,
        },
      }),

      this.prisma.encomendaPortaria.count({
        where: {
          condominioId,
          unidadeId: {
            in: unidadeIds,
          },
          status: StatusEncomendaPortaria.RECEBIDA,
        },
      }),

      this.prisma.reservaAreaComum.count({
        where: {
          condominioId,
          OR: [
            {
              moradorId: contexto.id,
            },
            {
              unidadeId: {
                in: unidadeIds,
              },
            },
          ],
          status: {
            in: [
              StatusReservaAreaComum.SOLICITADA,
              StatusReservaAreaComum.APROVADA,
            ],
          },
          fimEm: {
            gte: agora,
          },
        },
      }),

      this.prisma.assembleia.count({
        where: {
          condominioId,
          status: {
            in: [
              StatusAssembleia.CONVOCADA,
              StatusAssembleia.EM_ANDAMENTO,
            ],
          },
        },
      }),

      this.prisma.votacaoAssembleia.count({
        where: {
          condominioId,
          status: StatusVotacaoAssembleia.ABERTA,
        },
      }),

      this.prisma.ocorrencia.count({
        where: {
          condominioId,
          OR: [
            {
              moradorId: contexto.id,
            },
            {
              unidadeId: {
                in: unidadeIds,
              },
            },
          ],
          status: {
            in: [
              StatusOcorrencia.ABERTA,
              StatusOcorrencia.EM_ANALISE,
            ],
          },
        },
      }),
    ]);

    return {
      morador: {
        id: contexto.id,
        nome: contexto.nome,
        email: contexto.email,
        telefone: contexto.telefone,
      },
      condominio: contexto.condominio,
      unidades: contexto.unidades.map((vinculo) => vinculo.unidade),
      indicadores: {
        comunicadosPublicados,
        cobrancasPendentes,
        encomendasPendentes,
        reservasAtivas,
        assembleiasAtivas,
        votacoesAbertas,
        ocorrenciasAbertas,
      },
    };
  }


  async notificacoesPortal(
    usuario: AuthenticatedUser,
    condominioId: number,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );

    const agora = new Date();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [
      cobrancasPendentes,
      cobrancasVencidas,
      comunicadosPublicados,
      encomendasPendentes,
      reservasAtivas,
      ocorrenciasAbertas,
      votacoesAbertas,
      assembleiasAtivas,
    ] = await Promise.all([
      this.prisma.cobrancaCondominial.count({
        where: {
          condominioId,
          unidadeId: {
            in: unidadeIds,
          },
          status: StatusCobrancaCondominial.PENDENTE,
        },
      }),

      this.prisma.cobrancaCondominial.count({
        where: {
          condominioId,
          unidadeId: {
            in: unidadeIds,
          },
          status: StatusCobrancaCondominial.PENDENTE,
          vencimentoEm: {
            lt: hoje,
          },
        },
      }),

      this.prisma.comunicado.count({
        where: {
          condominioId,
          status: StatusComunicado.PUBLICADO,
          OR: [
            {
              expiraEm: null,
            },
            {
              expiraEm: {
                gte: agora,
              },
            },
          ],
        },
      }),

      this.prisma.encomendaPortaria.count({
        where: {
          condominioId,
          unidadeId: {
            in: unidadeIds,
          },
          status: StatusEncomendaPortaria.RECEBIDA,
        },
      }),

      this.prisma.reservaAreaComum.count({
        where: {
          condominioId,
          OR: [
            {
              moradorId: contexto.id,
            },
            {
              unidadeId: {
                in: unidadeIds,
              },
            },
          ],
          status: {
            in: [
              StatusReservaAreaComum.SOLICITADA,
              StatusReservaAreaComum.APROVADA,
            ],
          },
          fimEm: {
            gte: agora,
          },
        },
      }),

      this.prisma.ocorrencia.count({
        where: {
          condominioId,
          OR: [
            {
              moradorId: contexto.id,
            },
            {
              unidadeId: {
                in: unidadeIds,
              },
            },
          ],
          status: {
            in: [
              StatusOcorrencia.ABERTA,
              StatusOcorrencia.EM_ANALISE,
            ],
          },
        },
      }),

      this.prisma.votacaoAssembleia.count({
        where: {
          condominioId,
          status: StatusVotacaoAssembleia.ABERTA,
        },
      }),

      this.prisma.assembleia.count({
        where: {
          condominioId,
          status: {
            in: [
              StatusAssembleia.CONVOCADA,
              StatusAssembleia.EM_ANDAMENTO,
            ],
          },
        },
      }),
    ]);

    const atualizadoEm = agora.toISOString();

    const itens = [
      {
        id: `portal-cobrancas-vencidas:${cobrancasVencidas}`,
        tipo: 'COBRANCAS',
        label: 'Cobranças vencidas',
        descricao: 'Títulos vencidos que exigem atenção.',
        valor: cobrancasVencidas,
        to: '/cobrancas',
        prioridade: cobrancasVencidas > 0 ? 'ALTA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
      {
        id: `portal-cobrancas-pendentes:${cobrancasPendentes}`,
        tipo: 'COBRANCAS',
        label: 'Cobranças pendentes',
        descricao: 'Títulos em aberto para acompanhamento e pagamento.',
        valor: cobrancasPendentes,
        to: '/cobrancas',
        prioridade: cobrancasPendentes > 0 ? 'MEDIA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
      {
        id: `portal-comunicados:${comunicadosPublicados}`,
        tipo: 'COMUNICADOS',
        label: 'Comunicados publicados',
        descricao: 'Avisos recentes publicados pela administração.',
        valor: comunicadosPublicados,
        to: '/comunicados',
        prioridade: comunicadosPublicados > 0 ? 'MEDIA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
      {
        id: `portal-reservas:${reservasAtivas}`,
        tipo: 'RESERVAS',
        label: 'Reservas em acompanhamento',
        descricao: 'Solicitações pendentes de aprovação, reservas aprovadas e eventuais recusas.',
        valor: reservasAtivas,
        to: '/reservas',
        prioridade: reservasAtivas > 0 ? 'MEDIA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
      {
        id: `portal-ocorrencias:${ocorrenciasAbertas}`,
        tipo: 'OCORRENCIAS',
        label: 'Ocorrências em acompanhamento',
        descricao: 'Chamados abertos ou em análise.',
        valor: ocorrenciasAbertas,
        to: '/ocorrencias',
        prioridade: ocorrenciasAbertas > 0 ? 'ALTA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
      {
        id: `portal-encomendas:${encomendasPendentes}`,
        tipo: 'ENCOMENDAS',
        label: 'Encomendas aguardando retirada',
        descricao: 'Pacotes recebidos na portaria aguardando retirada pelo morador.',
        valor: encomendasPendentes,
        to: '/encomendas',
        prioridade: encomendasPendentes > 0 ? 'MEDIA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
      {
        id: `portal-votacoes:${votacoesAbertas}`,
        tipo: 'VOTACOES',
        label: 'Votações abertas',
        descricao: 'Votações disponíveis para participação.',
        valor: votacoesAbertas,
        to: '/votacoes',
        prioridade: votacoesAbertas > 0 ? 'MEDIA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
      {
        id: `portal-assembleias:${assembleiasAtivas}`,
        tipo: 'ASSEMBLEIAS',
        label: 'Assembleias ativas',
        descricao: 'Convocações, pautas e assembleias em andamento.',
        valor: assembleiasAtivas,
        to: '/assembleias',
        prioridade: assembleiasAtivas > 0 ? 'MEDIA' : 'NORMAL',
        lida: false,
        criadoEm: null,
        atualizadoEm,
      },
    ];

    return {
      itens,
      totalNaoLidas: itens.filter((item) => item.valor > 0).length,
    };
  }

  async preferenciasNotificacoesPortal(
    usuario: AuthenticatedUser,
    condominioId: number,
  ) {
    await this.buscarContextoMorador(usuario.id, condominioId);

    return {
      preferencias: {
        COBRANCAS: true,
        COMUNICADOS: true,
        RESERVAS: true,
        OCORRENCIAS: true,
        ENCOMENDAS: true,
        VOTACOES: true,
        ASSEMBLEIAS: true,
      },
    };
  }


  async atualizarPreferenciasNotificacoesPortal(
    usuario: AuthenticatedUser,
    condominioId: number,
    body: { preferencias?: Record<string, boolean> } = {},
  ) {
    await this.buscarContextoMorador(usuario.id, condominioId);

    const preferenciasPadrao = {
      COBRANCAS: true,
      COMUNICADOS: true,
      RESERVAS: true,
      OCORRENCIAS: true,
      ENCOMENDAS: true,
      VOTACOES: true,
      ASSEMBLEIAS: true,
    };

    return {
      preferencias: {
        ...preferenciasPadrao,
        ...(body?.preferencias ?? {}),
      },
    };
  }

  async marcarNotificacaoPortalLida(
    usuario: AuthenticatedUser,
    condominioId: number,
    notificacaoId: string,
  ) {
    await this.buscarContextoMorador(usuario.id, condominioId);

    return {
      ok: true,
      id: notificacaoId,
    };
  }

  async marcarNotificacoesPortalLidas(
    usuario: AuthenticatedUser,
    condominioId: number,
    ids: string[] = [],
  ) {
    await this.buscarContextoMorador(usuario.id, condominioId);

    return {
      ok: true,
      ids: Array.isArray(ids) ? ids.map((id) => String(id)) : [],
    };
  }

  async comunicados(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    await this.buscarContextoMorador(usuario.id, condominioId);

    const agora = new Date();
    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');
    const categoria = this.queryText(query, 'categoria');
    const prioridade = this.queryEnum(query, 'prioridade', PrioridadeComunicado);
    const destaque = this.queryBoolean(query, 'destaque');

    const where: Prisma.ComunicadoWhereInput = {
      condominioId,
      status: StatusComunicado.PUBLICADO,
      OR: [
        {
          expiraEm: null,
        },
        {
          expiraEm: {
            gte: agora,
          },
        },
      ],
      ...(categoria
        ? {
            categoria: {
              contains: categoria,
            },
          }
        : {}),
      ...(prioridade ? { prioridade } : {}),
      ...(destaque !== undefined ? { destaque } : {}),
    };

    if (busca) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              titulo: {
                contains: busca,
              },
            },
            {
              conteudo: {
                contains: busca,
              },
            },
            {
              categoria: {
                contains: busca,
              },
            },
          ],
        },
      ];
    }

    const itemsPromise = this.prisma.comunicado.findMany({
      where,
      orderBy: [
        {
          destaque: 'desc',
        },
        {
          publicadoEm: 'desc',
        },
        {
          criadoEm: 'desc',
        },
      ],
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.comunicado.count({ where }),
      pagination,
    );
  }

  async cobrancas(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );
    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');
    const status = this.queryEnum(query, 'status', StatusCobrancaCondominial);
    const vencimentoRange = this.dateRange(query);

    const where: Prisma.CobrancaCondominialWhereInput = {
      condominioId,
      unidadeId: {
        in: unidadeIds,
      },
      ...(status ? { status } : {}),
      ...(vencimentoRange ? { vencimentoEm: vencimentoRange } : {}),
    };

    if (busca) {
      where.OR = [
        {
          descricao: {
            contains: busca,
          },
        },
        {
          observacoes: {
            contains: busca,
          },
        },
        {
          unidade: {
            identificador: {
              contains: busca,
            },
          },
        },
        {
          unidade: {
            numero: {
              contains: busca,
            },
          },
        },
      ];
    }

    const itemsPromise = this.prisma.cobrancaCondominial.findMany({
      where,
      include: {
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
        lancamentoFinanceiro: {
          select: {
            id: true,
            status: true,
            tipo: true,
            valor: true,
          },
        },
      },
      orderBy: {
        vencimentoEm: 'desc',
      },
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.cobrancaCondominial.count({ where }),
      pagination,
    );
  }

  async encomendas(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );
    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');
    const status = this.queryEnum(query, 'status', StatusEncomendaPortaria);
    const recebidoRange = this.dateRange(query);

    const where: Prisma.EncomendaPortariaWhereInput = {
      condominioId,
      unidadeId: {
        in: unidadeIds,
      },
      ...(status ? { status } : {}),
      ...(recebidoRange ? { recebidoEm: recebidoRange } : {}),
    };

    if (busca) {
      where.OR = [
        {
          descricao: {
            contains: busca,
          },
        },
        {
          remetente: {
            contains: busca,
          },
        },
        {
          codigoRastreio: {
            contains: busca,
          },
        },
        {
          destinatarioNome: {
            contains: busca,
          },
        },
      ];
    }

    const itemsPromise = this.prisma.encomendaPortaria.findMany({
      where,
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
        recebidoEm: 'desc',
      },
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.encomendaPortaria.count({ where }),
      pagination,
    );
  }

  async reservas(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );
    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');
    const status = this.queryEnum(query, 'status', StatusReservaAreaComum);
    const inicioRange = this.dateRange(query);

    const where: Prisma.ReservaAreaComumWhereInput = {
      condominioId,
      OR: [
        {
          moradorId: contexto.id,
        },
        {
          unidadeId: {
            in: unidadeIds,
          },
        },
      ],
      ...(status ? { status } : {}),
      ...(inicioRange ? { inicioEm: inicioRange } : {}),
    };

    if (busca) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              titulo: {
                contains: busca,
              },
            },
            {
              observacoes: {
                contains: busca,
              },
            },
            {
              areaComum: {
                nome: {
                  contains: busca,
                },
              },
            },
          ],
        },
      ];
    }

    const itemsPromise = this.prisma.reservaAreaComum.findMany({
      where,
      include: {
        areaComum: {
          select: {
            id: true,
            nome: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
      },
      orderBy: {
        inicioEm: 'desc',
      },
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.reservaAreaComum.count({ where }),
      pagination,
    );
  }

  async ocorrencias(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );
    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');
    const status = this.queryEnum(query, 'status', StatusOcorrencia);
    const prioridade = this.queryEnum(query, 'prioridade', PrioridadeOcorrencia);
    const criadoRange = this.dateRange(query);

    const where: Prisma.OcorrenciaWhereInput = {
      condominioId,
      OR: [
        {
          moradorId: contexto.id,
        },
        {
          unidadeId: {
            in: unidadeIds,
          },
        },
      ],
      ...(status ? { status } : {}),
      ...(prioridade ? { prioridade } : {}),
      ...(criadoRange ? { criadoEm: criadoRange } : {}),
    };

    if (busca) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              titulo: {
                contains: busca,
              },
            },
            {
              descricao: {
                contains: busca,
              },
            },
            {
              categoria: {
                contains: busca,
              },
            },
          ],
        },
      ];
    }

    const itemsPromise = this.prisma.ocorrencia.findMany({
      where,
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
        criadoEm: 'desc',
      },
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.ocorrencia.count({ where }),
      pagination,
    );
  }

  async ocorrenciaPortalDetalhe(
    usuario: AuthenticatedUser,
    condominioId: number,
    ocorrenciaId: number,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );

    const ocorrencia = await this.prisma.ocorrencia.findFirst({
      where: {
        id: ocorrenciaId,
        condominioId,
        OR: [
          {
            moradorId: contexto.id,
          },
          {
            unidadeId: {
              in: unidadeIds,
            },
          },
        ],
      },
      include: {
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
        historicoStatus: {
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
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
      throw new NotFoundException(
        'Ocorrência não encontrada para este morador.',
      );
    }

    return ocorrencia;
  }

  async abrirOcorrencia(
    usuario: AuthenticatedUser,
    condominioId: number,
    dto: CreateOcorrenciaPortalDto,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadePermitida = contexto.unidades.some(
      (vinculo) => vinculo.unidadeId === dto.unidadeId,
    );

    if (!unidadePermitida) {
      throw new NotFoundException(
        'A unidade informada não está vinculada ao morador autenticado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const ocorrencia = await tx.ocorrencia.create({
        data: {
          condominioId,
          unidadeId: dto.unidadeId,
          moradorId: contexto.id,
          criadoPorUsuarioId: usuario.id,
          titulo: dto.titulo.trim(),
          descricao: dto.descricao.trim(),
          categoria: this.normalizarOpcional(dto.categoria),
          prioridade: dto.prioridade ?? PrioridadeOcorrencia.MEDIA,
          status: StatusOcorrencia.ABERTA,
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
          observacao: 'Ocorrência registrada pelo Portal do Morador.',
        },
      });

      return ocorrencia;
    });
  }

  async solicitarReserva(
    usuario: AuthenticatedUser,
    condominioId: number,
    dto: CreateReservaPortalDto,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadePermitida = contexto.unidades.some(
      (vinculo) => vinculo.unidadeId === dto.unidadeId,
    );

    if (!unidadePermitida) {
      throw new NotFoundException(
        'A unidade informada não está vinculada ao morador autenticado.',
      );
    }

    const area = await this.prisma.areaComum.findFirst({
      where: {
        id: dto.areaComumId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
        exigeAprovacao: true,
        permiteReserva: true,
      },
    });

    if (!area) {
      throw new NotFoundException('Área comum não encontrada.');
    }

    if (!area.permiteReserva) {
      throw new BadRequestException(
        'Esta área comum não está liberada para reservas.',
      );
    }

    const inicioEm = new Date(dto.inicioEm);
    const fimEm = new Date(dto.fimEm);

    if (fimEm <= inicioEm) {
      throw new BadRequestException(
        'A data final deve ser posterior à data inicial.',
      );
    }

    const conflito = await this.prisma.reservaAreaComum.findFirst({
      where: {
        condominioId,
        areaComumId: dto.areaComumId,
        status: {
          in: [
            StatusReservaAreaComum.SOLICITADA,
            StatusReservaAreaComum.APROVADA,
          ],
        },
        inicioEm: {
          lt: fimEm,
        },
        fimEm: {
          gt: inicioEm,
        },
      },
      select: {
        id: true,
      },
    });

    if (conflito) {
      throw new ConflictException(
        'Já existe reserva ou solicitação para esta área no período informado.',
      );
    }

    const statusInicial = area.exigeAprovacao
      ? StatusReservaAreaComum.SOLICITADA
      : StatusReservaAreaComum.APROVADA;

    return this.prisma.reservaAreaComum.create({
      data: {
        condominioId,
        areaComumId: dto.areaComumId,
        unidadeId: dto.unidadeId,
        moradorId: contexto.id,
        criadoPorUsuarioId: usuario.id,
        titulo: this.normalizarOpcional(dto.titulo),
        inicioEm,
        fimEm,
        status: statusInicial,
        aprovadoEm: area.exigeAprovacao ? null : new Date(),
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: {
        areaComum: {
          select: {
            id: true,
            nome: true,
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
  }


  async autorizarVisitante(
    usuario: AuthenticatedUser,
    condominioId: number,
    dto: AutorizarVisitantePortalDto,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadePermitida = contexto.unidades.some(
      (vinculo) => vinculo.unidadeId === dto.unidadeId,
    );

    if (!unidadePermitida) {
      throw new NotFoundException(
        'A unidade informada não está vinculada ao morador autenticado.',
      );
    }

    const inicioEm = new Date(dto.inicioEm);
    const fimEm = new Date(dto.fimEm);

    if (fimEm <= inicioEm) {
      throw new BadRequestException(
        'A data final da autorização deve ser posterior à data inicial.',
      );
    }

    let visitante: {
      id: number;
    } | null = null;

    if (dto.visitanteId) {
      visitante = await this.prisma.visitante.findFirst({
        where: {
          id: dto.visitanteId,
          condominioId,
          ativo: true,
        },
        select: {
          id: true,
        },
      });

      if (!visitante) {
        throw new NotFoundException('Visitante não encontrado.');
      }
    } else {
      const nome = dto.nome?.trim();

      if (!nome) {
        throw new BadRequestException(
          'Informe o nome do visitante.',
        );
      }

      const documento = this.normalizarOpcional(dto.documento);

      if (documento) {
        visitante = await this.prisma.visitante.findFirst({
          where: {
            condominioId,
            documento,
            ativo: true,
          },
          select: {
            id: true,
          },
        });
      }

      if (!visitante) {
        visitante = await this.prisma.visitante.create({
          data: {
            condominioId,
            nome,
            tipoDocumento: dto.tipoDocumento ?? null,
            documento,
            telefone: this.normalizarOpcional(dto.telefone),
            observacoes: this.normalizarOpcional(dto.observacoes),
          },
          select: {
            id: true,
          },
        });
      }
    }

    return this.prisma.autorizacaoVisitante.create({
      data: {
        condominioId,
        visitanteId: visitante.id,
        unidadeId: dto.unidadeId,
        moradorId: contexto.id,
        inicioEm,
        fimEm,
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            tipoDocumento: true,
            documento: true,
            telefone: true,
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
  }

  async autorizacoesVisitante(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );
    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');
    const status = this.queryEnum(query, 'status', StatusAutorizacaoVisitante);
    const inicioRange = this.dateRange(query);

    const where: Prisma.AutorizacaoVisitanteWhereInput = {
      condominioId,
      OR: [
        {
          moradorId: contexto.id,
        },
        {
          unidadeId: {
            in: unidadeIds,
          },
        },
      ],
      ...(status ? { status } : {}),
      ...(inicioRange ? { inicioEm: inicioRange } : {}),
    };

    if (busca) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              observacoes: {
                contains: busca,
              },
            },
            {
              visitante: {
                nome: {
                  contains: busca,
                },
              },
            },
            {
              visitante: {
                documento: {
                  contains: busca,
                },
              },
            },
            {
              visitante: {
                telefone: {
                  contains: busca,
                },
              },
            },
          ],
        },
      ];
    }

    const itemsPromise = this.prisma.autorizacaoVisitante.findMany({
      where,
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            tipoDocumento: true,
            documento: true,
            telefone: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'desc',
      },
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.autorizacaoVisitante.count({ where }),
      pagination,
    );
  }

  async assembleiasPortal(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    try {
    await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');
    const status = this.queryEnum(query, 'status', StatusAssembleia);
    const chamadaRange = this.dateRange(query);

    const where: Prisma.AssembleiaWhereInput = {
      condominioId,
      status: status
        ? status
        : {
            in: [
              StatusAssembleia.CONVOCADA,
              StatusAssembleia.EM_ANDAMENTO,
              StatusAssembleia.ENCERRADA,
            ],
          },
      ...(chamadaRange
        ? {
            OR: [
              {
                primeiraChamadaEm: chamadaRange,
              },
              {
                segundaChamadaEm: chamadaRange,
              },
            ],
          }
        : {}),
    };

    if (busca) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            {
              titulo: {
                contains: busca,
              },
            },
            {
              descricao: {
                contains: busca,
              },
            },
            {
              local: {
                contains: busca,
              },
            },
            {
              pautas: {
                some: {
                  titulo: {
                    contains: busca,
                  },
                },
              },
            },
          ],
        },
      ];
    }

    const select = {
      id: true,
      condominioId: true,
      titulo: true,
      descricao: true,
      modalidade: true,
      status: true,
      local: true,
      linkOnline: true,
      primeiraChamadaEm: true,
      segundaChamadaEm: true,
      convocadaEm: true,
      iniciadaEm: true,
      encerradaEm: true,
      criadoEm: true,
      atualizadoEm: true,
      pautas: {
        select: {
          id: true,
          titulo: true,
          descricao: true,
          status: true,
          ordem: true,
          resultado: true,
          deliberadaEm: true,
        },
        orderBy: [
          {
            ordem: 'asc' as const,
          },
          {
            criadoEm: 'asc' as const,
          },
        ],
      },
      votacoes: {
        select: {
          id: true,
          titulo: true,
          descricao: true,
          status: true,
          abertaEm: true,
          encerradaEm: true,
          totalVotos: true,
        },
        orderBy: {
          criadoEm: 'asc' as const,
        },
      },
      presencas: {
        select: {
          id: true,
          unidadeId: true,
          moradorId: true,
          presente: true,
          registradoEm: true,
        },
      },
    };

    const itemsPromise = this.prisma.assembleia.findMany({
      where,
      select,
      orderBy: [
        {
          primeiraChamadaEm: 'desc',
        },
        {
          criadoEm: 'desc',
        },
      ],
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.assembleia.count({ where }),
      pagination,
    );
  
    } catch (error) {
      registrarErroPortalGovernanca('assembleiasPortal', error);
      return [];
    }
  }

  async resultadoVotacaoPortal(
    usuario: AuthenticatedUser,
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

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

    if (votacao.status !== StatusVotacaoAssembleia.ENCERRADA) {
      throw new BadRequestException(
        'O resultado só pode ser consultado após o encerramento da votação.',
      );
    }

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

  async ataResumoAssembleiaPortal(
    usuario: AuthenticatedUser,
    condominioId: number,
    assembleiaId: number,
  ) {
    await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const assembleia = await this.prisma.assembleia.findFirst({
      where: {
        id: assembleiaId,
        condominioId,
        status: StatusAssembleia.ENCERRADA,
      },
      select: {
        id: true,
        condominioId: true,
        titulo: true,
        descricao: true,
        modalidade: true,
        status: true,
        local: true,
        linkOnline: true,
        primeiraChamadaEm: true,
        segundaChamadaEm: true,
        convocadaEm: true,
        iniciadaEm: true,
        encerradaEm: true,
        criadoEm: true,
        atualizadoEm: true,
        pautas: {
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
            titulo: true,
            descricao: true,
            ordem: true,
            status: true,
            deliberacao: true,
            deliberadaEm: true,
            votacao: {
              select: {
                id: true,
                titulo: true,
                status: true,
                abertaEm: true,
                encerradaEm: true,
              },
            },
          },
        },
      },
    });

    if (!assembleia) {
      throw new NotFoundException(
        'Ata / resumo da assembleia não encontrada ou ainda não disponível.',
      );
    }

    const [
      totalUnidades,
      unidadesPresentes,
      presencas,
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
      this.prisma.presencaAssembleia.findMany({
        where: {
          condominioId,
          assembleiaId,
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
          porProcuracao: true,
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
        },
      }),
    ]);

    const percentualPresenca =
      totalUnidades > 0
        ? Number(((unidadesPresentes / totalUnidades) * 100).toFixed(2))
        : 0;

    const resultadosVotacoes: Array<{
      pautaId: number;
      pautaTitulo: string;
      votacaoId: number;
      votacaoTitulo: string;
      totalVotos: number;
      opcoes: Array<{
        id: number;
        descricao: string;
        ordem: number;
        votos: number;
        percentual: number;
      }>;
    }> = [];

    for (const pauta of assembleia.pautas) {
      const votacao = pauta.votacao;

      if (
        !votacao ||
        votacao.status !== StatusVotacaoAssembleia.ENCERRADA
      ) {
        continue;
      }

      const [
        opcoes,
        grupos,
      ] = await Promise.all([
        this.prisma.opcaoVotacaoAssembleia.findMany({
          where: {
            votacaoId: votacao.id,
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
        }),
        this.prisma.votoAssembleia.groupBy({
          by: ['opcaoId'],
          where: {
            votacaoId: votacao.id,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

      const totalVotos = grupos.reduce(
        (total, grupo) => total + grupo._count._all,
        0,
      );

      const mapaContagem = new Map(
        grupos.map((grupo) => [grupo.opcaoId, grupo._count._all]),
      );

      resultadosVotacoes.push({
        pautaId: pauta.id,
        pautaTitulo: pauta.titulo,
        votacaoId: votacao.id,
        votacaoTitulo: votacao.titulo,
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
      });
    }

    return {
      assembleia,
      quorum: {
        totalUnidades,
        unidadesPresentes,
        unidadesAusentes: Math.max(totalUnidades - unidadesPresentes, 0),
        percentualPresenca,
      },
      presencas,
      resultadosVotacoes,
    };
  }

  async votacoesAbertas(
    usuario: AuthenticatedUser,
    condominioId: number,
    query: PortalListQuery = {},
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );
    const pagination = this.pagination(query);
    const busca = this.queryText(query, 'q', 'busca');

    const where: Prisma.VotacaoAssembleiaWhereInput = {
      condominioId,
      status: StatusVotacaoAssembleia.ABERTA,
    };

    if (busca) {
      where.OR = [
        {
          titulo: {
            contains: busca,
          },
        },
        {
          descricao: {
            contains: busca,
          },
        },
        {
          assembleia: {
            titulo: {
              contains: busca,
            },
          },
        },
        {
          pauta: {
            titulo: {
              contains: busca,
            },
          },
        },
      ];
    }

    const itemsPromise = this.prisma.votacaoAssembleia.findMany({
      where,
      include: {
        assembleia: {
          select: {
            id: true,
            titulo: true,
            status: true,
          },
        },
        pauta: {
          select: {
            id: true,
            titulo: true,
            descricao: true,
            status: true,
          },
        },
        opcoes: {
          where: {
            ativo: true,
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
        },
        votos: {
          where: {
            unidadeId: {
              in: unidadeIds,
            },
          },
          select: {
            id: true,
            opcaoId: true,
            unidadeId: true,
            registradoEm: true,
          },
        },
      },
      orderBy: {
        abertaEm: 'desc',
      },
      ...(pagination.paginated
        ? {
            skip: pagination.skip,
            take: pagination.take,
          }
        : {}),
    });

    return this.listResponse(
      itemsPromise,
      this.prisma.votacaoAssembleia.count({ where }),
      pagination,
    );
  }

  private async bloquearVotoPerfilPortaria(usuario: any, condominioId: number) {
    const usuarioId = Number(usuario?.id ?? usuario?.usuarioId ?? usuario?.sub ?? 0);

    if (!usuarioId || !condominioId) {
      return;
    }

    const vinculos = await this.prisma.$queryRawUnsafe(
      `
        SELECT papel
        FROM usuarios_condominios
        WHERE usuarioId = ?
          AND condominioId = ?
          AND ativo = 1
        ORDER BY principal DESC, id ASC
        LIMIT 1
      `,
      usuarioId,
      condominioId,
    ) as Array<{ papel?: string }>;

    const papel = String(vinculos[0]?.papel ?? '').toUpperCase();

    if (papel === 'PORTEIRO' || papel === 'PORTARIA') {
      throw new ForbiddenException('Perfil de portaria não participa de votações.');
    }
  }



  async registrarVotoPortal(
    usuario: AuthenticatedUser,
    condominioId: number,
    votacaoId: number,
    dto: RegistrarVotoPortalDto,
  ) {
    await this.bloquearVotoPerfilPortaria(usuario, condominioId);
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadePermitida = contexto.unidades.some(
      (vinculo) => vinculo.unidadeId === dto.unidadeId,
    );

    if (!unidadePermitida) {
      throw new NotFoundException(
        'A unidade informada não está vinculada ao morador autenticado.',
      );
    }

    const votacao = await this.prisma.votacaoAssembleia.findFirst({
      where: {
        id: votacaoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!votacao) {
      throw new NotFoundException('Votação não encontrada.');
    }

    if (votacao.status !== StatusVotacaoAssembleia.ABERTA) {
      throw new BadRequestException(
        'A votação não está aberta para recebimento de votos.',
      );
    }

    const opcao = await this.prisma.opcaoVotacaoAssembleia.findFirst({
      where: {
        id: dto.opcaoId,
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

    try {
      return await this.prisma.votoAssembleia.create({
        data: {
          votacaoId,
          opcaoId: dto.opcaoId,
          unidadeId: dto.unidadeId,
          moradorId: contexto.id,
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


  async unidadesDisponiveis(
    usuario: AuthenticatedUser,
    condominioId: number,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    return contexto.unidades.map((vinculo) => ({
      vinculoId: vinculo.id,
      papel: vinculo.papel,
      principal: vinculo.principal,
      unidade: vinculo.unidade,
    }));
  }

  async areasComunsReservaveis(
    usuario: AuthenticatedUser,
    condominioId: number,
  ) {
    await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    return this.prisma.areaComum.findMany({
      where: {
        condominioId,
        ativo: true,
        permiteReserva: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async visitantesRecentes(
    usuario: AuthenticatedUser,
    condominioId: number,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );

    const autorizacoes = await this.prisma.autorizacaoVisitante.findMany({
      where: {
        condominioId,
        OR: [
          {
            moradorId: contexto.id,
          },
          {
            unidadeId: {
              in: unidadeIds,
            },
          },
        ],
      },
      select: {
        visitante: {
          select: {
            id: true,
            nome: true,
            tipoDocumento: true,
            documento: true,
            telefone: true,
            ativo: true,
          },
        },
        criadoEm: true,
      },
      orderBy: {
        criadoEm: 'desc',
      },
      take: 60,
    });

    const visitantesUnicos = new Map<number, {
      id: number;
      nome: string;
      tipoDocumento: string | null;
      documento: string | null;
      telefone: string | null;
      ativo: boolean;
    }>();

    for (const autorizacao of autorizacoes) {
      const visitante = autorizacao.visitante;

      if (!visitante.ativo) {
        continue;
      }

      if (!visitantesUnicos.has(visitante.id)) {
        visitantesUnicos.set(visitante.id, visitante);
      }
    }

    return Array.from(visitantesUnicos.values());
  }

  private async buscarContextoMorador(
    usuarioId: number,
    condominioId: number,
  ) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        usuarioId,
        condominioId,
        ativo: true,
      },
      include: {
        condominio: {
          select: {
            id: true,
            nome: true,
            slug: true,
            ativo: true,
          },
        },
        unidades: {
          where: {
            ativo: true,
          },
          include: {
            unidade: {
              select: {
                id: true,
                identificador: true,
                numero: true,
                tipo: true,
                andar: true,
                ativo: true,
              },
            },
          },
        },
      },
    });

    if (!morador) {
      throw new NotFoundException(
        'Perfil de morador não encontrado neste condomínio.',
      );
    }

    return morador;
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }

  async comprovanteParticipacaoVotacaoEncerrada(
    usuario: AuthenticatedUser,
    condominioId: number,
    assembleiaId: number,
    votacaoId: number,
  ) {
    const contexto = await this.buscarContextoMorador(
      usuario.id,
      condominioId,
    );

    const unidadeIds = contexto.unidades.map(
      (vinculo) => vinculo.unidadeId,
    );

    const votacao = await this.prisma.votacaoAssembleia.findFirst({
      where: {
        id: votacaoId,
        condominioId,
        assembleiaId,
        status: StatusVotacaoAssembleia.ENCERRADA,
      },
      select: {
        id: true,
        titulo: true,
        encerradaEm: true,
        assembleia: {
          select: {
            id: true,
            titulo: true,
          },
        },
        pauta: {
          select: {
            id: true,
            titulo: true,
          },
        },
      },
    });

    if (!votacao) {
      throw new NotFoundException(
        'Comprovante da votação encerrada não encontrado.',
      );
    }

    const participacoes = await this.prisma.votoAssembleia.findMany({
      where: {
        votacaoId,
        unidadeId: {
          in: unidadeIds,
        },
      },
      orderBy: {
        registradoEm: 'asc',
      },
      select: {
        id: true,
        unidadeId: true,
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
      },
    });

    return {
      votacao,
      participacoes,
    };
  }

  async listarAssembleiasPortalReais(usuario: any, condominioId: number) {
    const condominioIdNumerico = Number(condominioId);

    const contextoMorador = await this.buscarContextoMorador(
      Number(usuario?.id),
      condominioIdNumerico,
    );

    const contextoMoradorAny = contextoMorador as any;

    const assembleias = await this.prisma.assembleia.findMany({
      where: {
        condominioId: condominioIdNumerico,
      },
      orderBy: [
        { primeiraChamadaEm: 'desc' },
        { id: 'desc' },
      ],
    });

    const assembleiaIds = assembleias.map((assembleia: any) => assembleia.id);

    const pautas = assembleiaIds.length
      ? await this.prisma.pautaAssembleia.findMany({
          where: {
            assembleiaId: {
              in: assembleiaIds,
            },
          },
          orderBy: [
            { assembleiaId: 'asc' },
            { ordem: 'asc' },
            { id: 'asc' },
          ],
        })
      : [];

    const pautaIds = pautas.map((pauta: any) => pauta.id);

    const votacoes = pautaIds.length
      ? await this.prisma.votacaoAssembleia.findMany({
          where: {
            condominioId: condominioIdNumerico,
            pautaId: {
              in: pautaIds,
            },
          },
          orderBy: [
            { abertaEm: 'desc' },
            { id: 'desc' },
          ],
        })
      : [];

    const votacaoIds = votacoes.map((votacao: any) => votacao.id);

    const opcoes = votacaoIds.length
      ? await this.prisma.opcaoVotacaoAssembleia.findMany({
          where: {
            votacaoId: {
              in: votacaoIds,
            },
            ativo: true,
          },
          orderBy: [
            { votacaoId: 'asc' },
            { ordem: 'asc' },
            { id: 'asc' },
          ],
        })
      : [];

    const votos = votacaoIds.length
      ? await this.prisma.votoAssembleia.findMany({
          where: {
            votacaoId: {
              in: votacaoIds,
            },
          },
        })
      : [];

    const presencas = assembleiaIds.length
      ? await this.prisma.presencaAssembleia.findMany({
          where: {
            condominioId: condominioIdNumerico,
            assembleiaId: {
              in: assembleiaIds,
            },
          },
        })
      : [];

    const moradorId = Number(
      contextoMoradorAny?.morador?.id ??
        contextoMoradorAny?.moradorId ??
        contextoMoradorAny?.idMorador ??
        contextoMoradorAny?.id ??
        usuario?.moradorId ??
        0,
    );

    const unidadeIds = new Set<number>();

    for (const unidade of [
      contextoMoradorAny?.unidade,
      ...(Array.isArray(contextoMoradorAny?.unidades)
        ? contextoMorador.unidades
        : []),
      ...(Array.isArray(contextoMoradorAny?.morador?.unidades)
        ? contextoMoradorAny.morador.unidades
        : []),
      ...(Array.isArray(contextoMoradorAny?.morador?.moradoresUnidades)
        ? contextoMoradorAny.morador.moradoresUnidades
        : []),
    ]) {
      const id = Number(
        unidade?.id ??
          unidade?.unidadeId ??
          unidade?.unidade?.id ??
          unidade?.unidade?.unidadeId ??
          0,
      );

      if (id > 0) {
        unidadeIds.add(id);
      }
    }

    const pautasPorAssembleia = new Map<number, any[]>();
    const votacoesPorPauta = new Map<number, any[]>();
    const opcoesPorVotacao = new Map<number, any[]>();
    const votosPorVotacao = new Map<number, any[]>();
    const votosPorOpcao = new Map<number, any[]>();
    const presencasPorAssembleia = new Map<number, any[]>();

    for (const pauta of pautas as any[]) {
      const lista = pautasPorAssembleia.get(pauta.assembleiaId) ?? [];
      lista.push(pauta);
      pautasPorAssembleia.set(pauta.assembleiaId, lista);
    }

    for (const votacao of votacoes as any[]) {
      const lista = votacoesPorPauta.get(votacao.pautaId) ?? [];
      lista.push(votacao);
      votacoesPorPauta.set(votacao.pautaId, lista);
    }

    for (const opcao of opcoes as any[]) {
      const lista = opcoesPorVotacao.get(opcao.votacaoId) ?? [];
      lista.push(opcao);
      opcoesPorVotacao.set(opcao.votacaoId, lista);
    }

    for (const voto of votos as any[]) {
      const listaVotacao = votosPorVotacao.get(voto.votacaoId) ?? [];
      listaVotacao.push(voto);
      votosPorVotacao.set(voto.votacaoId, listaVotacao);

      const listaOpcao = votosPorOpcao.get(voto.opcaoId) ?? [];
      listaOpcao.push(voto);
      votosPorOpcao.set(voto.opcaoId, listaOpcao);
    }

    for (const presenca of presencas as any[]) {
      const lista = presencasPorAssembleia.get(presenca.assembleiaId) ?? [];
      lista.push(presenca);
      presencasPorAssembleia.set(presenca.assembleiaId, lista);
    }

    const montarVotacao = (votacao: any) => {
      const votosDaVotacao = votosPorVotacao.get(votacao.id) ?? [];
      const opcoesDaVotacao = (opcoesPorVotacao.get(votacao.id) ?? []).map(
        (opcao: any) => {
          const votosDaOpcao = votosPorOpcao.get(opcao.id) ?? [];

          return {
            ...opcao,
            texto: opcao.descricao,
            descricao: opcao.descricao,
            totalVotos: votosDaOpcao.length,
            votos: votosDaOpcao.length,
          };
        },
      );

      const votoMorador =
        votosDaVotacao.find((voto: any) => {
          const votoMoradorId = Number(voto.moradorId ?? 0);
          const votoUnidadeId = Number(voto.unidadeId ?? 0);

          return (
            (moradorId > 0 && votoMoradorId === moradorId) ||
            (votoUnidadeId > 0 && unidadeIds.has(votoUnidadeId))
          );
        }) ?? null;

      return {
        ...votacao,
        opcoes: opcoesDaVotacao,
        totalVotos: votosDaVotacao.length,
        votos: votosDaVotacao.length,
        jaVotou: Boolean(votoMorador),
        votoMorador,
      };
    };

    const assembleiasFormatadas = (assembleias as any[]).map((assembleia: any) => {
      const pautasDaAssembleia = (pautasPorAssembleia.get(assembleia.id) ?? []).map(
        (pauta: any) => {
          const votacao =
            (votacoesPorPauta.get(pauta.id) ?? [])[0] ?? null;

          return {
            ...pauta,
            votacao: votacao ? montarVotacao(votacao) : null,
          };
        },
      );

      const presencasDaAssembleia = presencasPorAssembleia.get(assembleia.id) ?? [];

      return {
        ...assembleia,
        pautas: pautasDaAssembleia,
        presencas: presencasDaAssembleia.length,
        _count: {
          pautas: pautasDaAssembleia.length,
          presencas: presencasDaAssembleia.length,
        },
      };
    });

    const resumo = {
      total: assembleiasFormatadas.length,
      rascunho: assembleiasFormatadas.filter((item: any) => item.status === 'RASCUNHO').length,
      convocadas: assembleiasFormatadas.filter((item: any) => item.status === 'CONVOCADA').length,
      emAndamento: assembleiasFormatadas.filter((item: any) => item.status === 'EM_ANDAMENTO').length,
      encerradas: assembleiasFormatadas.filter((item: any) => item.status === 'ENCERRADA').length,
      canceladas: assembleiasFormatadas.filter((item: any) => item.status === 'CANCELADA').length,
    };

    return assembleiasFormatadas;
  }

  async listarVotacoesAbertasPortalReais(usuario: any, condominioId: number) {
    const respostaAssembleias = (await this.listarAssembleiasPortalReais(
      usuario,
      condominioId,
    )) as any;

    const assembleias = Array.isArray(respostaAssembleias)
      ? respostaAssembleias
      : Array.isArray(respostaAssembleias?.assembleias)
        ? respostaAssembleias.assembleias
        : Array.isArray(respostaAssembleias?.itens)
          ? respostaAssembleias.itens
          : [];

    const votacoes = assembleias.flatMap((assembleia: any) =>
      (Array.isArray(assembleia?.pautas) ? assembleia.pautas : [])
        .filter((pauta: any) => pauta?.votacao?.status === 'ABERTA')
        .map((pauta: any) => ({
          ...pauta.votacao,
          pauta: {
            id: pauta.id,
            assembleiaId: pauta.assembleiaId,
            titulo: pauta.titulo,
            descricao: pauta.descricao,
            ordem: pauta.ordem,
            status: pauta.status,
          },
          assembleia: {
            id: assembleia.id,
            condominioId: assembleia.condominioId,
            titulo: assembleia.titulo,
            descricao: assembleia.descricao,
            modalidade: assembleia.modalidade,
            status: assembleia.status,
            local: assembleia.local,
            linkOnline: assembleia.linkOnline,
            primeiraChamadaEm: assembleia.primeiraChamadaEm,
            segundaChamadaEm: assembleia.segundaChamadaEm,
          },
        })),
    );

    const resumo = {
      abertas: votacoes.length,
      pendentes: votacoes.filter((item: any) => !item.jaVotou).length,
      votadas: votacoes.filter((item: any) => item.jaVotou).length,
      encerradas: 0,
      exibidas: votacoes.length,
    };

    return {
      itens: votacoes,
      votacoes,
      votacoesAbertas: votacoes,
      assembleias,
      total: votacoes.length,
      resumo,
    };
  }


}
