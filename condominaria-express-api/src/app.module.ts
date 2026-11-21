import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AreasComunsModule } from './modules/areas-comuns/areas-comuns.module';
import { AssembleiasModule } from './modules/assembleias/assembleias.module';
import { AuthModule } from './modules/auth/auth.module';
import { BlocosModule } from './modules/blocos/blocos.module';
import { CobrancasModule } from './modules/cobrancas/cobrancas.module';
import { ComunicadosModule } from './modules/comunicados/comunicados.module';
import { CondominiosModule } from './modules/condominios/condominios.module';
import { EncomendasModule } from './modules/encomendas/encomendas.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { GaragensModule } from './modules/garagens/garagens.module';
import { HealthModule } from './modules/health/health.module';
import { MoradoresModule } from './modules/moradores/moradores.module';
import { OcorrenciasModule } from './modules/ocorrencias/ocorrencias.module';
import { OrdensServicoModule } from './modules/ordens-servico/ordens-servico.module';
import { PortalMoradorModule } from './modules/portal-morador/portal-morador.module';
import { PortariaModule } from './modules/portaria/portaria.module';
import { PrestadoresModule } from './modules/prestadores/prestadores.module';
import { ReservasModule } from './modules/reservas/reservas.module';
import { UnidadesModule } from './modules/unidades/unidades.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { VeiculosModule } from './modules/veiculos/veiculos.module';
import { VotacoesAssembleiaModule } from './modules/votacoes-assembleia/votacoes-assembleia.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    CondominiosModule,
    UsuariosModule,
    AuthModule,
    BlocosModule,
    UnidadesModule,
    MoradoresModule,
    PortariaModule,
    OcorrenciasModule,
    ComunicadosModule,
    AreasComunsModule,
    ReservasModule,
    FinanceiroModule,
    CobrancasModule,
    GaragensModule,
    VeiculosModule,
    EncomendasModule,
    PrestadoresModule,
    OrdensServicoModule,
    AssembleiasModule,
    VotacoesAssembleiaModule,
    PortalMoradorModule,
  ],
})
export class AppModule {}
