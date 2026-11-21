import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservaPortalDto {
  @IsInt()
  @Min(1)
  areaComumId!: number;

  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  titulo?: string;

  @IsDateString()
  inicioEm!: string;

  @IsDateString()
  fimEm!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
