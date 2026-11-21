import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AutorizarVisitantePortalDto } from './dto/autorizar-visitante-portal.dto';
import { CreateOcorrenciaPortalDto } from './dto/create-ocorrencia-portal.dto';
import { CreateReservaPortalDto } from './dto/create-reserva-portal.dto';
import { RegistrarVotoPortalDto } from './dto/registrar-voto-portal.dto';
import { CriarAcessoPortalMoradorDto } from './dto/criar-acesso-portal-morador.dto';
import { VincularUsuarioMoradorDto } from './dto/vincular-usuario-morador.dto';
import { PortalMoradorService } from './portal-morador.service';

function respostaVaziaAssembleiasPortal() {
  return {
    itens: [],
    assembleias: [],
    total: 0,
    resumo: {
      abertas: 0,
      agendadas: 0,
      emAndamento: 0,
      encerradas: 0,
      canceladas: 0,
    },
  };
}

function respostaVaziaVotacoesPortal() {
  const resumo = {
    abertas: 0,
    pendentes: 0,
    votadas: 0,
    encerradas: 0,
    exibidas: 0,
  };

  return {
    itens: [],
    assembleias: [],
    votacoes: [],
    votacoesAbertas: [],
    abertas: [],
    pendentes: [],
    votadas: [],
    encerradas: [],
    exibidas: [],
    total: 0,
    resumo,
    filtros: {},
  };
}



