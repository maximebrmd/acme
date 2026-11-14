import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// The ads context's tables, in their own Postgres schema. Instants are
// timestamptz written from the Clock (never NOW()), so tests control them.
// Money is bigint minor units of the account's currency, never a float.
export const adsSchema = pgSchema("ads");

const instant = (name: string) => timestamp(name, { withTimezone: true });

const money = (name: string) => bigint(name, { mode: "number" });

/**
 * One row per sign-in of a person to an ad network for a workspace.
 *
 * - `token` is the person's access token as the TokenCipher wrote it,
 *   `<keyId>.<iv>.<ciphertext>`, bound to `ads:<id>`; `token_key_id` names
 *   the key, so a rotation finds the rows an older one encrypted.
 * - `platform_user_id` is the person's id at the network: the network's
 *   data deletion requests name it.
 * - `granted_by` is the member who signed in, null once their account is
 *   closed.
 */
export const grants = adsSchema.table(
  "grants",
  {
    access: text("access").notNull(),
    createdAt: instant("created_at").notNull(),
    expiresAt: instant("expires_at"),
    grantedBy: uuid("granted_by"),
    id: uuid("id").primaryKey(),
    network: text("network").notNull(),
    platformUserId: text("platform_user_id").notNull(),
    scopes: text("scopes").array().notNull(),
    token: text("token").notNull(),
    tokenKeyId: text("token_key_id").notNull(),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("grants_person").on(
      table.workspaceId,
      table.network,
      table.platformUserId
    ),
    index("grants_platform_user").on(table.network, table.platformUserId),
    index("grants_granted_by").on(table.grantedBy),
    check(
      "grants_access",
      sql`${table.access} IN ('working', 'reconnectNeeded')`
    ),
  ]
);

/**
 * Sign-ins in progress, under the SHA-256 of the state the network sends
 * back, for 15 minutes, taken once.
 */
export const signInAttempts = adsSchema.table(
  "sign_in_attempts",
  {
    expiresAt: instant("expires_at").notNull(),
    network: text("network").notNull(),
    startedBy: uuid("started_by").notNull(),
    stateHash: text("state_hash").primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("sign_in_attempts_expiry").on(table.expiresAt),
    index("sign_in_attempts_workspace").on(table.workspaceId),
    index("sign_in_attempts_started_by").on(table.startedBy),
  ]
);

/**
 * One row per ad account connected to a workspace.
 *
 * - `spending_enabled`, `monthly_ceiling`, `authorized_by` and
 *   `authorized_at` are the owner's decision that it may spend through
 *   Peal, and how much a month: off until an owner says otherwise.
 * - `spend_cap` and `amount_spent` are the account's own cap at its
 *   network and what it spent against it, as last read.
 * - `next_sync_at` is when its campaigns and numbers are next read.
 */
export const accounts = adsSchema.table(
  "accounts",
  {
    amountSpent: money("amount_spent"),
    authorizedAt: instant("authorized_at"),
    authorizedBy: uuid("authorized_by"),
    connectedAt: instant("connected_at").notNull(),
    connectedBy: uuid("connected_by"),
    currency: text("currency").notNull(),
    externalId: text("external_id").notNull(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => grants.id, { onDelete: "cascade" }),
    id: uuid("id").primaryKey(),
    monthlyCeiling: money("monthly_ceiling"),
    name: text("name").notNull(),
    network: text("network").notNull(),
    nextSyncAt: instant("next_sync_at").notNull(),
    spendCap: money("spend_cap"),
    spendingEnabled: boolean("spending_enabled").notNull().default(false),
    status: text("status").notNull(),
    syncedAt: instant("synced_at"),
    timeZone: text("time_zone").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("accounts_external").on(
      table.workspaceId,
      table.network,
      table.externalId
    ),
    index("accounts_grant").on(table.grantId),
    // The sync's scan: what is due, the longest waiting first.
    index("accounts_due").on(table.nextSyncAt, table.id),
    check(
      "accounts_ceiling",
      sql`(${table.spendingEnabled} = false) OR (${table.monthlyCeiling} IS NOT NULL AND ${table.monthlyCeiling} > 0)`
    ),
  ]
);

