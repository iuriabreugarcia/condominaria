import { IsString, MaxLength, MinLength } from 'class-validator';

export class RecusarReservaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motivoRecusa!: string;
}
