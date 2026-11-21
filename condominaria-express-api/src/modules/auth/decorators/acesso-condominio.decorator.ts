import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CondominioAcessoGuard } from '../guards/condominio-acesso.guard';

export function AcessoCondominio() {
  return applyDecorators(
    UseGuards(JwtAuthGuard, CondominioAcessoGuard),
  );
}
