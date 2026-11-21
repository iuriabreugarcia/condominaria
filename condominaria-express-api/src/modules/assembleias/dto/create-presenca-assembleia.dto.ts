import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePresencaAssembleiaDto {
  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  moradorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  nomeRepresentante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  documentoRepresentante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;

  @IsOptional()
  @IsBoolean()
  porProcuracao?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  procuracaoObservacoes?: string;
}
