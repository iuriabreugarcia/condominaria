import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservaAreaComumDto {
  @IsInt()
  @Min(1)
  areaComumId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  unidadeId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  moradorId?: number;

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
