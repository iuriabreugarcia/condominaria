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
} from "@nestjs/common";
import { PapelCondominio } from "@prisma/client";
import { PapeisCondominio } from "../auth/decorators/papeis-condominio.decorator";
import { UsuarioAtual } from "../auth/decorators/usuario-atual.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CancelarCobrancaDto } from "./dto/cancelar-cobranca.dto";
import { CreateCobrancaDto } from "./dto/create-cobranca.dto";
import { CreateCobrancasLoteDto } from "./dto/create-cobrancas-lote.dto";
import { PagarCobrancaDto } from "./dto/pagar-cobranca.dto";
import { UpdateCobrancaDto } from "./dto/update-cobranca.dto";
import { CobrancasService } from "./cobrancas.service";

@Controller("condominios/:condominioId/cobrancas")
export class CobrancasController {
  constructor(private readonly cobrancasService: CobrancasService) {}

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Post()
  create(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Body() dto: CreateCobrancaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.create(condominioId, dto, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Post("lote")
  createLote(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Body() dto: CreateCobrancasLoteDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.createLote(condominioId, dto, usuario);
  }
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId/comprovante")
  enviarComprovante(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @Body() dto: {
      arquivoNome?: string;
      arquivoTipo?: string;
      arquivoDados?: string;
      observacao?: string;
    },
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.enviarComprovante(
      condominioId,
      cobrancaId,
      dto,
      usuario,
    );
  }
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get(":cobrancaId/comprovante")
  obterComprovante(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.obterComprovante(
      condominioId,
      cobrancaId,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId/comprovante/aprovar")
  aprovarComprovante(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.aprovarComprovante(
      condominioId,
      cobrancaId,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId/comprovante/recusar")
  recusarComprovante(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @Body() dto: { motivo?: string },
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.recusarComprovante(
      condominioId,
      cobrancaId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get()
  findAll(@Param("condominioId", ParseIntPipe) condominioId: number) {
    return this.cobrancasService.findAll(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get("resumo")
  resumo(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Query("inicio") inicio: string,
    @Query("fim") fim: string,
  ) {
    return this.cobrancasService.resumoPorPeriodo(condominioId, inicio, fim);
  }

  @Get("notificacoes/preferencias/portal")
  preferenciasNotificacoesPortal(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.preferenciasNotificacoesPortal(
      condominioId,
      usuario,
    );
  }

  @Patch("notificacoes/preferencias/portal")
  atualizarPreferenciasNotificacoesPortal(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Body() dto: { preferencias?: Record<string, boolean> },
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.atualizarPreferenciasNotificacoesPortal(
      condominioId,
      dto,
      usuario,
    );
  }

  @Get("notificacoes/portal")
  notificacoesPortal(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.notificacoesPortal(condominioId, usuario);
  }

  @Patch("notificacoes/:notificacaoId/lida")
  marcarNotificacaoPortalComoLida(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("notificacaoId") notificacaoId: string,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.marcarNotificacaoPortalComoLida(
      condominioId,
      notificacaoId,
      usuario,
    );
  }

  @Patch("notificacoes/lidas")
  marcarNotificacoesPortalComoLidas(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Body() dto: { ids?: string[] },
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.marcarNotificacoesPortalComoLidas(
      condominioId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get(":cobrancaId")
  findOne(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
  ) {
    return this.cobrancasService.findOne(condominioId, cobrancaId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId")
  update(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @Body() dto: UpdateCobrancaDto,
  ) {
    return this.cobrancasService.update(condominioId, cobrancaId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId/pagar")
  pagar(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @Body() dto: PagarCobrancaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.pagar(condominioId, cobrancaId, dto, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId/estornar-pagamento")
  estornarPagamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.estornarPagamento(
      condominioId,
      cobrancaId,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId/cancelar")
  cancelar(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @Body() dto: CancelarCobrancaDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.cancelar(
      condominioId,
      cobrancaId,
      dto,
      usuario,
    );
  }
}
@UseGuards(JwtAuthGuard)
@Controller('portal-morador/condominios/:condominioId/cobrancas')
export class PortalMoradorCobrancasController {
  constructor(private readonly cobrancasService: CobrancasService) {}
  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch(":cobrancaId/comprovante")
  enviarComprovante(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("cobrancaId", ParseIntPipe) cobrancaId: number,
    @Body() dto: {
      arquivoNome?: string;
      arquivoTipo?: string;
      arquivoDados?: string;
      observacao?: string;
    },
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.cobrancasService.enviarComprovante(
      condominioId,
      cobrancaId,
      dto,
      usuario,
    );
  }
}