@Controller()
export class PortalMoradorController {
  constructor(
    private readonly portalMoradorService: PortalMoradorService,
  ) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post('condominios/:condominioId/moradores/:moradorId/vincular-usuario')
  vincularUsuario(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
    @Body() dto: VincularUsuarioMoradorDto,
  ) {
    return this.portalMoradorService.vincularUsuario(
      condominioId,
      moradorId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post('condominios/:condominioId/moradores/:moradorId/acesso-portal')
  criarAcessoPortal(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
    @Body() dto: CriarAcessoPortalMoradorDto,
  ) {
    return this.portalMoradorService.criarAcessoPortal(
      condominioId,
      moradorId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch('condominios/:condominioId/moradores/:moradorId/desvincular-usuario')
  desvincularUsuario(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('moradorId', ParseIntPipe) moradorId: number,
  ) {
    return this.portalMoradorService.desvincularUsuario(
      condominioId,
      moradorId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/me')
  meuContexto(
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.portalMoradorService.meuContexto(usuario);
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/dashboard')
  dashboard(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portalMoradorService.dashboard(
      usuario,
      condominioId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/comunicados')
  comunicados(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.comunicados(
      usuario,
      condominioId,
      query,
    );
  }


  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/notificacoes')
  notificacoesPortal(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portalMoradorService.notificacoesPortal(
      usuario,
      condominioId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/notificacoes/preferencias')
  preferenciasNotificacoesPortal(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portalMoradorService.preferenciasNotificacoesPortal(
      usuario,
      condominioId,
    );
  }


  @UseGuards(JwtAuthGuard)
  @Patch('portal-morador/condominios/:condominioId/notificacoes/preferencias')
  atualizarPreferenciasNotificacoesPortal(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() body: { preferencias?: Record<string, boolean> },
  ) {
    return this.portalMoradorService.atualizarPreferenciasNotificacoesPortal(
      usuario,
      condominioId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('portal-morador/condominios/:condominioId/notificacoes/lidas')
  marcarNotificacoesPortalLidas(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() body: { ids?: string[] },
  ) {
    return this.portalMoradorService.marcarNotificacoesPortalLidas(
      usuario,
      condominioId,
      body?.ids ?? [],
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('portal-morador/condominios/:condominioId/notificacoes/:notificacaoId/lida')
  marcarNotificacaoPortalLida(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('notificacaoId') notificacaoId: string,
  ) {
    return this.portalMoradorService.marcarNotificacaoPortalLida(
      usuario,
      condominioId,
      notificacaoId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/cobrancas')
  cobrancas(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.cobrancas(
      usuario,
      condominioId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/encomendas')
  encomendas(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.encomendas(
      usuario,
      condominioId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/reservas')
  reservas(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.reservas(
      usuario,
      condominioId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/ocorrencias')
  ocorrencias(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.ocorrencias(
      usuario,
      condominioId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/ocorrencias/:ocorrenciaId')
  ocorrenciaPortalDetalhe(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ocorrenciaId', ParseIntPipe) ocorrenciaId: number,
  ) {
    return this.portalMoradorService.ocorrenciaPortalDetalhe(
      usuario,
      condominioId,
      ocorrenciaId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('portal-morador/condominios/:condominioId/ocorrencias')
  abrirOcorrencia(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateOcorrenciaPortalDto,
  ) {
    return this.portalMoradorService.abrirOcorrencia(
      usuario,
      condominioId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('portal-morador/condominios/:condominioId/reservas')
  solicitarReserva(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateReservaPortalDto,
  ) {
    return this.portalMoradorService.solicitarReserva(
      usuario,
      condominioId,
      dto,
    );
  }


  @UseGuards(JwtAuthGuard)
  @Post('portal-morador/condominios/:condominioId/visitantes/autorizacoes')
  autorizarVisitante(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: AutorizarVisitantePortalDto,
  ) {
    return this.portalMoradorService.autorizarVisitante(
      usuario,
      condominioId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/visitantes/autorizacoes')
  autorizacoesVisitante(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.autorizacoesVisitante(
      usuario,
      condominioId,
      query,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/assembleias')
  async assembleiasPortal(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.listarAssembleiasPortalReais(
      usuario,
      condominioId,
    );
  }




  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/votacoes/abertas')
  async votacoesAbertas(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.portalMoradorService.listarVotacoesAbertasPortalReais(
      usuario,
      condominioId,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/assembleias/:assembleiaId/votacoes/:votacaoId/resultados')
  resultadoVotacaoPortal(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
  ) {
    return this.portalMoradorService.resultadoVotacaoPortal(
      usuario,
      condominioId,
      assembleiaId,
      votacaoId,
    );
  }



  @UseGuards(JwtAuthGuard)
  @Post('portal-morador/condominios/:condominioId/votacoes/:votacaoId/votos')
  registrarVotoPortal(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
    @Body() dto: RegistrarVotoPortalDto,
  ) {
    return this.portalMoradorService.registrarVotoPortal(
      usuario,
      condominioId,
      votacaoId,
      dto,
    );
  }


  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/unidades')
  unidadesDisponiveis(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portalMoradorService.unidadesDisponiveis(
      usuario,
      condominioId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/areas-comuns/reservaveis')
  areasComunsReservaveis(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portalMoradorService.areasComunsReservaveis(
      usuario,
      condominioId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('portal-morador/condominios/:condominioId/visitantes/recentes')
  visitantesRecentes(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.portalMoradorService.visitantesRecentes(
      usuario,
      condominioId,
    );
  }


  @UseGuards(JwtAuthGuard)
  @Get(
    'portal-morador/condominios/:condominioId/assembleias/:assembleiaId/ata-resumo',
  )
  ataResumoAssembleiaPortal(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
  ) {
    return this.portalMoradorService.ataResumoAssembleiaPortal(
      usuario,
      condominioId,
      assembleiaId,
    );
  }


  @UseGuards(JwtAuthGuard)
  @Get(
    'portal-morador/condominios/:condominioId/assembleias/:assembleiaId/votacoes/:votacaoId/comprovante',
  )
  comprovanteParticipacaoVotacaoEncerrada(
    @UsuarioAtual() usuario: AuthenticatedUser,
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
  ) {
    return this.portalMoradorService.comprovanteParticipacaoVotacaoEncerrada(
      usuario,
      condominioId,
      assembleiaId,
      votacaoId,
    );
  }

}