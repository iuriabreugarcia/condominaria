import { TipoVagaGaragem } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVagaGaragemDto {
  @IsString()
  @Length(1, 80)
  identificador!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  unidadeId?: number;

  @IsOptional()
  @IsEnum(TipoVagaGaragem)
  tipo?: TipoVagaGaragem;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;
}
