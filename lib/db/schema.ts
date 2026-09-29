import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const onehealthApplications = pgTable(
  'onehealth_applications',
  {
    userId: text('user_id').notNull(),
    environment: text('environment').notNull(),
    applicationId: integer('application_id').notNull(),
    applicationName: text('application_name').notNull(),
    applicationUrl: text('application_url').notNull().default(''),
    description: text('description'),
    state: text('state'),
    iconUrl: text('icon_url'),
    launchSecretMasked: text('launch_secret_masked'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.environment] })],
)
