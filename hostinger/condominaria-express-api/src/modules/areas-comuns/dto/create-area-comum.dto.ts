import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAreaComumDto {
  @IsString()
  @Length(3, 180)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidade?: number;

  @IsOptional()
  @IsBoolean()
  exigeAprovacao?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteReserva?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
