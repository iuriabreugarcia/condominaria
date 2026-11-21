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
import { CreateVagaGaragemDto } from './dto/create-vaga-garagem.dto';
import { GaragensService } from './garagens.service';

@Controller('condominios/:condominioId/vagas-garagem')
export class GaragensController {
  constructor(private readonly garagensService: GaragensService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateVagaGaragemDto,
  ) {
    return this.garagensService.create(condominioId, dto);
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
    return this.garagensService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':vagaId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('vagaId', ParseIntPipe) vagaId: number,
  ) {
    return this.garagensService.findOne(condominioId, vagaId);
  }
}
