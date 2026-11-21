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
import { CreateUnidadeDto } from './dto/create-unidade.dto';
import { UnidadesService } from './unidades.service';

@Controller('condominios/:condominioId/unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateUnidadeDto,
  ) {
    return this.unidadesService.create(condominioId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
    PapelCondominio.CONSELHEIRO,
    PapelCondominio.FINANCEIRO,
    PapelCondominio.PORTEIRO,
  )
  @Get()
  findAll(@Param('condominioId', ParseIntPipe) condominioId: number) {
    return this.unidadesService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
    PapelCondominio.CONSELHEIRO,
    PapelCondominio.FINANCEIRO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':unidadeId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('unidadeId', ParseIntPipe) unidadeId: number,
  ) {
    return this.unidadesService.findOne(condominioId, unidadeId);
  }
}
