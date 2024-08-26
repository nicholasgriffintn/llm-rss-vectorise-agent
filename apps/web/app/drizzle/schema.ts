import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const item = sqliteTable('item', {
  id: text('id')
    .primaryKey()
    .notNull()
    .default(sql`uuid()`),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  status: text('status'),
  text: text('text'),
  metadata: text('metadata'),
});
