import {
  IsString,
  Length,
} from 'class-validator';

export class DeliberarPautaAssembleiaDto {
  @IsString()
  @Length(5, 10000)
  deliberacao!: string;
}
