import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const TIPOS_PIX = ["CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA", "OUTRA"] as const;

export class UpdateConfiguracoesPagamentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  pixChave?: string;

  @IsOptional()
  @IsIn(TIPOS_PIX)
  pixTipo?: (typeof TIPOS_PIX)[number];

  @IsOptional()
  @IsString()
  @MaxLength(180)
  beneficiarioPagamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  bancoPagamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instrucoesPagamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensagemCobrancaPadrao?: string;
}
