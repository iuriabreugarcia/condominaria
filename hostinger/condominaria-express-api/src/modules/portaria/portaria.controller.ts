import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { AcessoCondominio } from '../auth/decorators/acesso-condominio.decorator';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateAutorizacaoVisitanteDto } from './dto/create-autorizacao-visitante.dto';
import { CreateVisitanteDto } from './dto/create-visitante.dto';
import { RegistrarEntradaVisitanteDto } from './dto/registrar-entrada-visitante.dto';
import { RegistrarSaidaVisitanteDto } from './dto/registrar-saida-visitante.dto';
import { PortariaService } from './portaria.service';

@Controller('condominios/:condominioId/portaria')
export class PortariaController {
  constructor(private readonly portariaService: PortariaService) {}

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post('visitantes')
  criarVisitante(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateVisitanteDto,
  ) {
    return this.portariaService.criarVisitante(condominioId, dto);
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('visitantes')
  listarVisitantes(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portariaService.listarVisitantes(condominioId);
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('visitantes/:visitanteId')
  buscarVisitante(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('visitanteId', ParseIntPipe) visitanteId: number,
  ) {
    return this.portariaService.buscarVisitante(condominioId, visitanteId);
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post('autorizacoes')
  criarAutorizacao(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateAutorizacaoVisitanteDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.portariaService.criarAutorizacao(
      condominioId,
      dto,
      usuario,
    );
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('autorizacoes/ativas')
  listarAutorizacoesAtivas(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portariaService.listarAutorizacoesAtivas(condominioId);
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('autorizacoes')
  listarAutorizacoes(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portariaService.listarAutorizacoes(condominioId);
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('agenda')
  agendaVisitantes(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portariaService.agendaVisitantes(condominioId);
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch('autorizacoes/:autorizacaoId/cancelar')
  cancelarAutorizacaoVisitante(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('autorizacaoId', ParseIntPipe) autorizacaoId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.portariaService.cancelarAutorizacaoVisitante(
      condominioId,
      autorizacaoId,
      usuario,
    );
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post('autorizacoes/:autorizacaoId/entrada')
  registrarEntrada(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('autorizacaoId', ParseIntPipe) autorizacaoId: number,
    @Body() dto: RegistrarEntradaVisitanteDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.portariaService.registrarEntrada(
      condominioId,
      autorizacaoId,
      dto,
      usuario,
    );
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('acessos/em-aberto')
  listarAcessosEmAberto(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portariaService.listarAcessosEmAberto(condominioId);
  }

  @AcessoCondominio()
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post('acessos/:registroId/saida')
  registrarSaida(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('registroId', ParseIntPipe) registroId: number,
    @Body() dto: RegistrarSaidaVisitanteDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.portariaService.registrarSaida(
      condominioId,
      registroId,
      dto,
      usuario,
    );
  }
}
