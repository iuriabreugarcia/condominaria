import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SuperAdminGuard } from '../guards/super-admin.guard';

export function SomenteSuperAdmin() {
  return applyDecorators(UseGuards(JwtAuthGuard, SuperAdminGuard));
}
