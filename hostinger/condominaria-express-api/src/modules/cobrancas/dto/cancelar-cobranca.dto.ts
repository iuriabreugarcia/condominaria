import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelarCobrancaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motivoCancelamento!: string;
}
