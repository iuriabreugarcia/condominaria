import {
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateVotacaoAssembleiaDto {
  @IsString()
  @Length(5, 180)
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
