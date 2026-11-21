import { Module } from '@nestjs/common';
import {
  VotacoesAssembleiaController,
  VotacoesAssembleiaResumoController,
} from './votacoes-assembleia.controller';
import { VotacoesAssembleiaService } from './votacoes-assembleia.service';

@Module({
  controllers: [VotacoesAssembleiaController, VotacoesAssembleiaResumoController],
  providers: [VotacoesAssembleiaService],
})
export class VotacoesAssembleiaModule {}
