import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { AcessoCondominio } from '../auth/decorators/acesso-condominio.decorator';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateEncomendaDto } from './dto/create-encomenda.dto';
import { DevolverEncomendaDto } from './dto/devolver-encomenda.dto';
import { RetirarEncomendaDto } from './dto/retirar-encomenda.dto';
import { EncomendasService } from './encomendas.service';

@Controller('condominios/:condominioId/encomendas')
export class EncomendasController {
  constructor(private readonly encomendasService: EncomendasService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateEncomendaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.encomendasService.create(condominioId, dto, usuario);
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
    return this.encomendasService.findAll(condominioId);
  }


  @AcessoCondominio()
  @PapeisCondominio(PapelCondominio.MORADOR)
  @Get('portal')
  findAllPortal(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.encomendasService.findAllPortal(condominioId, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':encomendaId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('encomendaId', ParseIntPipe) encomendaId: number,
  ) {
    return this.encomendasService.findOne(condominioId, encomendaId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Patch(':encomendaId/retirar')
  retirar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('encomendaId', ParseIntPipe) encomendaId: number,
    @Body() dto: RetirarEncomendaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.encomendasService.retirar(
      condominioId,
      encomendaId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Patch(':encomendaId/devolver')
  devolver(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('encomendaId', ParseIntPipe) encomendaId: number,
    @Body() dto: DevolverEncomendaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.encomendasService.devolver(
      condominioId,
      encomendaId,
      dto,
      usuario,
    );
  }
}
