import { PrioridadeComunicado } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateComunicadoDto {
  @IsString()
  @Length(5, 180)
  titulo!: string;

  @IsString()
  @Length(10, 10000)
  conteudo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @IsEnum(PrioridadeComunicado)
  prioridade?: PrioridadeComunicado;

  @IsOptional()
  @IsBoolean()
  destaque?: boolean;

  @IsOptional()
  @IsDateString()
  expiraEm?: string;
}
