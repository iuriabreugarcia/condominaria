import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards, } from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { SomenteSuperAdmin } from '../auth/decorators/somente-super-admin.decorator';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { CreateUsuarioCondominioDto } from './dto/create-usuario-condominio.dto';
import { UpdateUsuarioCondominioDto } from './dto/update-usuario-condominio.dto';
import { VincularCondominioDto } from './dto/vincular-condominio.dto';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CondominioAcessoGuard } from '../auth/guards/condominio-acesso.guard';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @SomenteSuperAdmin()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @SomenteSuperAdmin()
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @SomenteSuperAdmin()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @SomenteSuperAdmin()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post(':id/condominios')
  vincularCondominio(
    @Param('id', ParseIntPipe) id: number, @Body() dto: VincularCondominioDto, ) {
    return this.usuariosService.vincularCondominio(id, dto);
  }
}

@Controller('condominios/:condominioId/usuarios')
export class UsuariosCondominioController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, )
  @UseGuards(JwtAuthGuard, CondominioAcessoGuard)
  @Get()
  listarPorCondominio(
    @Param('condominioId', ParseIntPipe) condominioId: number, ) {
    return this.usuariosService.listarPorCondominio(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, )
  @UseGuards(JwtAuthGuard, CondominioAcessoGuard)
  @Post()
  criarOuVincularNoCondominio(
    @Param('condominioId', ParseIntPipe) condominioId: number, @Body() dto: CreateUsuarioCondominioDto, ) {
    return this.usuariosService.criarOuVincularNoCondominio(
      condominioId, dto, );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, )
  @UseGuards(JwtAuthGuard, CondominioAcessoGuard)
  @Patch(':usuarioId')
  atualizarVinculoCondominio(
    @Param('condominioId', ParseIntPipe) condominioId: number, @Param('usuarioId', ParseIntPipe) usuarioId: number, @Body() dto: UpdateUsuarioCondominioDto, ) {
    return this.usuariosService.atualizarVinculoCondominio(
      condominioId, usuarioId, dto, );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, )
  @UseGuards(JwtAuthGuard, CondominioAcessoGuard)
  @Delete(':usuarioId')
  removerDoCondominio(
    @Param('condominioId', ParseIntPipe) condominioId: number, @Param('usuarioId', ParseIntPipe) usuarioId: number, ) {
    return this.usuariosService.removerDoCondominio(
      condominioId, usuarioId, );
  }
}
