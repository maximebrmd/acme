import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// The workspace context's own tables, in their own Postgres schema, beside
// the sign-in service's (`auth`, in auth-schema.generated.ts): the partner
// accounts and what they own. Instants are timestamptz written from the
// Clock (never NOW()), so tests control them. Workspaces are referred to by
// id alone, as the other contexts do: the sign-in service's tables are
// generated, and deleting a workspace deletes these rows itself.
export const workspaceSchema = pgSchema("workspace");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * What a workspace requires of its members: `two_step_required`, that every
 * member's account has two-step verification on. No row requires nothing.
 * Who changed it is in the workspace's activity log.
 */
export const securityPolicies = workspaceSchema.table("security_policies", {
  twoStepRequired: boolean("two_step_required").notNull().default(false),
  updatedAt: instant("updated_at").notNull(),
  workspaceId: uuid("workspace_id").primaryKey(),
});

/**
 * One row per partner account, which belongs to its home workspace.
 *
 * - `name` and `logo_url` are what its customers see on the hosted pages.
 * - `return_origins` are the origins those pages may send a customer back
 *   to, as browsers write them (`https://app.example.com`).
 */
export const partners = workspaceSchema.table(
  "partners",
  {
    createdAt: instant("created_at").notNull(),
    id: uuid("id").primaryKey(),
    logoUrl: text("logo_url"),
    name: text("name").notNull(),
    returnOrigins: text("return_origins").array().notNull(),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [unique("partners_workspace").on(table.workspaceId)]
);

/**
 * One row per partner key: its SHA-256 in hexadecimal, never the key.
 *
 * - `start` is its first characters, prefix included, to tell keys apart.
 * - `scopes` and `permissions` are not checked here, so adding one needs
 *   no migration: the store decodes every row with the domain's schema.
 * - `created_by` is the member who created it, null once their account is
 *   closed.
 */
export const partnerKeys = workspaceSchema.table(
  "partner_keys",
  {
    createdAt: instant("created_at").notNull(),
    createdBy: uuid("created_by"),
    expiresAt: instant("expires_at"),
    id: uuid("id").primaryKey(),
    keyDigest: text("key_digest").notNull(),
    name: text("name").notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    permissions: text("permissions").array().notNull(),
    scopes: text("scopes").array().notNull(),
    start: text("start").notNull(),
  },
  (table) => [
    unique("partner_keys_digest").on(table.keyDigest),
    // A partner's keys, oldest first: ids are UUIDv7s.
    index("partner_keys_partner").on(table.partnerId, table.id),
    index("partner_keys_created_by").on(table.createdBy),
  ]
);

/**
 * One row per workspace a partner owns: one of its customers.
 * `external_id` is the partner's own id for that customer, unique among
 * the partner's workspaces when it gave one.
 */
export const partnerWorkspaces = workspaceSchema.table(
  "partner_workspaces",
  {
    createdAt: instant("created_at").notNull(),
    externalId: text("external_id"),
    // No cascade: a partner is deleted only once it owns no workspace.
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id),
    workspaceId: uuid("workspace_id").primaryKey(),
  },
  (table) => [
    // Nulls are distinct, so workspaces without an external id never clash.
    unique("partner_workspaces_external_id").on(
      table.partnerId,
      table.externalId
    ),
    // A partner's workspaces, newest first.
    index("partner_workspaces_partner").on(table.partnerId, table.createdAt),
  ]
);

/**
 * The idempotency keys of the requests that created workspaces, by
 * partner: the SHA-256 of the key and of the request it came with, never
 * the key, which the partner chose, nor what the request said.
 */
export const partnerIdempotencyKeys = workspaceSchema.table(
  "partner_idempotency_keys",
  {
    createdAt: instant("created_at").notNull(),
    keyDigest: text("key_digest").notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    requestDigest: text("request_digest").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.partnerId, table.keyDigest] }),
    // The retention's scan.
    index("partner_idempotency_keys_created").on(table.createdAt),
  ]
);

/**
 * What each partner held at the end of each day (UTC): the workspaces it
 * owned and the channels connected in them. Counts only, for a price by
 * the workspace or by the connected channel. Rows are kept 400 days
 * (`partnerUsageRetentionDays`), the `day` index serving the daily purge.
 */
export const partnerUsageDays = workspaceSchema.table(
  "partner_usage_days",
  {
    channels: integer("channels").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    partnerId: uuid("partner_id")
      .notNull()
      .references(() => partners.id, { onDelete: "cascade" }),
    workspaces: integer("workspaces").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.partnerId, table.day] }),
    // The daily purge of the days past `partnerUsageRetentionDays`.
    index("partner_usage_days_day").on(table.day),
    check(
      "partner_usage_days_counts",
      sql`${table.channels} >= 0 AND ${table.workspaces} >= 0`
    ),
  ]
);
