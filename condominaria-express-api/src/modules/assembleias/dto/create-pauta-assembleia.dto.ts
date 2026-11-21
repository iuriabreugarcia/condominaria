import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreatePautaAssembleiaDto {
  @IsString()
  @Length(3, 180)
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
