import { PapelCondominio } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class VincularCondominioDto {
  @IsInt()
  @Min(1)
  condominioId!: number;

  @IsEnum(PapelCondominio)
  papel!: PapelCondominio;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
