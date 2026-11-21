import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AgendarOrdemServicoDto {
  @IsDateString()
  agendadaPara!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacao?: string;
}
