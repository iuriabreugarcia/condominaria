import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateOpcaoVotacaoDto {
  @IsString()
  @Length(1, 180)
  descricao!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
