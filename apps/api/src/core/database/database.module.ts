import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Database access: the Prisma client. Modules with a Prisma repository import
 * this module to inject `PrismaService`.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
