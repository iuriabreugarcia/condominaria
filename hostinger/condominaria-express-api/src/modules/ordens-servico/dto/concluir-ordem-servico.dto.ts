import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConcluirOrdemServicoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacao?: string;
}
