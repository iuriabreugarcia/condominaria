import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class CondominioAcessoGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    if (!Number.isInteger(condominioId) || condominioId < 1) {
      throw new NotFoundException('Condomínio não encontrado.');
    }

    if (usuario.superAdmin) {
      return true;
    }

    const vinculo = await this.prisma.usuarioCondominio.findFirst({
      where: {
        usuarioId: usuario.id,
        condominioId,
        ativo: true,
        condominio: {
          ativo: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (!vinculo) {
      throw new ForbiddenException(
        'Você não possui acesso a este condomínio.',
      );
    }

    return true;
  }
}
