import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelarLancamentoFinanceiroDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motivoCancelamento!: string;
}
