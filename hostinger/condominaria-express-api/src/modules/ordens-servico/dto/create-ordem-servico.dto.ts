import { PrioridadeOrdemServico } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrdemServicoDto {
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
  @IsEnum(PrioridadeOrdemServico)
  prioridade?: PrioridadeOrdemServico;

  @IsOptional()
  @IsInt()
  @Min(1)
  ocorrenciaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  unidadeId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  prestadorId?: number;

  @IsOptional()
  @IsDateString()
  agendadaPara?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
