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
import { AreasComunsService } from './areas-comuns.service';
import { CreateAreaComumDto } from './dto/create-area-comum.dto';

@Controller('condominios/:condominioId/areas-comuns')
export class AreasComunsController {
  constructor(private readonly areasComunsService: AreasComunsService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateAreaComumDto,
  ) {
    return this.areasComunsService.create(condominioId, dto);
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
    return this.areasComunsService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':areaComumId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('areaComumId', ParseIntPipe) areaComumId: number,
  ) {
    return this.areasComunsService.findOne(
      condominioId,
      areaComumId,
    );
  }
}
