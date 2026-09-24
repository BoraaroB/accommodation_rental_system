import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envFilePathFor } from './env-file.js';
import { envSchema } from './env.schema.js';

/**
 * Loads the env file and validates the environment with `envSchema` at
 * startup; an invalid or missing variable stops the app. `ConfigService` is
 * global (`isGlobal`) and returns the parsed values.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePathFor(process.env.NODE_ENV),
      validationSchema: envSchema,
    }),
  ],
})
export class AppConfigModule {}