const synced = {
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  rawStatus: text("raw_status").notNull(),
  status: text("status").notNull(),
  syncedAt: instant("synced_at").notNull(),
  workspaceId: uuid("workspace_id").notNull(),
};

const budgeted = {
  dailyBudget: money("daily_budget"),
  endsAt: instant("ends_at"),
  startsAt: instant("starts_at"),
  totalBudget: money("total_budget"),
};

/** The campaigns of connected accounts, as last read from their network. */
export const campaigns = adsSchema.table(
  "campaigns",
  { ...synced, ...budgeted, objective: text("objective").notNull() },
  (table) => [
    primaryKey({ columns: [table.accountId, table.externalId] }),
    index("campaigns_workspace").on(table.workspaceId),
  ]
);

/** Their ad sets. */
export const adSets = adsSchema.table(
  "ad_sets",
  {
    ...synced,
    ...budgeted,
    campaignExternalId: text("campaign_external_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.externalId] }),
    index("ad_sets_campaign").on(table.accountId, table.campaignExternalId),
    index("ad_sets_workspace").on(table.workspaceId),
  ]
);

/**
 * Their ads. `promoted_page_post_id` and `promoted_instagram_media_id` are
 * the platform's ids of the post an ad shows; `target_id` and `post_id`
 * name the workspace's own published post when it is one.
 */
export const ads = adsSchema.table(
  "ads",
  {
    ...synced,
    adSetExternalId: text("ad_set_external_id").notNull(),
    campaignExternalId: text("campaign_external_id").notNull(),
    postId: uuid("post_id"),
    promotedInstagramMediaId: text("promoted_instagram_media_id"),
    promotedPagePostId: text("promoted_page_post_id"),
    targetId: uuid("target_id"),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.externalId] }),
    index("ads_campaign").on(table.accountId, table.campaignExternalId),
    index("ads_post").on(table.workspaceId, table.postId),
    index("ads_workspace").on(table.workspaceId),
  ]
);

/**
 * What one ad did on one day of its account's calendar: counts and money,
 * never who saw it. Kept 13 months (`insightRetention`).
 */
export const insightDays = adsSchema.table(
  "insight_days",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    adExternalId: text("ad_external_id").notNull(),
    clicks: integer("clicks").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    impressions: integer("impressions").notNull(),
    reach: integer("reach").notNull(),
    results: integer("results"),
    spend: money("spend").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.adExternalId, table.day] }),
    index("insight_days_workspace_day").on(table.workspaceId, table.day),
    // The retention's scan.
    index("insight_days_day").on(table.day),
  ]
);

/**
 * One row per boost: what was asked, what it commits against the ceiling,
 * where it stands, and the objects it made at the network.
 *
 * - `committed` is the most it can cost, in minor units; it only goes down.
 * - `requested_by_kind`, `requested_by_id` and `requested_by_client` say
 *   who asked: a user (and the application acting for them) or a key. The
 *   user's id is cleared when their account is closed.
 * - `audience` is the countries and ages asked, as JSON the domain decodes.
 * - `beneficiary` and `payer` are who benefits from the ad and who pays,
 *   which the law has an ad shown in the European Union carry.
 * - `idempotency_key` is the caller's: one boost per key and workspace.
 * - `account_id` names the ad account row it was asked on, with no foreign
 *   key: a boost outlives its account's disconnection, so what the month
 *   committed still counts once the same account is connected again,
 *   which `account_network` and `account_external_id` name.
 */
