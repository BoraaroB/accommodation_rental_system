// Prisma CLI configuration (migrate, generate). The CLI does not read `.env`
// itself: dotenv loads it here, and never overrides a variable that is already
// set, so the e2e setup can point `DATABASE_URL` at the test database.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // `npm run db:seed`; Prisma 7 never seeds on its own. tsx runs the
    // TypeScript directly: Node does not resolve the `.js` import specifiers
    // to `.ts` files.
    seed: 'tsx prisma/seed/main.ts',
  },
  // Read with `process.env`, not Prisma's `env()`, which throws when the
  // variable is missing: `prisma generate` is a build step and needs no
  // database. Commands that connect (`migrate`) still fail without the URL,
  // and the API itself validates it at startup.
  datasource: { url: process.env.DATABASE_URL },
});
