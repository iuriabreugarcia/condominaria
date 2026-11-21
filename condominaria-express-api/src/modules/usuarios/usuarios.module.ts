import { Module } from '@nestjs/common';
import {
  UsuariosCondominioController,
  UsuariosController,
} from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController, UsuariosCondominioController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
