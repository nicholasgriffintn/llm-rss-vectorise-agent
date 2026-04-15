import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const item = sqliteTable('item', {
  id: text('id')
    .primaryKey()
    .notNull()
    .default(sql`uuid()`),
  createdAt: integer('createdAt', {
    mode: 'timestamp',
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', {
    mode: 'timestamp',
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  status: text('status'),
  text: text('text'),
  metadata: text('metadata'),
  notes: text('notes'),
});

export const rssFeed = sqliteTable('rss_feed', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('createdAt', {
    mode: 'timestamp',
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updatedAt', {
    mode: 'timestamp',
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
