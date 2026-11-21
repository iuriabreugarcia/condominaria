import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class DevolverEncomendaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  motivoDevolucao!: string;
}
