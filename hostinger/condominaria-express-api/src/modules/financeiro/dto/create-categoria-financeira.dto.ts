import { TipoCategoriaFinanceira } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCategoriaFinanceiraDto {
  @IsString()
  @Length(3, 120)
  nome!: string;

  @IsEnum(TipoCategoriaFinanceira)
  tipo!: TipoCategoriaFinanceira;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;
}
