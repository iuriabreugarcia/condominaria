import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { CondominioAcessoGuard } from '../guards/condominio-acesso.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PapeisCondominioGuard } from '../guards/papeis-condominio.guard';

export const PAPEIS_CONDOMINIO_KEY = 'papeis_condominio';

export function PapeisCondominio(...papeis: PapelCondominio[]) {
  return applyDecorators(
    SetMetadata(PAPEIS_CONDOMINIO_KEY, papeis),
    UseGuards(
      JwtAuthGuard,
      CondominioAcessoGuard,
      PapeisCondominioGuard,
    ),
  );
}
