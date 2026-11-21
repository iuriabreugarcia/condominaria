import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RetirarEncomendaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  retiradoPorNome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacoesRetirada?: string;
}
