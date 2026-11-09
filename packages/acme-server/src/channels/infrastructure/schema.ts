import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgSchema,
  primaryKey,
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
    // The token jobs' scan: active channels by expiry, among those whose
    // token expires at all.
    index("channels_token_expiry")
      .on(table.tokenExpiresAt)
      .where(
        sql`${table.status} = 'active' AND ${table.tokenKind} <> 'nonExpiring'`
      ),
    check(
      "channels_token_key",
      sql`split_part(${table.accessToken}, '.', 1) = ${table.tokenKeyId} AND (${table.refreshToken} IS NULL OR split_part(${table.refreshToken}, '.', 1) = ${table.tokenKeyId})`
    ),
  ]
);

/**
 * Sign-ins in progress, from the start of a connection to its callback, for
 * at most `expires_at`.
 *
 * - `state_hash` is the SHA-256, in hex, of the state the platform hands back
 *   to the callback: the state itself is not stored, so this table holds
 *   nothing a callback could be forged from.
 * - `started_by` and `workspace_id` bind the attempt to whoever started it
 *   (`user:<id>` or `apiKey:<id>`), which the callback must match.
 * - `secret` is what completing needs (a PKCE verifier, or the OAuth client's
 *   own pending state), encrypted by the TokenCipher for `connect:<state>`.
 * - `channel_id` is the channel being reconnected, if any.
 */
export const connectAttempts = channelsSchema.table(
  "connect_attempts",
  {
    channelId: uuid("channel_id"),
    createdAt: instant("created_at").notNull(),
    expiresAt: instant("expires_at").notNull(),
    instance: text("instance"),
    platform: text("platform").notNull(),
    secret: text("secret").notNull(),
    startedBy: text("started_by").notNull(),
    stateHash: text("state_hash").primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [index("connect_attempts_expires_at").on(table.expiresAt)]
);

/**
 * Acme's app on each Mastodon instance, registered with the instance the
 * first time someone connects an account there, for one redirect URI. A
 * server whose public URL changes registers again.
 *
 * `client_secret` is encrypted by the TokenCipher for `app:<instance>`;
 * `scopes` are those the app was registered with, space-separated.
 */
export const mastodonApps = channelsSchema.table(
  "mastodon_apps",
  {
    clientId: text("client_id").notNull(),
    clientSecret: text("client_secret").notNull(),
    createdAt: instant("created_at").notNull(),
    instance: text("instance").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    scopes: text("scopes").notNull(),
  },
  (table) => [primaryKey({ columns: [table.instance, table.redirectUri] })]
);
