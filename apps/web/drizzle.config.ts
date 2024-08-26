import type { Config } from 'drizzle-kit';

export default {
  driver: 'd1',
  schema: './app/drizzle/schema.ts',
} satisfies Config;
