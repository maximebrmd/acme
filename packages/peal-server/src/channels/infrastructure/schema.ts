import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
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
 * - `granted_by` is the platform user the tokens rest on, when that is not
 *   the account itself: the Facebook user who connected a Page, or the
 *   Instagram account linked to one, or, through Instagram Login, the
 *   app-scoped id of the professional account's user. Meta's data deletion
 *   and deauthorization requests name that user.
 * - `connection` is how an Instagram channel reaches its account
 *   (`instagramLogin` or `facebookLogin`); null on other platforms, and on
 *   Instagram channels connected before Instagram Login, which came through
 *   Facebook Login. The repository reads null so.
 * - The platform is not checked here, so adding one needs no migration: the
 *   repository decodes every row with the domain's schema.
 */
export const channels = channelsSchema.table(
  "channels",
  {
    accessToken: text("access_token").notNull(),
    accountId: text("account_id").notNull(),
    avatarUrl: text("avatar_url"),
    connection: text("connection"),
    createdAt: instant("created_at").notNull(),
    displayName: text("display_name"),
    grantedBy: text("granted_by"),
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
    // Meta's data deletion requests: the channels a user's grant holds up.
    index("channels_granted_by")
      .on(table.grantedBy)
      .where(sql`${table.grantedBy} IS NOT NULL`),
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
 * - `connection` is the way in an Instagram sign-in takes, as on `channels`.
 */
export const connectAttempts = channelsSchema.table(
  "connect_attempts",
  {
    channelId: uuid("channel_id"),
    connection: text("connection"),
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
 * Accounts a sign-in reached, waiting for the member to choose those to
 * connect, for at most `expires_at`: the Pages a Facebook user manages, or
 * the Instagram accounts linked to them.
 *
 * - `selection_hash` is the SHA-256, in hex, of the selection the member's
 *   browser holds, which is not stored.
 * - `started_by` and `workspace_id` bind it to the member, as attempts are.
 * - `accounts` are the accounts with their tokens, as JSON encrypted by the
 *   TokenCipher for `choice:<selection>`.
 * - `granted_by` is the platform user those tokens rest on, as on
 *   `channels`: the Facebook user who signed in. Meta's data deletion
 *   requests name that user.
 * - `connection` is the way in the sign-in took, as on `channels`.
 */
export const connectChoices = channelsSchema.table(
  "connect_choices",
  {
    accounts: text("accounts").notNull(),
    connection: text("connection"),
    createdAt: instant("created_at").notNull(),
    expiresAt: instant("expires_at").notNull(),
    grantedBy: text("granted_by"),
    platform: text("platform").notNull(),
    selectionHash: text("selection_hash").primaryKey(),
    startedBy: text("started_by").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("connect_choices_expires_at").on(table.expiresAt),
    // Meta's data deletion requests: the choices a user's sign-in offers.
    index("connect_choices_granted_by")
      .on(table.grantedBy)
      .where(sql`${table.grantedBy} IS NOT NULL`),
  ]
);

/**
 * The data deletion requests Meta sent on behalf of its users, so the status
 * page Meta links to can answer. Nothing names the user: only the app the
 * request came through (`facebook`, `instagram` or `threads`), when it came and was done,
 * and how many channels it deleted. `code` is the confirmation code Meta
 * shows the user.
 *
 * `request_digest` is the SHA-256, in hex, of the signed request as Meta
 * sent it, which only the app's secret could have made: the same request
 * sent again finds its row, and deletes nothing more.
 */
export const dataDeletions = channelsSchema.table(
  "data_deletions",
  {
    app: text("app").notNull(),
    channelsDeleted: integer("channels_deleted").notNull(),
    code: text("code").primaryKey(),
    completedAt: instant("completed_at").notNull(),
    requestDigest: text("request_digest").notNull(),
    requestedAt: instant("requested_at").notNull(),
  },
  (table) => [unique("data_deletions_request_digest").on(table.requestDigest)]
);

/**
 * Peal's app on each Mastodon instance, registered with the instance the
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

/**
 * The links workspaces hand to whoever owns a social account, to connect
 * it on a hosted page without a Peal account.
 *
 * - `token_digest` is the SHA-256, in hex, of the token in the link's
 *   address, which is not stored: whoever reads this table opens no link.
 * - `browser_digest` is the SHA-256 of the nonce the browser that last
 *   started the link's sign-in keeps in a cookie; null before a start, and
 *   once the link is over.
 * - `status` is `pending`, `completed` (with `channel_ids`, what it
 *   connected) or `revoked`, since `ended_at`. A pending link past
 *   `expires_at` is expired.
 * - `created_by` names who created it, as attempts name their starter
 *   (`user:<id>`, `apiKey:<id>`); null once that member's account closed.
 * - `failure_reason` and `failed_at` say how its last sign-in failed.
 * - `return_url` is where its page sends people back: an address on an
 *   origin the workspace's partner registered.
 */
export const connectLinks = channelsSchema.table(
  "connect_links",
  {
    browserDigest: text("browser_digest"),
    channelId: uuid("channel_id"),
    channelIds: uuid("channel_ids").array().notNull(),
    connection: text("connection"),
    createdAt: instant("created_at").notNull(),
    createdBy: text("created_by"),
    endedAt: instant("ended_at"),
    expiresAt: instant("expires_at").notNull(),
    failedAt: instant("failed_at"),
    failureReason: text("failure_reason"),
    id: uuid("id").primaryKey(),
    locale: text("locale"),
    platform: text("platform").notNull(),
    returnUrl: text("return_url"),
    starts: integer("starts").notNull(),
    status: text("status").notNull(),
    tokenDigest: text("token_digest").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("connect_links_token").on(table.tokenDigest),
    // A workspace's links, newest first: ids are UUIDv7s.
    index("connect_links_workspace").on(table.workspaceId, table.id),
    // The retention's scan.
    index("connect_links_expires_at").on(table.expiresAt),
    index("connect_links_created_by")
      .on(table.createdBy)
      .where(sql`${table.createdBy} IS NOT NULL`),
    check(
      "connect_links_status",
      sql`${table.status} IN ('pending', 'completed', 'revoked')`
    ),
    check(
      "connect_links_ended",
      sql`(${table.status} = 'pending') = (${table.endedAt} IS NULL)`
    ),
    check("connect_links_starts", sql`${table.starts} >= 0`),
  ]
);
