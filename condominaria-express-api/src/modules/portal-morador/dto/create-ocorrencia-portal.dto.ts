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

export class CreateOcorrenciaPortalDto {
  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsString()
  @Length(5, 180)
  titulo!: string;

  @IsString()
  @Length(10, 10000)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @IsEnum(PrioridadeOcorrencia)
  prioridade?: PrioridadeOcorrencia;
}
