import { StatusOcorrencia } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateStatusOcorrenciaDto {
  @IsEnum(StatusOcorrencia)
  status!: StatusOcorrencia;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacao?: string;
}
