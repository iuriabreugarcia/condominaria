import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        condominios: {
          where: {
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
          },
          orderBy: {
            principal: 'desc',
          },
        },
      },
    });

    if (!usuario || !usuario.ativo || !usuario.senhaHash) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senhaHash);

    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      superAdmin: usuario.superAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    await this.prisma.usuario.update({
      where: {
        id: usuario.id,
      },
      data: {
        ultimoLoginEm: new Date(),
      },
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        superAdmin: usuario.superAdmin,
        condominios: usuario.condominios.map((vinculo) => ({
          vinculoId: vinculo.id,
          papel: vinculo.papel,
          principal: vinculo.principal,
          condominio: vinculo.condominio,
        })),
      },
    };
  }

  async me(usuarioId: number) {
    return this.prisma.usuario.findUnique({
      where: {
        id: usuarioId,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        superAdmin: true,
        ativo: true,
        ultimoLoginEm: true,
        condominios: {
          where: {
            ativo: true,
          },
          select: {
            id: true,
            papel: true,
            principal: true,
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
            principal: 'desc',
          },
        },
      },
    });
  }
}
