import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PapelCondominio, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateUsuarioCondominioDto } from './dto/create-usuario-condominio.dto';
import { UpdateUsuarioCondominioDto } from './dto/update-usuario-condominio.dto';
import { VincularCondominioDto } from './dto/vincular-condominio.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    const email = dto.email.trim().toLowerCase();

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    if (usuarioExistente) {
      throw new ConflictException('Já existe um usuário com esse e-mail.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 12);

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome.trim(),
        email,
        telefone: this.normalizarOpcional(dto.telefone),
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        superAdmin: true,
        ativo: true,
        ultimoLoginEm: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        superAdmin: true,
        ativo: true,
        ultimoLoginEm: true,
        criadoEm: true,
        atualizadoEm: true,
        condominios: {
          select: {
            id: true,
            papel: true,
            principal: true,
            ativo: true,
            condominio: {
              select: {
                id: true,
                nome: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        superAdmin: true,
        ativo: true,
        ultimoLoginEm: true,
        criadoEm: true,
        atualizadoEm: true,
        condominios: {
          select: {
            id: true,
            papel: true,
            principal: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
            condominio: {
              select: {
                id: true,
                nome: true,
                slug: true,
                ativo: true,
              },
            },
          },
          orderBy: {
            criadoEm: 'asc',
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return usuario;
  }

  async vincularCondominio(
    usuarioId: number,
    dto: VincularCondominioDto,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const condominio = await this.prisma.condominio.findUnique({
      where: { id: dto.condominioId },
      select: { id: true },
    });

    if (!condominio) {
      throw new NotFoundException('Condomínio não encontrado.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.principal) {
          await tx.usuarioCondominio.updateMany({
            where: {
              usuarioId,
              principal: true,
            },
            data: {
              principal: false,
            },
          });
        }

        return tx.usuarioCondominio.create({
          data: {
            usuarioId,
            condominioId: dto.condominioId,
            papel: dto.papel,
            principal: dto.principal ?? false,
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
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Esse usuário já está vinculado a esse condomínio.',
        );
      }

      throw error;
    }
  }


  async listarPorCondominio(condominioId: number) {
    await this.garantirCondominio(condominioId);

    const vinculos = await this.prisma.usuarioCondominio.findMany({
      where: {
        condominioId,
      },
      select: {
        id: true,
        usuarioId: true,
        condominioId: true,
        papel: true,
        principal: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            superAdmin: true,
            ativo: true,
            ultimoLoginEm: true,
            criadoEm: true,
            atualizadoEm: true,
            moradoresVinculados: {
              where: {
                condominioId,
              },
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                ativo: true,
                unidades: {
                  where: {
                    ativo: true,
                  },
                  select: {
                    id: true,
                    principal: true,
                    papel: true,
                    unidade: {
                      select: {
                        id: true,
                        numero: true,
                        identificador: true,
                      },
                    },
                  },
                  orderBy: [
                    {
                      principal: 'desc',
                    },
                    {
                      id: 'asc',
                    },
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: {
        criadoEm: 'asc',
      },
    });

    const itens = vinculos
      .map((vinculo) => ({
        ...vinculo,
        moradorVinculado:
          vinculo.usuario.moradoresVinculados[0] ?? null,
      }))
      .sort((a, b) =>
        a.usuario.nome.localeCompare(b.usuario.nome, 'pt-BR'),
      );

    const resumo = {
      total: itens.length,
      ativos: itens.filter((item) => item.ativo && item.usuario.ativo).length,
      inativos: itens.filter((item) => !item.ativo || !item.usuario.ativo).length,
      administrativos: itens.filter((item) => item.papel !== PapelCondominio.MORADOR).length,
      moradores: itens.filter((item) => item.papel === PapelCondominio.MORADOR).length,
      semMoradorVinculado: itens.filter((item) => !item.moradorVinculado).length,
    };

    return {
      resumo,
      itens,
    };
  }

  async criarOuVincularNoCondominio(
    condominioId: number,
    dto: CreateUsuarioCondominioDto,
  ) {
    await this.garantirCondominio(condominioId);

    const email = dto.email.trim().toLowerCase();
    const nome = this.normalizarOpcional(dto.nome);
    const telefone = this.normalizarOpcional(dto.telefone);

    let usuario = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (!usuario) {
      if (!nome) {
        throw new BadRequestException(
          'Informe o nome para criar um novo usuário.',
        );
      }

      if (!dto.senha || dto.senha.length < 8) {
        throw new BadRequestException(
          'Informe uma senha provisória com pelo menos 8 caracteres para criar o novo usuário.',
        );
      }

      const senhaHash = await bcrypt.hash(dto.senha, 12);

      usuario = await this.prisma.usuario.create({
        data: {
          nome,
          email,
          telefone,
          senhaHash,
        },
        select: {
          id: true,
        },
      });
    } else if (telefone || nome) {
      await this.prisma.usuario.update({
        where: {
          id: usuario.id,
        },
        data: {
          ...(nome ? { nome } : {}),
          ...(telefone ? { telefone } : {}),
        },
      });
    }

    const usuarioId = usuario.id;

    return this.prisma.$transaction(async (tx) => {
      if (dto.principal) {
        await tx.usuarioCondominio.updateMany({
          where: {
            usuarioId,
            principal: true,
          },
          data: {
            principal: false,
          },
        });
      }

      await tx.usuarioCondominio.upsert({
        where: {
          usuarioId_condominioId: {
            usuarioId,
            condominioId,
          },
        },
        create: {
          usuarioId,
          condominioId,
          papel: dto.papel,
          principal: dto.principal ?? false,
          ativo: true,
        },
        update: {
          papel: dto.papel,
          principal: dto.principal ?? false,
          ativo: true,
        },
      });

      return this.buscarVinculoCondominio(tx, condominioId, usuarioId);
    });
  }

  async atualizarVinculoCondominio(
    condominioId: number,
    usuarioId: number,
    dto: UpdateUsuarioCondominioDto,
  ) {
    await this.garantirCondominio(condominioId);

    const vinculo = await this.prisma.usuarioCondominio.findUnique({
      where: {
        usuarioId_condominioId: {
          usuarioId,
          condominioId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!vinculo) {
      throw new NotFoundException('Usuário não está vinculado a este condomínio.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.principal) {
        await tx.usuarioCondominio.updateMany({
          where: {
            usuarioId,
            principal: true,
          },
          data: {
            principal: false,
          },
        });
      }

      await tx.usuarioCondominio.update({
        where: {
          usuarioId_condominioId: {
            usuarioId,
            condominioId,
          },
        },
        data: {
          ...(dto.papel ? { papel: dto.papel } : {}),
          ...(typeof dto.ativo === 'boolean' ? { ativo: dto.ativo } : {}),
          ...(typeof dto.principal === 'boolean'
            ? { principal: dto.principal }
            : {}),
        },
      });

      return this.buscarVinculoCondominio(tx, condominioId, usuarioId);
    });
  }

  async removerDoCondominio(condominioId: number, usuarioId: number) {
    await this.garantirCondominio(condominioId);

    const vinculo = await this.prisma.usuarioCondominio.findUnique({
      where: {
        usuarioId_condominioId: {
          usuarioId,
          condominioId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!vinculo) {
      throw new NotFoundException('Usuário não está vinculado a este condomínio.');
    }

    await this.prisma.usuarioCondominio.update({
      where: {
        usuarioId_condominioId: {
          usuarioId,
          condominioId,
        },
      },
      data: {
        ativo: false,
        principal: false,
      },
    });

    return {
      usuarioId,
      condominioId,
      removido: true,
    };
  }

  private async buscarVinculoCondominio(
    tx: Prisma.TransactionClient,
    condominioId: number,
    usuarioId: number,
  ) {
    const vinculo = await tx.usuarioCondominio.findUnique({
      where: {
        usuarioId_condominioId: {
          usuarioId,
          condominioId,
        },
      },
      select: {
        id: true,
        usuarioId: true,
        condominioId: true,
        papel: true,
        principal: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            superAdmin: true,
            ativo: true,
            ultimoLoginEm: true,
            criadoEm: true,
            atualizadoEm: true,
            moradoresVinculados: {
              where: {
                condominioId,
              },
              select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                ativo: true,
                unidades: {
                  where: {
                    ativo: true,
                  },
                  select: {
                    id: true,
                    principal: true,
                    papel: true,
                    unidade: {
                      select: {
                        id: true,
                        numero: true,
                        identificador: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!vinculo) {
      throw new NotFoundException('Vínculo do usuário não encontrado.');
    }

    return {
      ...vinculo,
      moradorVinculado: vinculo.usuario.moradoresVinculados[0] ?? null,
    };
  }

  private async garantirCondominio(condominioId: number) {
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
