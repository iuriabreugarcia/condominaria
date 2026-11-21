import { ModalidadeAssembleia } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateAssembleiaDto {
  @IsString()
  @Length(5, 180)
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsEnum(ModalidadeAssembleia)
  modalidade!: ModalidadeAssembleia;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  local?: string;

  @IsOptional()
  @IsUrl({}, { message: 'O link online deve ser uma URL válida.' })
  linkOnline?: string;

  @IsDateString()
  primeiraChamadaEm!: string;

  @IsOptional()
  @IsDateString()
  segundaChamadaEm?: string;
}
