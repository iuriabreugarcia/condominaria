import { Module } from '@nestjs/common';
import { CondominiosController } from './condominios.controller';
import { CondominiosService } from './condominios.service';

@Module({
  controllers: [CondominiosController],
  providers: [CondominiosService],
})
export class CondominiosModule {}
