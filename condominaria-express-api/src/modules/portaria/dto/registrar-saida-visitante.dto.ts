import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistrarSaidaVisitanteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoesSaida?: string;
}
