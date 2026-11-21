import { TipoEncomendaPortaria } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEncomendaDto {
  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  moradorId?: number;

  @IsOptional()
  @IsEnum(TipoEncomendaPortaria)
  tipo?: TipoEncomendaPortaria;

  @IsString()
  @Length(3, 180)
  descricao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  remetente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  codigoRastreio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  destinatarioNome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
