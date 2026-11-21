import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAutorizacaoPrestadorDto {
  @IsInt()
  @Min(1)
  prestadorId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  unidadeId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  moradorId?: number;

  @IsDateString()
  inicioEm!: string;

  @IsDateString()
  fimEm!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
