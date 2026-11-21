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
import { AgendarOrdemServicoDto } from './dto/agendar-ordem-servico.dto';
import { CancelarOrdemServicoDto } from './dto/cancelar-ordem-servico.dto';
import { ConcluirOrdemServicoDto } from './dto/concluir-ordem-servico.dto';
import { CreateOrdemServicoDto } from './dto/create-ordem-servico.dto';
import { OrdensServicoService } from './ordens-servico.service';

@Controller('condominios/:condominioId/ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly ordensServicoService: OrdensServicoService,
  ) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateOrdemServicoDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.create(
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
  @Get()
  findAll(
    @Param('condominioId', ParseIntPipe) condominioId: number,
  ) {
    return this.ordensServicoService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':ordemId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ordemId', ParseIntPipe) ordemId: number,
  ) {
    return this.ordensServicoService.findOne(
      condominioId,
      ordemId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':ordemId/agendar')
  agendar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ordemId', ParseIntPipe) ordemId: number,
    @Body() dto: AgendarOrdemServicoDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.agendar(
      condominioId,
      ordemId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':ordemId/iniciar')
  iniciar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ordemId', ParseIntPipe) ordemId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.iniciar(
      condominioId,
      ordemId,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':ordemId/concluir')
  concluir(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ordemId', ParseIntPipe) ordemId: number,
    @Body() dto: ConcluirOrdemServicoDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.concluir(
      condominioId,
      ordemId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':ordemId/cancelar')
  cancelar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('ordemId', ParseIntPipe) ordemId: number,
    @Body() dto: CancelarOrdemServicoDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.ordensServicoService.cancelar(
      condominioId,
      ordemId,
      dto,
      usuario,
    );
  }
}
