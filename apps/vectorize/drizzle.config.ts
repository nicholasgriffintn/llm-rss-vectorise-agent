import type { Config } from 'drizzle-kit';

export default {
  driver: 'd1',
  schema: './src/drizzle/schema.ts',
  out: './migrations',
} satisfies Config;