export const boosts = adsSchema.table(
  "boosts",
  {
    accountExternalId: text("account_external_id").notNull(),
    accountId: uuid("account_id").notNull(),
    accountNetwork: text("account_network").notNull(),
    activatedAt: instant("activated_at"),
    adId: text("ad_id"),
    adSetId: text("ad_set_id"),
    audience: jsonb("audience").notNull(),
    beneficiary: text("beneficiary"),
    budgetAmount: money("budget_amount").notNull(),
    budgetKind: text("budget_kind").notNull(),
    budgetReachedAt: instant("budget_reached_at"),
    campaignId: text("campaign_id"),
    channelId: uuid("channel_id").notNull(),
    committed: money("committed").notNull(),
    createdAt: instant("created_at").notNull(),
    currency: text("currency").notNull(),
    endsAt: instant("ends_at").notNull(),
    failureCode: text("failure_code"),
    failureReason: text("failure_reason"),
    id: uuid("id").primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    objective: text("objective").notNull(),
    payer: text("payer"),
    platform: text("platform").notNull(),
    postId: uuid("post_id").notNull(),
    requestedByClient: text("requested_by_client"),
    requestedById: text("requested_by_id"),
    requestedByKind: text("requested_by_kind"),
    startsAt: instant("starts_at").notNull(),
    state: text("state").notNull(),
    stateAt: instant("state_at").notNull(),
    targetId: uuid("target_id").notNull(),
    updatedAt: instant("updated_at").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("boosts_key").on(table.workspaceId, table.idempotencyKey),
    // A workspace's boosts, newest first: ids are UUIDv7s.
    index("boosts_workspace").on(table.workspaceId, table.id),
    index("boosts_post").on(table.workspaceId, table.postId),
    // What an account's boosts commit, and those to end.
    index("boosts_account").on(table.accountId, table.state),
    // What the same account at the network commits, across reconnections.
    index("boosts_network_account").on(
      table.workspaceId,
      table.accountNetwork,
      table.accountExternalId
    ),
    index("boosts_ending").on(table.endsAt),
    check(
      "boosts_state",
      sql`${table.state} IN ('requested', 'active', 'paused', 'ended', 'stopped', 'failed', 'unconfirmed')`
    ),
    check("boosts_budget_kind", sql`${table.budgetKind} IN ('total', 'daily')`),
    check(
      "boosts_amounts",
      sql`${table.budgetAmount} > 0 AND ${table.committed} >= 0`
    ),
    check("boosts_run", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "boosts_failure",
      sql`(${table.state} = 'failed') = (${table.failureReason} IS NOT NULL)`
    ),
  ]
);

/**
 * The journal: one row per request to the network that changes something,
 * written and committed before the request leaves. A row without an
 * outcome is a request cut short, looked up before anything else is sent.
 * Ids, steps and codes only: never an audience or an amount.
 */
export const spendCalls = adsSchema.table(
  "spend_calls",
  {
    boostId: uuid("boost_id")
      .notNull()
      .references(() => boosts.id, { onDelete: "cascade" }),
    finishedAt: instant("finished_at"),
    id: uuid("id").primaryKey(),
    networkCode: text("network_code"),
    objectId: text("object_id"),
    outcome: text("outcome"),
    startedAt: instant("started_at").notNull(),
    step: text("step").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // A boost's journal, oldest first: ids are UUIDv7s.
    index("spend_calls_boost").on(table.boostId, table.id),
    index("spend_calls_workspace").on(table.workspaceId),
  ]
);

/**
 * The audit trail: every decision about money and every change to a boost,
 * with who made it. `by_kind` and `by_id` name a user or a key, and
 * `by_client` the application acting for a user; the user's id is cleared
 * when their account is closed. `amounts` holds minor units by name. Rows
 * outlive the account and the boost they are about.
 */
export const auditEvents = adsSchema.table(
  "audit_events",
  {
    accountId: uuid("account_id"),
    action: text("action").notNull(),
    amounts: jsonb("amounts").notNull(),
    at: instant("at").notNull(),
    boostId: uuid("boost_id"),
    byClient: text("by_client"),
    byId: text("by_id"),
    byKind: text("by_kind"),
    currency: text("currency"),
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // A workspace's trail, newest first: ids are UUIDv7s.
    index("audit_events_workspace").on(table.workspaceId, table.id),
    index("audit_events_by").on(table.byId),
    // The retention's scan.
    index("audit_events_at").on(table.at),
  ]
);

/**
 * Each ad a sync saw delivering or in review in a calendar month (UTC),
 * by the workspace that connected its account: the managed ads the
 * billing account's meter counts, one each a month, however often it was
 * seen. Ids only. Kept 13 months, as the days of numbers are; erasing the
 * workspace deletes its rows.
 */
export const activeAdMonths = adsSchema.table(
  "active_ad_months",
  {
    adExternalId: text("ad_external_id").notNull(),
    month: date("month", { mode: "date" }).notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.workspaceId, table.month, table.adExternalId],
    }),
    index("active_ad_months_month").on(table.month),
  ]
);
