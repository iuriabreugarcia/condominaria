import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarVotoPortalDto {
  @IsInt()
  @Min(1)
  opcaoId!: number;

  @IsInt()
  @Min(1)
  unidadeId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
