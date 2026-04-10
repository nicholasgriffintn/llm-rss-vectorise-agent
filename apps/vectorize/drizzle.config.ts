import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './src/drizzle/schema.ts',
  out: './migrations',
} satisfies Config;
