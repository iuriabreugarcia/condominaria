import { TipoUnidade } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUnidadeDto {
  @IsString()
  @Length(1, 40)
  numero!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  blocoId?: number;

  @IsOptional()
  @IsEnum(TipoUnidade)
  tipo?: TipoUnidade;

  @IsOptional()
  @IsInt()
  andar?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
