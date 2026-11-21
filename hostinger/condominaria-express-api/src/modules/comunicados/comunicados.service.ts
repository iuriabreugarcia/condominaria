import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrioridadeComunicado,
  StatusComunicado,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';


type ComunicadoLeituraSegura = {
  comunicadoId: number;
  moradorId: number;
  usuarioId?: number | null;
  lidoEm: Date | string | null;
};

@Injectable()

export class ComunicadosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    condominioId: number,
    dto: CreateComunicadoDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const expiraEm = dto.expiraEm ? new Date(dto.expiraEm) : null;

    if (expiraEm && expiraEm <= new Date()) {
      throw new BadRequestException(
        'A data de expiração deve ser futura.',
      );
    }

    const comunicado = await this.prisma.comunicado.create({
      data: {
        condominioId,
        criadoPorUsuarioId: usuario.id,
        titulo: dto.titulo.trim(),
        conteudo: dto.conteudo.trim(),
        categoria: this.normalizarOpcional(dto.categoria),
        prioridade: dto.prioridade ?? PrioridadeComunicado.NORMAL,
        destaque: dto.destaque ?? false,
        expiraEm,
      },
      include: this.includeComunicadoAdmin(),
    });

    return this.adicionarResumoLeitura(comunicado);
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    const comunicados = await this.prisma.comunicado.findMany({
      where: {
        condominioId,
      },
      include: this.includeComunicadoAdmin(),
      orderBy: [
        {
          destaque: 'desc',
        },
        {
          criadoEm: 'desc',
        },
      ],
    });

    return Promise.all(
      comunicados.map((comunicado) =>
        this.adicionarResumoLeitura(comunicado),
      ),
    );
  }

  async findOne(condominioId: number, comunicadoId: number) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: {
        id: comunicadoId,
        condominioId,
      },
      include: this.includeComunicadoAdmin(),
    });

    if (!comunicado) {
      throw new NotFoundException('Comunicado não encontrado.');
    }

    return this.adicionarResumoLeitura(comunicado);
  }

  async publicar(condominioId: number, comunicadoId: number) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: {
        id: comunicadoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!comunicado) {
      throw new NotFoundException('Comunicado não encontrado.');
    }

    if (comunicado.status === StatusComunicado.PUBLICADO) {
      throw new BadRequestException(
        'Este comunicado já está publicado.',
      );
    }

    if (comunicado.status === StatusComunicado.ARQUIVADO) {
      throw new BadRequestException(
        'Um comunicado arquivado não pode ser publicado diretamente.',
      );
    }

    const atualizado = await this.prisma.comunicado.update({
      where: {
        id: comunicado.id,
      },
      data: {
        status: StatusComunicado.PUBLICADO,
        publicadoEm: new Date(),
      },
      include: this.includeComunicadoAdmin(),
    });

    return this.adicionarResumoLeitura(atualizado);
  }

  async arquivar(condominioId: number, comunicadoId: number) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: {
        id: comunicadoId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!comunicado) {
      throw new NotFoundException('Comunicado não encontrado.');
    }

    if (comunicado.status === StatusComunicado.ARQUIVADO) {
      throw new BadRequestException(
        'Este comunicado já está arquivado.',
      );
    }

    const atualizado = await this.prisma.comunicado.update({
      where: {
        id: comunicado.id,
      },
      data: {
        status: StatusComunicado.ARQUIVADO,
      },
      include: this.includeComunicadoAdmin(),
    });

    return this.adicionarResumoLeitura(atualizado);
  }

  async findAllPortal(
    condominioId: number,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const agora = new Date();

    let comunicados: any[] = [];

    try {
      comunicados = await this.prisma.comunicado.findMany({
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
        include: {
          criadoPorUsuario: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
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
      });
    } catch {
      comunicados = await this.prisma.comunicado.findMany({
        where: {
          condominioId,
          status: StatusComunicado.PUBLICADO,
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
      });
    }

    let morador: { id: number } | null = null;

    try {
      morador = await this.obterMoradorDoUsuario(condominioId, usuario.id);
    } catch {
      morador = null;
    }

    const leituras: ComunicadoLeituraSegura[] =
      morador && comunicados.length > 0
        ? await this.listarLeiturasSeguras({
            where: {
              condominioId,
              usuarioId: usuario.id,
              moradorId: morador.id,
              comunicadoId: {
                in: comunicados.map((comunicado) => comunicado.id),
              },
            },
            select: {
              comunicadoId: true,
              moradorId: true,
              usuarioId: true,
              lidoEm: true,
            },
          })
        : [];

    const leiturasPorComunicado = new Map<number, Date | string | null>(
      leituras.map((leitura: ComunicadoLeituraSegura) => [
        leitura.comunicadoId,
        leitura.lidoEm,
      ]),
    );

    return comunicados.map((comunicado) => {
      const lidoEm = leiturasPorComunicado.get(comunicado.id) ?? null;

      return {
        ...comunicado,
        lida: Boolean(lidoEm),
        lidoEm,
      };
    });
  }



  async marcarLeituraPortal(
    condominioId: number,
    comunicadoId: number,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirComunicadoPublicado(condominioId, comunicadoId);

    let morador: { id: number } | null = null;

    try {
      morador = await this.obterMoradorDoUsuario(condominioId, usuario.id);
    } catch {
      morador = null;
    }

    if (!morador) {
      return {
        comunicadoId,
        lida: true,
        persistida: false,
      };
    }

    const leituraPersistida = await this.registrarLeituraSegura({
      where: {
        comunicadoId_usuarioId_moradorId: {
          comunicadoId,
          usuarioId: usuario.id,
          moradorId: morador.id,
        },
      },
      create: {
        condominioId,
        comunicadoId,
        usuarioId: usuario.id,
        moradorId: morador.id,
        lidoEm: new Date(),
      },
      update: {
        lidoEm: new Date(),
      },
    });

    return {
      comunicadoId,
      lida: true,
      persistida: leituraPersistida,
    };
  }



  async findLeituras(condominioId: number, comunicadoId: number) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: {
        id: comunicadoId,
        condominioId,
      },
      select: {
        id: true,
        titulo: true,
        status: true,
      },
    });

    if (!comunicado) {
      throw new NotFoundException('Comunicado não encontrado.');
    }

    const [moradores, leituras] = await Promise.all([
      this.prisma.morador.findMany({
        where: {
          condominioId,
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          unidades: {
            where: {
              ativo: true,
            },
            select: {
              unidade: {
                select: {
                  id: true,
                  identificador: true,
                  numero: true,
                },
              },
            },
          },
        },
        orderBy: {
          nome: 'asc',
        },
      }),
      this.listarLeiturasSeguras({
        where: {
          condominioId,
          comunicadoId,
        },
        select: {
          moradorId: true,
          usuarioId: true,
          lidoEm: true,
        },
      }),
    ]);

    const leiturasPorMorador = new Map<number, ComunicadoLeituraSegura>(
      leituras.map((leitura: ComunicadoLeituraSegura) => [
        leitura.moradorId,
        leitura,
      ]),
    );

    const itens = moradores.map((morador) => {
      const leitura = leiturasPorMorador.get(morador.id) as ComunicadoLeituraSegura | undefined;

      return {
        moradorId: morador.id,
        nome: morador.nome,
        email: morador.email,
        telefone: morador.telefone,
        unidades: morador.unidades.map((vinculo) => vinculo.unidade),
        lida: Boolean(leitura),
        lidoEm: leitura?.lidoEm ?? null,
      };
    });

    const totalLidas = itens.filter((item) => item.lida).length;

    return {
      comunicado,
      resumo: {
        totalMoradores: itens.length,
        totalLidas,
        totalPendentes: Math.max(itens.length - totalLidas, 0),
      },
      itens,
    };
  }


  private obterComunicadoLeituraModel() {
    return (this.prisma as any).comunicadoLeitura ?? null;
  }

  private async listarLeiturasSeguras(args: Record<string, unknown>): Promise<ComunicadoLeituraSegura[]> {
    const model = this.obterComunicadoLeituraModel();

    if (!model?.findMany) {
      return [];
    }

    try {
      return (await model.findMany(args)) as ComunicadoLeituraSegura[];
    } catch {
      return [];
    }
  }

  private async contarLeiturasSeguras(args: Record<string, unknown>) {
    const model = this.obterComunicadoLeituraModel();

    if (!model?.count) {
      return 0;
    }

    try {
      return await model.count(args);
    } catch {
      return 0;
    }
  }

  private async registrarLeituraSegura(args: Record<string, unknown>) {
    const model = this.obterComunicadoLeituraModel();

    if (!model?.upsert) {
      return false;
    }

    try {
      await model.upsert(args);
      return true;
    } catch {
      return false;
    }
  }

  private includeComunicadoAdmin() {
    return {
      criadoPorUsuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
    };
  }

  private async adicionarResumoLeitura<T extends { id: number; condominioId: number }>(
    comunicado: T,
  ) {
    const [totalMoradores, totalLidas] = await Promise.all([
      this.prisma.morador.count({
        where: {
          condominioId: comunicado.condominioId,
          ativo: true,
        },
      }),
      this.contarLeiturasSeguras({
        where: {
          comunicadoId: comunicado.id,
          condominioId: comunicado.condominioId,
        },
      }),
    ]);

    return {
      ...comunicado,
      leituraResumo: {
        totalMoradores,
        totalLidas,
        totalPendentes: Math.max(totalMoradores - totalLidas, 0),
      },
    };
  }

  private async garantirComunicadoPublicado(
    condominioId: number,
    comunicadoId: number,
  ) {
    const comunicado = await this.prisma.comunicado.findFirst({
      where: {
        id: comunicadoId,
        condominioId,
        status: StatusComunicado.PUBLICADO,
        OR: [
          {
            expiraEm: null,
          },
          {
            expiraEm: {
              gte: new Date(),
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!comunicado) {
      throw new NotFoundException('Comunicado publicado não encontrado.');
    }
  }

  private async obterMoradorDoUsuario(
    condominioId: number,
    usuarioId: number,
  ) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        condominioId,
        usuarioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!morador) {
      throw new BadRequestException(
        'Usuário sem perfil de morador ativo neste condomínio.',
      );
    }

    return morador;
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
