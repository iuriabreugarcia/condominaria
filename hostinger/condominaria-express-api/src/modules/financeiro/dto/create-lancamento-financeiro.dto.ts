import { TipoLancamentoFinanceiro } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLancamentoFinanceiroDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  categoriaId?: number;

  @IsEnum(TipoLancamentoFinanceiro)
  tipo!: TipoLancamentoFinanceiro;

  @IsString()
  @Length(3, 180)
  descricao!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'O valor deve ter formato decimal válido, como 150.00.',
  })
  valor!: string;

  @IsDateString()
  competenciaEm!: string;

  @IsOptional()
  @IsDateString()
  vencimentoEm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoes?: string;
}
