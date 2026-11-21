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
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ComunicadosService } from './comunicados.service';
import { CreateComunicadoDto } from './dto/create-comunicado.dto';

@Controller('condominios/:condominioId/comunicados')
export class ComunicadosController {
  constructor(private readonly comunicadosService: ComunicadosService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateComunicadoDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.comunicadosService.create(condominioId, dto, usuario);
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
    return this.comunicadosService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':comunicadoId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('comunicadoId', ParseIntPipe) comunicadoId: number,
  ) {
    return this.comunicadosService.findOne(
      condominioId,
      comunicadoId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Get(':comunicadoId/leituras')
  findLeituras(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('comunicadoId', ParseIntPipe) comunicadoId: number,
  ) {
    return this.comunicadosService.findLeituras(
      condominioId,
      comunicadoId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':comunicadoId/publicar')
  publicar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('comunicadoId', ParseIntPipe) comunicadoId: number,
  ) {
    return this.comunicadosService.publicar(
      condominioId,
      comunicadoId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':comunicadoId/arquivar')
  arquivar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('comunicadoId', ParseIntPipe) comunicadoId: number,
  ) {
    return this.comunicadosService.arquivar(
      condominioId,
      comunicadoId,
    );
  }
}

@Controller('portal-morador/condominios/:condominioId/comunicados')
export class PortalMoradorComunicadosController {
  constructor(private readonly comunicadosService: ComunicadosService) {}

  @Get()
  findAllPortal(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.comunicadosService.findAllPortal(condominioId, usuario);
  }

  @Patch(':comunicadoId/lida')
  marcarLeituraPortal(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('comunicadoId', ParseIntPipe) comunicadoId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.comunicadosService.marcarLeituraPortal(
      condominioId,
      comunicadoId,
      usuario,
    );
  }
}
