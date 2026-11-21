import { IsDateString, IsOptional } from 'class-validator';

export class PagarLancamentoFinanceiroDto {
  @IsOptional()
  @IsDateString()
  pagoEm?: string;
}
