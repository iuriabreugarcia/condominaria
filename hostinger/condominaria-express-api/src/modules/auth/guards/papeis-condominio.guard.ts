import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelCondominio } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { PAPEIS_CONDOMINIO_KEY } from '../decorators/papeis-condominio.decorator';

@Injectable()
export class PapeisCondominioGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const papeisPermitidos =
      this.reflector.getAllAndOverride<PapelCondominio[]>(
        PAPEIS_CONDOMINIO_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!papeisPermitidos || papeisPermitidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params: {
        id?: string;
        condominioId?: string;
      };
    }>();

    const usuario = request.user;
    const condominioId = Number(
      request.params.condominioId ?? request.params.id,
    );

    if (!usuario) {
      throw new ForbiddenException('Usuário autenticado não identificado.');
    }

    if (usuario.superAdmin) {
      return true;
    }

    const vinculo = await this.prisma.usuarioCondominio.findFirst({
      where: {
        usuarioId: usuario.id,
        condominioId,
        ativo: true,
        papel: {
          in: papeisPermitidos,
        },
      },
      select: {
        id: true,
      },
    });

    if (!vinculo) {
      throw new ForbiddenException(
        'Seu perfil não permite executar esta ação neste condomínio.',
      );
    }

    return true;
  }
}
