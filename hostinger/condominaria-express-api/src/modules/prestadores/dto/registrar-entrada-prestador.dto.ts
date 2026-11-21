import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegistrarEntradaPrestadorDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoesEntrada?: string;
}
