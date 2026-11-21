import { PrioridadeOcorrencia } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOcorrenciaDto {
  @IsString()
  @Length(5, 180)
  titulo!: string;

  @IsString()
  @Length(10, 5000)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @IsEnum(PrioridadeOcorrencia)
  prioridade?: PrioridadeOcorrencia;

  @IsOptional()
  @IsInt()
  @Min(1)
  unidadeId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  moradorId?: number;
}
