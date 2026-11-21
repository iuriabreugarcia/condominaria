import { IsDateString, IsOptional } from 'class-validator';

export class PagarCobrancaDto {
  @IsOptional()
  @IsDateString()
  pagoEm?: string;
}
