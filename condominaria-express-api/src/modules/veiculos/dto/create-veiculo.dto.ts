import { TipoVeiculo } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVeiculoDto {
  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  moradorId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  vagaGaragemId?: number;

  @IsEnum(TipoVeiculo)
  tipo!: TipoVeiculo;

  @IsOptional()
  @IsString()
  @Length(5, 20)
  placa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  cor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
