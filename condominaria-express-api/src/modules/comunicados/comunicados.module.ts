import { Module } from '@nestjs/common';
import { ComunicadosController, PortalMoradorComunicadosController } from './comunicados.controller';
import { ComunicadosService } from './comunicados.service';

@Module({
  controllers: [ComunicadosController, PortalMoradorComunicadosController],
  providers: [ComunicadosService],
})
export class ComunicadosModule {}
