import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// The channels context's tables, in their own Postgres schema. Instants are
// timestamptz written from the Clock (never NOW()), so tests control them.
export const channelsSchema = pgSchema("channels");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * One row per account connected to a workspace, with its tokens.
 *
 * - `status` is the Channel status's tag. `refresh_needed` says whether the
 *   token stopped working: always for `refreshNeeded`, never for `active`,
 *   and either way for `disabled`, which remembers it.
 * - `token_kind` is the token lifetime's tag: `nonExpiring` has no expiry,
 *   `refreshable` an expiry, and `nonRefreshable` an expiry and the time it
 *   was issued.
 * - `access_token` and `refresh_token` are stored as the TokenCipher wrote
 *   them, `<keyId>.<iv>.<ciphertext>`, both with the key `token_key_id`
 *   names, so a rotation can find the rows an older key encrypted.
 * - The platform is not checked here, so adding one needs no migration: the
 *   repository decodes every row with the domain's schema.
 */
export const channels = channelsSchema.table(
  "channels",
  {
    accessToken: text("access_token").notNull(),
    accountId: text("account_id").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: instant("created_at").notNull(),
    displayName: text("display_name"),
    handle: text("handle").notNull(),
    id: uuid("id").primaryKey(),
    platform: text("platform").notNull(),
    refreshNeeded: boolean("refresh_needed").notNull(),
    refreshToken: text("refresh_token"),
    scopes: text("scopes").array().notNull(),
    status: text("status").notNull(),
    tokenExpiresAt: instant("token_expires_at"),
    tokenIssuedAt: instant("token_issued_at"),
    tokenKeyId: text("token_key_id").notNull(),
    tokenKind: text("token_kind").notNull(),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // Also the index for a workspace's channels, which it leads with.
    unique("channels_workspace_platform_account").on(
      table.workspaceId,
      table.platform,
      table.accountId
    ),
    check(
      "channels_status",
      sql`${table.status} IN ('active', 'refreshNeeded', 'disabled')`
    ),
    check(
      "channels_refresh_needed",
      sql`(${table.status} <> 'active' OR NOT ${table.refreshNeeded}) AND (${table.status} <> 'refreshNeeded' OR ${table.refreshNeeded})`
    ),
    check(
      "channels_token_lifetime",
      sql`CASE ${table.tokenKind} WHEN 'nonExpiring' THEN ${table.tokenExpiresAt} IS NULL AND ${table.tokenIssuedAt} IS NULL WHEN 'refreshable' THEN ${table.tokenExpiresAt} IS NOT NULL AND ${table.tokenIssuedAt} IS NULL WHEN 'nonRefreshable' THEN ${table.tokenExpiresAt} IS NOT NULL AND ${table.tokenIssuedAt} IS NOT NULL ELSE FALSE END`
    ),
    check(
      "channels_token_key",
      sql`split_part(${table.accessToken}, '.', 1) = ${table.tokenKeyId} AND (${table.refreshToken} IS NULL OR split_part(${table.refreshToken}, '.', 1) = ${table.tokenKeyId})`
    ),
  ]
);
