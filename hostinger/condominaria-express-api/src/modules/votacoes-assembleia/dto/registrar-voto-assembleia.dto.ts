import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarVotoAssembleiaDto {
  @IsInt()
  @Min(1)
  opcaoId!: number;

  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  moradorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
