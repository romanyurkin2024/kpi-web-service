import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IntegrationHealthService } from './integration-health.service';

@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class IntegrationsController {
  constructor(private readonly healthService: IntegrationHealthService) {}

  @Get('health')
  getHealth() {
    return this.healthService.getSystemHealth();
  }
}
