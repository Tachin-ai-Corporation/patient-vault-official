import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const productionRegistrations = pgTable('production_registrations', {
  stagingUserId: text('staging_user_id').primaryKey(),
  productionUserId: text('production_user_id').notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
