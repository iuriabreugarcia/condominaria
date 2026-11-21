import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateConfiguracoesCondominioDto {
  @IsOptional()
  @IsString()
  @Length(3, 180)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  logradouro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complemento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bairro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  nomeExibicaoPortal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mensagemBoasVindasPortal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  instrucoesGeraisPortal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  contatosUteisPortal?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  prazoPadraoCobrancaDias?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  instrucoesVisitantes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  instrucoesEncomendas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  politicaReservas?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  assinaturaComunicados?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  pixChave?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  pixTipo?: string;

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
