import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

/** Liveness check for Docker and load balancers: `GET /api/health`, unversioned. */
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
