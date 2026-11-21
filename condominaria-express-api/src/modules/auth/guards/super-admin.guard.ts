import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (usuario?.superAdmin === true) {
      return true;
    }

    throw new ForbiddenException(
      'Apenas administradores globais podem acessar este recurso.',
    );
  }
}
