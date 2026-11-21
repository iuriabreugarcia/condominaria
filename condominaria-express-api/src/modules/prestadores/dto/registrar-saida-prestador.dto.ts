import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegistrarSaidaPrestadorDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoesSaida?: string;
}
