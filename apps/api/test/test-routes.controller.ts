import {
  Body,
  ConflictException,
  Controller,
  Get,
  Logger,
  Post,
} from '@nestjs/common';

/**
 * Routes that exist only in the e2e tests (`/api/v1/test-routes/...`). They
 * exercise what the real modules cannot trigger on purpose: a versioned route
 * before any feature module exists, a domain error code, an unexpected crash,
 * body-parser errors and a log line written inside a handler.
 */
@Controller('test-routes')
export class TestRoutesController {
  @Get()
  ok(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictException('2026-10-02 is booked', {
      errorCode: 'DAY_ALREADY_BOOKED',
    });
  }

  @Post('echo')
  echo(@Body() body: unknown): unknown {
    return body;
  }

  @Get('log')
  log(): { logged: true } {
    new Logger(TestRoutesController.name).log('test log line');
    return { logged: true };
  }

  @Get('crash')
  crash(): never {
    throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
  }
}
