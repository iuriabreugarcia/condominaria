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
import { CreateOpcaoVotacaoDto } from './dto/create-opcao-votacao.dto';
import { CreateVotacaoAssembleiaDto } from './dto/create-votacao-assembleia.dto';
import { RegistrarVotoAssembleiaDto } from './dto/registrar-voto-assembleia.dto';
import { VotacoesAssembleiaService } from './votacoes-assembleia.service';

@Controller('condominios/:condominioId/votacoes-assembleia')
export class VotacoesAssembleiaResumoController {
  constructor(
    private readonly votacoesAssembleiaService: VotacoesAssembleiaService,
  ) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get('resumo-admin')
  resumoAdmin(@Param('condominioId', ParseIntPipe) condominioId: number) {
    return this.votacoesAssembleiaService.resumoAdmin(condominioId);
  }
}

@Controller('condominios/:condominioId/assembleias/:assembleiaId')
export class VotacoesAssembleiaController {
  constructor(
    private readonly votacoesAssembleiaService: VotacoesAssembleiaService,
  ) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post('pautas/:pautaId/votacao')
  criarVotacao(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('pautaId', ParseIntPipe) pautaId: number,
    @Body() dto: CreateVotacaoAssembleiaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.votacoesAssembleiaService.criarVotacao(
      condominioId,
      assembleiaId,
      pautaId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post('votacoes/:votacaoId/opcoes')
  criarOpcao(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
    @Body() dto: CreateOpcaoVotacaoDto,
  ) {
    return this.votacoesAssembleiaService.criarOpcao(
      condominioId,
      assembleiaId,
      votacaoId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get('votacoes/:votacaoId')
  buscarVotacao(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
  ) {
    return this.votacoesAssembleiaService.buscarVotacao(
      condominioId,
      assembleiaId,
      votacaoId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch('votacoes/:votacaoId/abrir')
  abrir(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
  ) {
    return this.votacoesAssembleiaService.abrir(
      condominioId,
      assembleiaId,
      votacaoId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch('votacoes/:votacaoId/encerrar')
  encerrar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
  ) {
    return this.votacoesAssembleiaService.encerrar(
      condominioId,
      assembleiaId,
      votacaoId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post('votacoes/:votacaoId/votos')
  registrarVoto(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
    @Body() dto: RegistrarVotoAssembleiaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.votacoesAssembleiaService.registrarVoto(
      condominioId,
      assembleiaId,
      votacaoId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get('votacoes/:votacaoId/resultados')
  resultados(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
  ) {
    return this.votacoesAssembleiaService.resultados(
      condominioId,
      assembleiaId,
      votacaoId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get('votacoes/:votacaoId/auditoria-participacao')
  auditoriaParticipacao(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('votacaoId', ParseIntPipe) votacaoId: number,
  ) {
    return this.votacoesAssembleiaService.auditoriaParticipacao(
      condominioId,
      assembleiaId,
      votacaoId,
    );
  }

}
