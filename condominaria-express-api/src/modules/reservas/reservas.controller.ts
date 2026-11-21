import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Patch,
  Post,
} from '@nestjs/common';
import { PapelCondominio } from '@prisma/client';
import { PapeisCondominio } from '../auth/decorators/papeis-condominio.decorator';
import { UsuarioAtual } from '../auth/decorators/usuario-atual.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateReservaAreaComumDto } from './dto/create-reserva-area-comum.dto';
import { RecusarReservaDto } from './dto/recusar-reserva.dto';
import { ReservasService } from './reservas.service';

@Controller('condominios/:condominioId/reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Post()
  create(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Body() dto: CreateReservaAreaComumDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.reservasService.create(condominioId, dto, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('agenda')
  agenda(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query('inicioEm') inicioEm?: string,
    @Query('fimEm') fimEm?: string,
  ) {
    return this.reservasService.agenda(
      condominioId,
      inicioEm,
      fimEm,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get('disponibilidade')
  verificarDisponibilidade(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Query('areaComumId', ParseIntPipe) areaComumId: number,
    @Query('inicioEm') inicioEm: string,
    @Query('fimEm') fimEm: string,
  ) {
    return this.reservasService.verificarDisponibilidade(
      condominioId,
      areaComumId,
      inicioEm,
      fimEm,
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
    return this.reservasService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.PORTEIRO,
  )
  @Get(':reservaId')
  findOne(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
  ) {
    return this.reservasService.findOne(condominioId, reservaId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':reservaId/aprovar')
  aprovar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.reservasService.aprovar(
      condominioId,
      reservaId,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':reservaId/recusar')
  recusar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() dto: RecusarReservaDto,
  ) {
    return this.reservasService.recusar(
      condominioId,
      reservaId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':reservaId/concluir')
  concluir(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
  ) {
    return this.reservasService.concluir(
      condominioId,
      reservaId,
    );
  }

  @PapeisCondominio(PapelCondominio.MORADOR)
  @Patch(':reservaId/cancelar-portal')
  cancelarPortal(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.reservasService.cancelarPortal(
      condominioId,
      reservaId,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
  )
  @Patch(':reservaId/cancelar')
  cancelar(
    @Param('condominioId', ParseIntPipe) condominioId: number,
    @Param('reservaId', ParseIntPipe) reservaId: number,
  ) {
    return this.reservasService.cancelar(
      condominioId,
      reservaId,
    );
  }
}
