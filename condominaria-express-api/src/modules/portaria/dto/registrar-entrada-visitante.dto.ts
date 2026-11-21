import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistrarEntradaVisitanteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoesEntrada?: string;
}
