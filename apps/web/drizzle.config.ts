import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './app/drizzle/schema.ts',
} satisfies Config;
