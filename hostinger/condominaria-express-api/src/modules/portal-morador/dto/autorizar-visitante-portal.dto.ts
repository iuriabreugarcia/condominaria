import { TipoDocumentoVisitante } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AutorizarVisitantePortalDto {
  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  visitanteId?: number;

  @ValidateIf((dto) => !dto.visitanteId)
  @IsString()
  @Length(3, 180)
  nome?: string;

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

  @IsDateString()
  inicioEm!: string;

  @IsDateString()
  fimEm!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
