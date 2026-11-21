import {
  IsInt,
  Min,
} from 'class-validator';

export class VincularUsuarioMoradorDto {
  @IsInt()
  @Min(1)
  usuarioId!: number;
}
