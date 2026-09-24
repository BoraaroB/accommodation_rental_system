// Entry point of `npm run db:seed` (`prisma db seed`): reads the CSV, maps and
// validates every row, then loads it into the database. The API itself never
// reads the CSV. dotenv loads `.env` and never overrides a variable that is
// already set, so Docker can pass everything through the environment.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';
import {
  mapRows,
  parseBookingRow,
  parseCsv,
  parseListingRow,
} from './mappers.js';
import { seed } from './seed.js';
import { seedEnvSchema } from './seed-env.js';

const logger = new Logger('Seed');

async function readCsv(dir: string, file: string) {
  return parseCsv(await readFile(resolve(dir, file), 'utf8'));
}

/**
 * What is logged when the seed fails. A Prisma validation error prints the
 * query's arguments (password hashes), so only its name is logged (D-039).
 */
function describeFailure(error: unknown): string {
  if (error instanceof Prisma.PrismaClientValidationError) {
    return `${error.name}: invalid query arguments (not logged)`;
  }
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  const env = seedEnvSchema.safeParse(process.env);
  if (!env.success) {
    throw new Error(`Invalid seed environment:\n${z.prettifyError(env.error)}`);
  }
  const { DATABASE_URL, SEED_DATA_DIR, SEED_DEMO_PASSWORD } = env.data;

  const listings = mapRows(
    'listings.csv',
    await readCsv(SEED_DATA_DIR, 'listings.csv'),
    parseListingRow,
  );
  const bookings = mapRows(
    'bookings.csv',
    await readCsv(SEED_DATA_DIR, 'bookings.csv'),
    parseBookingRow,
  );
  logger.log(
    `Read ${listings.length} listings and ${bookings.length} bookings`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
    errorFormat: 'minimal',
  });
  try {
    const inserted = await seed(prisma, {
      listings,
      bookings,
      password: SEED_DEMO_PASSWORD,
    });
    logger.log(
      `Inserted ${inserted.tenants} tenants, ${inserted.users} users, ` +
        `${inserted.memberships} host memberships, ${inserted.listings} listings ` +
        `and ${inserted.bookings} bookings (existing rows are skipped)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logger.fatal(`Seed failed: ${describeFailure(error)}`);
  process.exitCode = 1;
});
