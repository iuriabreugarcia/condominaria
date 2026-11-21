import { PapelCondominio } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUsuarioCondominioDto {
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsOptional()
  @IsString()
  @Length(3, 180)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsEnum(PapelCondominio)
  papel!: PapelCondominio;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha?: string;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
