import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PapelCondominio, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateMoradorDto } from './dto/create-morador.dto';
import { VincularUnidadeDto } from './dto/vincular-unidade.dto';

@Injectable()
export class MoradoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(condominioId: number, dto: CreateMoradorDto) {
    await this.garantirCondominio(condominioId);

    return this.prisma.morador.create({
      data: {
        condominioId,
        nome: dto.nome.trim(),
        email: this.normalizarOpcional(dto.email)?.toLowerCase(),
        telefone: this.normalizarOpcional(dto.telefone),
      },
    });
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.morador.findMany({
      where: {
        condominioId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            ativo: true,
            ultimoLoginEm: true,
          },
        },
        unidades: {
          where: {
            ativo: true,
          },
          select: {
            id: true,
            papel: true,
            principal: true,
            unidade: {
              select: {
                id: true,
                numero: true,
                identificador: true,
                tipo: true,
                bloco: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },
              },
            },
          },
          orderBy: {
            principal: 'desc',
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async findOne(condominioId: number, moradorId: number) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            ativo: true,
            ultimoLoginEm: true,
          },
        },
        unidades: {
          select: {
            id: true,
            papel: true,
            principal: true,
            ativo: true,
            inicioEm: true,
            fimEm: true,
            unidade: {
              select: {
                id: true,
                numero: true,
                identificador: true,
                tipo: true,
                bloco: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },
              },
            },
          },
          orderBy: {
            principal: 'desc',
          },
        },
      },
    });

    if (!morador) {
      throw new NotFoundException('Morador não encontrado.');
    }

    return morador;
  }

  async vincularUnidade(
    condominioId: number,
    moradorId: number,
    dto: VincularUnidadeDto,
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
      throw new NotFoundException('Unidade não encontrada.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.principal) {
          await tx.moradorUnidade.updateMany({
            where: {
              moradorId,
              principal: true,
              ativo: true,
            },
            data: {
              principal: false,
            },
          });
        }

        return tx.moradorUnidade.create({
          data: {
            moradorId,
            unidadeId: dto.unidadeId,
            papel: dto.papel,
            principal: dto.principal ?? false,
          },
          include: {
            morador: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            unidade: {
              select: {
                id: true,
                numero: true,
                identificador: true,
                tipo: true,
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
          'Esse morador já está vinculado a essa unidade.',
        );
      }

      throw error;
    }
  }

  async criarAcessoPortal(
    condominioId: number,
    moradorId: number,
    dto: {
      email?: string;
      telefone?: string;
      senha?: string;
    },
  ) {
    const email = dto.email?.trim().toLowerCase();
    const senha = dto.senha ?? '';

    if (!email) {
      throw new BadRequestException('Informe o e-mail de acesso.');
    }

    if (senha.length < 8) {
      throw new BadRequestException('A senha inicial deve ter pelo menos 8 caracteres.');
    }

    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
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
      throw new ConflictException('Este morador já possui usuário vinculado.');
    }

    let usuario = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        ativo: true,
      },
    });

    if (!usuario) {
      const senhaHash = await bcrypt.hash(senha, 12);

      usuario = await this.prisma.usuario.create({
        data: {
          nome: morador.nome,
          email,
          telefone: this.normalizarOpcional(dto.telefone) ?? morador.telefone,
          senhaHash,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          ativo: true,
        },
      });
    }

    return this.vincularUsuarioAoMorador(condominioId, moradorId, usuario.id);
  }

  async vincularUsuarioExistente(
    condominioId: number,
    moradorId: number,
    dto: {
      email?: string;
    },
  ) {
    const email = dto.email?.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException('Informe o e-mail do usuário.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        ativo: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Nenhum usuário encontrado com esse e-mail.');
    }

    if (!usuario.ativo) {
      throw new BadRequestException('O usuário encontrado está inativo.');
    }

    return this.vincularUsuarioAoMorador(condominioId, moradorId, usuario.id);
  }

  async desvincularUsuario(condominioId: number, moradorId: number) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
      },
      select: {
        id: true,
        usuarioId: true,
      },
    });

    if (!morador) {
      throw new NotFoundException('Morador não encontrado.');
    }

    if (!morador.usuarioId) {
      throw new BadRequestException('Este morador não possui usuário vinculado.');
    }

    return this.prisma.morador.update({
      where: {
        id: moradorId,
      },
      data: {
        usuarioId: null,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            ativo: true,
            ultimoLoginEm: true,
          },
        },
        unidades: {
          where: {
            ativo: true,
          },
          select: {
            id: true,
            papel: true,
            principal: true,
            unidade: {
              select: {
                id: true,
                numero: true,
                identificador: true,
                tipo: true,
                bloco: {
                  select: {
                    id: true,
                    nome: true,
                  },
                },
              },
            },
          },
          orderBy: {
            principal: 'desc',
          },
        },
      },
    });
  }

  private async vincularUsuarioAoMorador(
    condominioId: number,
    moradorId: number,
    usuarioId: number,
  ) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
      },
      select: {
        id: true,
        usuarioId: true,
      },
    });

    if (!morador) {
      throw new NotFoundException('Morador não encontrado.');
    }

    if (morador.usuarioId && morador.usuarioId !== usuarioId) {
      throw new ConflictException('Este morador já está vinculado a outro usuário.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        id: true,
        ativo: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (!usuario.ativo) {
      throw new BadRequestException('O usuário informado está inativo.');
    }

    const outroMorador = await this.prisma.morador.findFirst({
      where: {
        condominioId,
        usuarioId,
        NOT: {
          id: moradorId,
        },
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (outroMorador) {
      throw new ConflictException(
        `Este usuário já está vinculado ao morador ${outroMorador.nome}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
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
          papel: PapelCondominio.MORADOR,
          principal: false,
          ativo: true,
        },
        update: {
          ativo: true,
        },
      });

      return tx.morador.update({
        where: {
          id: moradorId,
        },
        data: {
          usuarioId,
        },
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              telefone: true,
              ativo: true,
              ultimoLoginEm: true,
            },
          },
          unidades: {
            where: {
              ativo: true,
            },
            select: {
              id: true,
              papel: true,
              principal: true,
              unidade: {
                select: {
                  id: true,
                  numero: true,
                  identificador: true,
                  tipo: true,
                  bloco: {
                    select: {
                      id: true,
                      nome: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              principal: 'desc',
            },
          },
        },
      });
    });
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
