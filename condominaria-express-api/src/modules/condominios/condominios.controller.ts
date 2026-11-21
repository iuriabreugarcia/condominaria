import { Body, Controller, Get, Param, Patch, ParseIntPipe, Post, Query, UseGuards, } from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { AcessoCondominio } from '../auth/decorators/acesso-condominio.decorator';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { SomenteSuperAdmin } from '../auth/decorators/somente-super-admin.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CondominiosService } from './condominios.service';
import { CreateCondominioDto } from './dto/create-condominio.dto';
import { UpdateConfiguracoesCondominioDto } from './dto/update-configuracoes-condominio.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';

@Controller('condominios')
export class CondominiosController {
  constructor(private readonly condominiosService: CondominiosService) {}

  @SomenteSuperAdmin()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateCondominioDto) {
    return this.condominiosService.create(dto);
  }

  @SomenteSuperAdmin()
  @Get()
  findAll() {
    return this.condominiosService.findAll();
  }


  @AcessoCondominio()
  @Get(':id/configuracoes/portal')
  obterConfiguracoesPortal(@Param('id', ParseIntPipe) id: number) {
    return this.condominiosService.obterConfiguracoesPortal(id);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, )
  @Get(':id/configuracoes')
  obterConfiguracoes(@Param('id', ParseIntPipe) id: number) {
    return this.condominiosService.obterConfiguracoes(id);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, )
  @Patch(':id/configuracoes')
  atualizarConfiguracoes(
    @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConfiguracoesCondominioDto, ) {
    return this.condominiosService.atualizarConfiguracoes(id, dto);
  }


  @AcessoCondominio()
  @Get(':id/documentos/portal')
  listarDocumentosPortal(
    @Param('id', ParseIntPipe) id: number, @Query() filtros: Record<string, string | undefined>, ) {
    return this.condominiosService.listarDocumentosPortal(id, filtros);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.CONSELHEIRO, )
  @Get(':id/documentos')
  listarDocumentos(
    @Param('id', ParseIntPipe) id: number, @Query() filtros: Record<string, string | undefined>, ) {
    return this.condominiosService.listarDocumentos(id, filtros);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, )
  @Post(':id/documentos')
  criarDocumento(
    @Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>, @UsuarioAtual() usuario: AuthenticatedUser, ) {
    return this.condominiosService.criarDocumento(id, dto, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, )
  @Patch(':id/documentos/:documentoId')
  atualizarDocumento(
    @Param('id', ParseIntPipe) id: number, @Param('documentoId', ParseIntPipe) documentoId: number, @Body() dto: Record<string, unknown>, ) {
    return this.condominiosService.atualizarDocumento(id, documentoId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, )
  @Patch(':id/documentos/:documentoId/publicar')
  publicarDocumento(
    @Param('id', ParseIntPipe) id: number, @Param('documentoId', ParseIntPipe) documentoId: number, ) {
    return this.condominiosService.publicarDocumento(id, documentoId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, )
  @Patch(':id/documentos/:documentoId/arquivar')
  arquivarDocumento(
    @Param('id', ParseIntPipe) id: number, @Param('documentoId', ParseIntPipe) documentoId: number, ) {
    return this.condominiosService.arquivarDocumento(id, documentoId);
  }

  @AcessoCondominio()
  @Get(':id/relatorios/geral')
  relatorioGeral(
    @Param('id', ParseIntPipe) id: number, @Query() filtros: Record<string, string | undefined>, ) {
    return this.condominiosService.relatorioGeral(id, filtros);
  }

  @AcessoCondominio()
  @Get(':id/auditoria')
  listarAuditoriaGeral(
    @Param('id', ParseIntPipe) id: number, @Query() filtros: Record<string, string | undefined>, ) {
    return this.condominiosService.listarAuditoriaGeral(id, filtros);
  }


  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.PORTEIRO, PapelCondominio.FINANCEIRO, )
  @Get(':id/manutencoes')
  listarManutencoes(
    @Param('id', ParseIntPipe) id: number, @Query() filtros: Record<string, string | undefined>, ) {
    return this.condominiosService.listarManutencoes(id, filtros);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.PORTEIRO, )
  @Get(':id/manutencoes/resumo')
  resumoManutencoes(@Param('id', ParseIntPipe) id: number) {
    return this.condominiosService.resumoManutencoes(id);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.PORTEIRO, )
  @Post(':id/manutencoes')
  criarManutencao(
    @Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>, @UsuarioAtual() usuario: AuthenticatedUser, ) {
    return this.condominiosService.criarManutencao(id, dto, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.PORTEIRO, )
  @Patch(':id/manutencoes/:ordemId')
  atualizarManutencao(
    @Param('id', ParseIntPipe) id: number, @Param('ordemId', ParseIntPipe) ordemId: number, @Body() dto: Record<string, unknown>, ) {
    return this.condominiosService.atualizarManutencao(id, ordemId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.PORTEIRO, )
  @Patch(':id/manutencoes/:ordemId/status')
  alterarStatusManutencao(
    @Param('id', ParseIntPipe) id: number, @Param('ordemId', ParseIntPipe) ordemId: number, @Body() dto: Record<string, unknown>, @UsuarioAtual() usuario: AuthenticatedUser, ) {
    return this.condominiosService.alterarStatusManutencao(
      id, ordemId, dto, usuario, );
  }


  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.FINANCEIRO, )
  @Get(':id/contratos')
  listarContratos(
    @Param('id', ParseIntPipe) id: number, @Query() filtros: Record<string, string | undefined>, ) {
    return this.condominiosService.listarContratos(id, filtros);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.FINANCEIRO, )
  @Get(':id/contratos/resumo')
  resumoContratos(@Param('id', ParseIntPipe) id: number) {
    return this.condominiosService.resumoContratos(id);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.FINANCEIRO, )
  @Post(':id/contratos')
  criarContrato(
    @Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>, @UsuarioAtual() usuario: AuthenticatedUser, ) {
    return this.condominiosService.criarContrato(id, dto, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.FINANCEIRO, )
  @Patch(':id/contratos/:contratoId')
  atualizarContrato(
    @Param('id', ParseIntPipe) id: number, @Param('contratoId', ParseIntPipe) contratoId: number, @Body() dto: Record<string, unknown>, ) {
    return this.condominiosService.atualizarContrato(id, contratoId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR, PapelCondominio.SINDICO, PapelCondominio.SUBSINDICO, PapelCondominio.FINANCEIRO, )
  @Patch(':id/contratos/:contratoId/status')
  alterarStatusContrato(
    @Param('id', ParseIntPipe) id: number, @Param('contratoId', ParseIntPipe) contratoId: number, @Body() dto: Record<string, unknown>, ) {
    return this.condominiosService.alterarStatusContrato(id, contratoId, dto);
  }

  @AcessoCondominio()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.condominiosService.findOne(id);
  }
}
