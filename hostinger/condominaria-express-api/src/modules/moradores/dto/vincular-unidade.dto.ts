import { PapelMoradorUnidade } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class VincularUnidadeDto {
  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsEnum(PapelMoradorUnidade)
  papel!: PapelMoradorUnidade;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
