import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCondominioDto {
  @IsString()
  @Length(3, 180)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  logradouro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complemento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;
}
