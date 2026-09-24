import { Module } from '@nestjs/common';
import { AccessModule } from './access/access.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './core/config/config.module.js';
import { DatabaseModule } from './core/database/database.module.js';
import { ErrorsModule } from './core/errors/errors.module.js';
import { LoggingModule } from './core/logging/logging.module.js';
import { RequestContextModule } from './core/request-context/request-context.module.js';
import { ValidationModule } from './core/validation/validation.module.js';
import { HealthModule } from './health/health.module.js';
import { TenantsModule } from './tenants/tenants.module.js';
import { UsersModule } from './users/users.module.js';

/**
 * The table of contents of the API: it only imports modules.
 * `core/*` is infrastructure every request goes through; features follow.
 */
@Module({
  imports: [
    // Infrastructure
    AppConfigModule,
    RequestContextModule,
    LoggingModule,
    ErrorsModule,
    ValidationModule,
    DatabaseModule,
    // Features
    HealthModule,
    AuthModule,
    AccessModule,
    UsersModule,
    TenantsModule,
  ],
})
export class AppModule {}
