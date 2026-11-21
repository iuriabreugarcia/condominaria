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
import { CreateOcorrenciaDto } from './dto/create-ocorrencia.dto';
import { UpdateStatusOcorrenciaDto } from './dto/update-status-ocorrencia.dto';
import { OcorrenciasService } from './ocorrencias.service';

@Controller('condominios/:condominioId/ocorrencias')
export class OcorrenciasController {
  constructor(private readonly ocorrenciasService: OcorrenciasService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateOcorrenciaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.ocorrenciasService.create(condominioId, dto, usuario);
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
    return this.ocorrenciasService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':ocorrenciaId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ocorrenciaId', ParseIntPipe) ocorrenciaId: number,
  ) {
    return this.ocorrenciasService.findOne(
      condominioId,
      ocorrenciaId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':ocorrenciaId/status')
  atualizarStatus(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ocorrenciaId', ParseIntPipe) ocorrenciaId: number,
    @Body() dto: UpdateStatusOcorrenciaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.ocorrenciasService.atualizarStatus(
      condominioId,
      ocorrenciaId,
      dto,
      usuario,
    );
  }
}
