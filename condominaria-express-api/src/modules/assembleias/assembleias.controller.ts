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
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AssembleiasService } from './assembleias.service';
import { CancelarAssembleiaDto } from './dto/cancelar-assembleia.dto';
import { CreateAssembleiaDto } from './dto/create-assembleia.dto';
import { CreatePautaAssembleiaDto } from './dto/create-pauta-assembleia.dto';
import { CreatePresencaAssembleiaDto } from './dto/create-presenca-assembleia.dto';
import { DeliberarPautaAssembleiaDto } from './dto/deliberar-pauta-assembleia.dto';

@Controller('condominios/:condominioId/assembleias')
export class AssembleiasController {
  constructor(private readonly assembleiasService: AssembleiasService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateAssembleiaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.assembleiasService.create(
      condominioId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get()
  findAll(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.assembleiasService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get(':assembleiaId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
  ) {
    return this.assembleiasService.findOne(
      condominioId,
      assembleiaId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':assembleiaId/convocar')
  convocar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
  ) {
    return this.assembleiasService.convocar(
      condominioId,
      assembleiaId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':assembleiaId/iniciar')
  iniciar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
  ) {
    return this.assembleiasService.iniciar(
      condominioId,
      assembleiaId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':assembleiaId/encerrar')
  encerrar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
  ) {
    return this.assembleiasService.encerrar(
      condominioId,
      assembleiaId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':assembleiaId/cancelar')
  cancelar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Body() dto: CancelarAssembleiaDto,
  ) {
    return this.assembleiasService.cancelar(
      condominioId,
      assembleiaId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post(':assembleiaId/pautas')
  criarPauta(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Body() dto: CreatePautaAssembleiaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.assembleiasService.criarPauta(
      condominioId,
      assembleiaId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':assembleiaId/pautas/:pautaId/deliberar')
  deliberarPauta(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('pautaId', ParseIntPipe) pautaId: number,
    @Body() dto: DeliberarPautaAssembleiaDto,
  ) {
    return this.assembleiasService.deliberarPauta(
      condominioId,
      assembleiaId,
      pautaId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get(':assembleiaId/presencas')
  listarPresencas(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
  ) {
    return this.assembleiasService.listarPresencas(
      condominioId,
      assembleiaId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.CONSELHEIRO,
  )
  @Get(':assembleiaId/quorum')
  resumoQuorum(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
  ) {
    return this.assembleiasService.resumoQuorum(
      condominioId,
      assembleiaId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post(':assembleiaId/presencas')
  registrarPresenca(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Body() dto: CreatePresencaAssembleiaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.assembleiasService.registrarPresenca(
      condominioId,
      assembleiaId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Delete(':assembleiaId/presencas/:presencaId')
  removerPresenca(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('assembleiaId', ParseIntPipe) assembleiaId: number,
    @Param('presencaId', ParseIntPipe) presencaId: number,
  ) {
    return this.assembleiasService.removerPresenca(
      condominioId,
      assembleiaId,
      presencaId,
    );
  }

}
