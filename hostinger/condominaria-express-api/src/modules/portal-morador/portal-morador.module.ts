import { Module } from '@nestjs/common';
import { PortalMoradorController } from './portal-morador.controller';
import { PortalMoradorService } from './portal-morador.service';

@Module({
  controllers: [PortalMoradorController],
  providers: [PortalMoradorService],
})
export class PortalMoradorModule {}
