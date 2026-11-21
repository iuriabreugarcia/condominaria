import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{
    status: string;
    service: string;
    database: string;
    timestamp: string;
  }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'condominaria-express-api',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'condominaria-express-api',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
