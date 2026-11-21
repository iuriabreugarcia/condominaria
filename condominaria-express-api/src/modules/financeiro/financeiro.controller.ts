import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { PapelCondominio } from "@prisma/client";
import { PapeisCondominio } from "../auth/decorators/papeis-condominio.decorator";
import { UsuarioAtual } from "../auth/decorators/usuario-atual.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CancelarLancamentoFinanceiroDto } from "./dto/cancelar-lancamento-financeiro.dto";
import { CreateCategoriaFinanceiraDto } from "./dto/create-categoria-financeira.dto";
import { UpdateCategoriaFinanceiraDto } from "./dto/update-categoria-financeira.dto";
import { CreateLancamentoFinanceiroDto } from "./dto/create-lancamento-financeiro.dto";
import { PagarLancamentoFinanceiroDto } from "./dto/pagar-lancamento-financeiro.dto";
import { UpdateLancamentoFinanceiroDto } from "./dto/update-lancamento-financeiro.dto";
import { UpdateConfiguracoesPagamentoDto } from "./dto/update-configuracoes-pagamento.dto";
import { FinanceiroService } from "./financeiro.service";

@Controller("condominios/:condominioId/financeiro")
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get("configuracoes-pagamento-portal")
  obterConfiguracoesPagamentoPortal(
    @Param("condominioId", ParseIntPipe) condominioId: number,
  ) {
    return this.financeiroService.obterConfiguracoesPagamentoPortal(
      condominioId,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get("configuracoes-pagamento")
  obterConfiguracoesPagamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
  ) {
    return this.financeiroService.obterConfiguracoesPagamento(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("configuracoes-pagamento")
  atualizarConfiguracoesPagamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Body() dto: UpdateConfiguracoesPagamentoDto,
  ) {
    return this.financeiroService.atualizarConfiguracoesPagamento(
      condominioId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Post("categorias")
  criarCategoria(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Body() dto: CreateCategoriaFinanceiraDto,
  ) {
    return this.financeiroService.criarCategoria(condominioId, dto);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get("categorias")
  listarCategorias(@Param("condominioId", ParseIntPipe) condominioId: number) {
    return this.financeiroService.listarCategorias(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("categorias/:categoriaId")
  atualizarCategoria(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("categoriaId", ParseIntPipe) categoriaId: number,
    @Body() dto: UpdateCategoriaFinanceiraDto,
  ) {
    return this.financeiroService.atualizarCategoria(
      condominioId,
      categoriaId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("categorias/:categoriaId/desativar")
  desativarCategoria(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("categoriaId", ParseIntPipe) categoriaId: number,
  ) {
    return this.financeiroService.desativarCategoria(condominioId, categoriaId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("categorias/:categoriaId/ativar")
  ativarCategoria(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("categoriaId", ParseIntPipe) categoriaId: number,
  ) {
    return this.financeiroService.ativarCategoria(condominioId, categoriaId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Post("lancamentos")
  criarLancamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Body() dto: CreateLancamentoFinanceiroDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.financeiroService.criarLancamento(condominioId, dto, usuario);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get("historico")
  listarHistoricoFinanceiro(
    @Param("condominioId", ParseIntPipe) condominioId: number,
  ) {
    return this.financeiroService.listarHistoricoFinanceiro(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get("lancamentos")
  listarLancamentos(@Param("condominioId", ParseIntPipe) condominioId: number) {
    return this.financeiroService.listarLancamentos(condominioId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get("lancamentos/:lancamentoId")
  buscarLancamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("lancamentoId", ParseIntPipe) lancamentoId: number,
  ) {
    return this.financeiroService.buscarLancamento(condominioId, lancamentoId);
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("lancamentos/:lancamentoId")
  atualizarLancamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("lancamentoId", ParseIntPipe) lancamentoId: number,
    @Body() dto: UpdateLancamentoFinanceiroDto,
  ) {
    return this.financeiroService.atualizarLancamento(
      condominioId,
      lancamentoId,
      dto,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("lancamentos/:lancamentoId/pagar")
  pagarLancamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("lancamentoId", ParseIntPipe) lancamentoId: number,
    @Body() dto: PagarLancamentoFinanceiroDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.financeiroService.pagarLancamento(
      condominioId,
      lancamentoId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("lancamentos/:lancamentoId/estornar-pagamento")
  estornarPagamentoLancamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("lancamentoId", ParseIntPipe) lancamentoId: number,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.financeiroService.estornarPagamentoLancamento(
      condominioId,
      lancamentoId,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Patch("lancamentos/:lancamentoId/cancelar")
  cancelarLancamento(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Param("lancamentoId", ParseIntPipe) lancamentoId: number,
    @Body() dto: CancelarLancamentoFinanceiroDto,
    @UsuarioAtual() usuario: AuthenticatedUser,
  ) {
    return this.financeiroService.cancelarLancamento(
      condominioId,
      lancamentoId,
      dto,
      usuario,
    );
  }

  @PapeisCondominio(
    PapelCondominio.ADMINISTRADOR,
    PapelCondominio.SINDICO,
    PapelCondominio.FINANCEIRO,
  )
  @Get("resumo")
  resumoPorPeriodo(
    @Param("condominioId", ParseIntPipe) condominioId: number,
    @Query("inicio") inicio: string,
    @Query("fim") fim: string,
  ) {
    return this.financeiroService.resumoPorPeriodo(condominioId, inicio, fim);
  }
}
