import {
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// What Peal keeps because the law says so (loi n° 2004-575, art. 6, V, A,
// and décret n° 2021-1362), in a Postgres schema of its own that only the
// legal context's adapter reads: the app's other code never queries it,
// exports never include its closed accounts, and staff read it only through
// a legal request, which is itself recorded. Ids without foreign keys, so a
// record outlives its account. Instants are timestamptz written from the
// Clock (never NOW()), so tests control them.
export const legalSchema = pgSchema("legal");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Who held each closed account: kept 5 years after it closed, the name and
 * addresses; 1 year, how it signed in (each provider's account id, never a
 * password or what checks one) and the Stripe customers that find its
 * payments, which the daily purge then empties.
 */
export const identificationHolds = legalSchema.table(
  "identification_holds",
  {
    accountCreatedAt: instant("account_created_at").notNull(),
    closedAt: instant("closed_at").notNull(),
    email: text("email").notNull(),
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    signInMethods: jsonb("sign_in_methods")
      .$type<readonly { accountId: string; provider: string }[]>()
      .notNull()
      .default([]),
    stripeCustomerIds: jsonb("stripe_customer_ids")
      .$type<readonly string[]>()
      .notNull()
      .default([]),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("identification_holds_closed_at").on(table.closedAt),
    index("identification_holds_user").on(table.userId),
  ]
);

/**
 * Each connection that created, changed or deleted content: when, from
 * which address, over which protocol and how it authenticated, by whom
 * (the account, or the staff member acting as it; the API key) and in which
 * workspace. Never what it carried. Kept 1 year, account closed or not.
 */
export const connections = legalSchema.table(
  "connections",
  {
    access: text("access").notNull(),
    apiKeyId: text("api_key_id"),
    at: instant("at").notNull(),
    id: uuid("id").primaryKey(),
    ipAddress: text("ip_address"),
    protocol: text("protocol").notNull(),
    userId: uuid("user_id"),
    workspaceId: uuid("workspace_id"),
  },
  (table) => [
    index("connections_at").on(table.at),
    index("connections_user").on(table.userId, table.at),
    index("connections_workspace").on(table.workspaceId, table.at),
  ]
);

/**
 * Each legal request staff answered: who answered, when, the authority and
 * its reference, what it asked about (`subject`: an email, an account or a
 * workspace) and how many records it got. Kept 5 years.
 */
export const disclosures = legalSchema.table(
  "disclosures",
  {
    at: instant("at").notNull(),
    authority: text("authority").notNull(),
    connections: integer("connections").notNull(),
    held: integer("held").notNull(),
    id: uuid("id").primaryKey(),
    reference: text("reference").notNull(),
    staffId: uuid("staff_id").notNull(),
    subject: jsonb("subject")
      .$type<Readonly<Record<string, string>>>()
      .notNull(),
  },
  (table) => [index("disclosures_at").on(table.at)]
);
