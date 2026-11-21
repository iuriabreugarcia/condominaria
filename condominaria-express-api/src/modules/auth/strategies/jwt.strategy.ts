import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado no arquivo .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const usuario = await this.prisma.usuario.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        superAdmin: true,
        ativo: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Usuário inválido ou inativo.');
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      superAdmin: usuario.superAdmin,
    };
  }
}
