import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

/** Liveness check: `GET /api/health`. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
