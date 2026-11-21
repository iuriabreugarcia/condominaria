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
import { CreateAutorizacaoPrestadorDto } from './dto/create-autorizacao-prestador.dto';
import { CreatePrestadorDto } from './dto/create-prestador.dto';
import { UpdatePrestadorDto } from './dto/update-prestador.dto';
import { RegistrarEntradaPrestadorDto } from './dto/registrar-entrada-prestador.dto';
import { RegistrarSaidaPrestadorDto } from './dto/registrar-saida-prestador.dto';
import { PrestadoresService } from './prestadores.service';

@Controller('condominios/:condominioId/prestadores')
export class PrestadoresController {
  constructor(private readonly prestadoresService: PrestadoresService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post()
  criarPrestador(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreatePrestadorDto,
  ) {
    return this.prestadoresService.criarPrestador(condominioId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get()
  listarPrestadores(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.prestadoresService.listarPrestadores(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post('autorizacoes')
  criarAutorizacao(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateAutorizacaoPrestadorDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.prestadoresService.criarAutorizacao(
      condominioId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('autorizacoes/ativas')
  listarAutorizacoesAtivas(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.prestadoresService.listarAutorizacoesAtivas(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post('autorizacoes/:autorizacaoId/entrada')
  registrarEntrada(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('autorizacaoId', ParseIntPipe) autorizacaoId: number,
    @Body() dto: RegistrarEntradaPrestadorDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.prestadoresService.registrarEntrada(
      condominioId,
      autorizacaoId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('acessos/em-aberto')
  listarAcessosEmAberto(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.prestadoresService.listarAcessosEmAberto(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Post('acessos/:registroId/saida')
  registrarSaida(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('registroId', ParseIntPipe) registroId: number,
    @Body() dto: RegistrarSaidaPrestadorDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.prestadoresService.registrarSaida(
      condominioId,
      registroId,
      dto,
      usuario,
    );
  }


  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Patch(':prestadorId')
  atualizarPrestador(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('prestadorId', ParseIntPipe) prestadorId: number,
    @Body() dto: UpdatePrestadorDto,
  ) {
    return this.prestadoresService.atualizarPrestador(
      condominioId,
      prestadorId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Patch(':prestadorId/status')
  alterarStatusPrestador(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('prestadorId', ParseIntPipe) prestadorId: number,
    @Body() dto: { ativo?: boolean },
  ) {
    return this.prestadoresService.alterarStatusPrestador(
      condominioId,
      prestadorId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':prestadorId')
  buscarPrestador(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('prestadorId', ParseIntPipe) prestadorId: number,
  ) {
    return this.prestadoresService.buscarPrestador(
      condominioId,
      prestadorId,
    );
  }
}
