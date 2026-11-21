import { Module } from '@nestjs/common';
import { GaragensController } from './garagens.controller';
import { GaragensService } from './garagens.service';

@Module({
  controllers: [GaragensController],
  providers: [GaragensService],
})
export class GaragensModule {}
