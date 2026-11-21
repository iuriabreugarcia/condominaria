import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { CreateVeiculoDto } from './dto/create-veiculo.dto';
import { VeiculosService } from './veiculos.service';

@Controller('condominios/:condominioId/veiculos')
export class VeiculosController {
  constructor(private readonly veiculosService: VeiculosService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateVeiculoDto,
  ) {
    return this.veiculosService.create(condominioId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get()
  findAll(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.veiculosService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':veiculoId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('veiculoId', ParseIntPipe) veiculoId: number,
  ) {
    return this.veiculosService.findOne(condominioId, veiculoId);
  }
}
