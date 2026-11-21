import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { CreateMoradorDto } from './dto/create-morador.dto';
import { VincularUnidadeDto } from './dto/vincular-unidade.dto';
import { MoradoresService } from './moradores.service';

@Controller('condominios/:condominioId/moradores')
export class MoradoresController {
  constructor(private readonly moradoresService: MoradoresService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateMoradorDto,
  ) {
    return this.moradoresService.create(condominioId, dto);
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
    return this.moradoresService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
    PapelCondominio.CONSELHEIRO,
    PapelCondominio.FINANCEIRO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':moradorId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
  ) {
    return this.moradoresService.findOne(condominioId, moradorId);
  }


  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
  )
  @Post(':moradorId/acesso-portal')
  criarAcessoPortal(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
    @Body()
    dto: {
      email?: string;
      telefone?: string;
      senha?: string;
    },
  ) {
    return this.moradoresService.criarAcessoPortal(
      condominioId,
      moradorId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
  )
  @Patch(':moradorId/usuario')
  vincularUsuarioExistente(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
    @Body()
    dto: {
      email?: string;
    },
  ) {
    return this.moradoresService.vincularUsuarioExistente(
      condominioId,
      moradorId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
  )
  @Delete(':moradorId/usuario')
  desvincularUsuario(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
  ) {
    return this.moradoresService.desvincularUsuario(condominioId, moradorId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.SUBSINDICO,
  )
  @Post(':moradorId/unidades')
  vincularUnidade(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
    @Body() dto: VincularUnidadeDto,
  ) {
    return this.moradoresService.vincularUnidade(
      condominioId,
      moradorId,
      dto,
    );
  }
}
