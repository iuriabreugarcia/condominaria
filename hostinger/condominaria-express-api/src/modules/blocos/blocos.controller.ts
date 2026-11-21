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
import { BlocosService } from './blocos.service';
import { CreateBlocoDto } from './dto/create-bloco.dto';

@Controller('condominios/:condominioId/blocos')
export class BlocosController {
  constructor(private readonly blocosService: BlocosService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateBlocoDto,
  ) {
    return this.blocosService.create(condominioId, dto);
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
    return this.blocosService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
    PapelCondominio.CONSELHEIRO,
    PapelCondominio.FINANCEIRO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':blocoId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('blocoId', ParseIntPipe) blocoId: number,
  ) {
    return this.blocosService.findOne(condominioId, blocoId);
  }
}
