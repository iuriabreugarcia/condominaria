import { TipoDocumentoVisitante } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateVisitanteDto {
  @IsString()
  @Length(3, 180)
  nome!: string;

  @IsOptional()
  @IsEnum(TipoDocumentoVisitante)
  tipoDocumento?: TipoDocumentoVisitante;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
