import { pgTable, text, jsonb, integer } from 'drizzle-orm/pg-core';
export const documents = pgTable('list_documents', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  version: integer().notNull().default(1),
});
