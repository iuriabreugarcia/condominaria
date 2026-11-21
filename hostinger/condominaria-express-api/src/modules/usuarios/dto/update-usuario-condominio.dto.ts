import { PapelCondominio } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateUsuarioCondominioDto {
  @IsOptional()
  @IsEnum(PapelCondominio)
  papel?: PapelCondominio;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
