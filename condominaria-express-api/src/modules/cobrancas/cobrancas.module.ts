import { Module } from '@nestjs/common';
import { CobrancasController, PortalMoradorCobrancasController } from './cobrancas.controller';
import { CobrancasService } from './cobrancas.service';

@Module({
  controllers: [CobrancasController, PortalMoradorCobrancasController],
  providers: [CobrancasService],
})
export class CobrancasModule {}
