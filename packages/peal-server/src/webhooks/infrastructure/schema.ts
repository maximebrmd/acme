import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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

// The webhooks context's tables, in their own Postgres schema. Instants are
// timestamptz written from the Clock (never NOW()), so tests control them.
// Nothing here names a user.
export const webhooksSchema = pgSchema("webhooks");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * One row per endpoint of a workspace.
 *
 * - `url` may hold a secret of the receiver's in its path or query: it is
 *   shown to those who manage the workspace's webhooks, never logged.
 * - `secret` and `previous_secret` are stored as the TokenCipher wrote
 *   them, `<keyId>.<iv>.<ciphertext>`, bound to `webhook:<id>`. The
 *   previous one signs until `previous_secret_expires_at`.
 * - `status` is the endpoint status's tag; `disabled_reason` and
 *   `disabled_at` say why and when it was turned off.
 * - `failing_since` is when its attempts started failing, null since one
 *   succeeded.
 * - `scope` is `workspace`, or `partner` for an endpoint of a partner's
 *   home workspace that hears every workspace the partner owns too.
 * - Event types are not checked here, so adding one needs no migration:
 *   the store decodes every row with the domain's schema.
 * - `channel_ids` and `workspace_ids` are its filters, empty for none: ids
 *   without foreign keys, kept as saved after what they name is gone.
 */
export const endpoints = webhooksSchema.table(
  "endpoints",
  {
    channelIds: uuid("channel_ids")
      .array()
      .notNull()
      .default(sql`'{}'`),
    createdAt: instant("created_at").notNull(),
    description: text("description").notNull(),
    disabledAt: instant("disabled_at"),
    disabledReason: text("disabled_reason"),
    eventTypes: text("event_types").array().notNull(),
    failingSince: instant("failing_since"),
    id: uuid("id").primaryKey(),
    previousSecret: text("previous_secret"),
    previousSecretExpiresAt: instant("previous_secret_expires_at"),
    scope: text("scope").notNull().default("workspace"),
    secret: text("secret").notNull(),
    status: text("status").notNull(),
    updatedAt: instant("updated_at").notNull(),
    url: text("url").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    workspaceIds: uuid("workspace_ids")
      .array()
      .notNull()
      .default(sql`'{}'`),
  },
  (table) => [
    // A workspace's endpoints, oldest first: ids are UUIDv7s.
    index("endpoints_workspace").on(table.workspaceId, table.id),
    check("endpoints_status", sql`${table.status} IN ('enabled', 'disabled')`),
    check("endpoints_scope", sql`${table.scope} IN ('workspace', 'partner')`),
    check(
      "endpoints_disabled",
      sql`(${table.status} = 'disabled') = (${table.disabledReason} IS NOT NULL AND ${table.disabledAt} IS NOT NULL)`
    ),
  ]
);

/**
 * The events on their way to endpoints, kept while a delivery refers to
 * them: `data` is the event's data as receivers get it (ids, states, codes,
 * instants and permalinks: never what a post says or shows), `key` names
 * what happened, so a fact told twice is kept once. `sample` marks the
 * made-up event of a test of one type, which receivers are told to ignore.
 */
export const events = webhooksSchema.table(
  "events",
  {
    data: jsonb("data").notNull(),
    // The id a partner gave the workspace, as it was when this happened.
    externalId: text("external_id"),
    id: uuid("id").primaryKey(),
    key: text("key").notNull(),
    occurredAt: instant("occurred_at").notNull(),
    sample: boolean("sample").notNull().default(false),
    type: text("type").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    unique("events_key").on(table.key),
    index("events_workspace").on(table.workspaceId),
  ]
);

/**
 * One row per event sent to an endpoint, the endpoint's log: where its
 * attempts stand and how the last one ended.
 *
 * - `status`: `pending`, `succeeded` or `failed`; `failure_reason` says why
 *   it failed for good, and `completed_at` when it was over.
 * - `response_status` and `response_excerpt` are the receiver's last
 *   answer: its status, and, when that was not a success, one line of 256
 *   characters at most. `attempt_error` says why an attempt got no answer.
 * - `workspace_id` is the endpoint's, so a partner endpoint's deliveries
 *   of its tenants' events are in its home workspace's log; the event's
 *   own workspace is the event's.
 * - `redelivery_of` is the delivery this one sends again, if it does.
 */
export const deliveries = webhooksSchema.table(
  "deliveries",
  {
    attemptError: text("attempt_error"),
    attempts: integer("attempts").notNull(),
    completedAt: instant("completed_at"),
    createdAt: instant("created_at").notNull(),
    durationMs: integer("duration_ms"),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => endpoints.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    failureReason: text("failure_reason"),
    id: uuid("id").primaryKey(),
    lastAttemptAt: instant("last_attempt_at"),
    nextAttemptAt: instant("next_attempt_at"),
    redeliveryOf: uuid("redelivery_of"),
    responseExcerpt: text("response_excerpt"),
    responseStatus: integer("response_status"),
    status: text("status").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // An endpoint's log, newest first: ids are UUIDv7s.
    index("deliveries_endpoint").on(table.endpointId, table.id),
    index("deliveries_event").on(table.eventId),
    // The retention's scan.
    index("deliveries_created").on(table.createdAt),
    // The workspace's log across its endpoints, newest first.
    index("deliveries_workspace").on(table.workspaceId, table.id),
    // An endpoint's failed deliveries, to send them again.
    index("deliveries_endpoint_failed")
      .on(table.endpointId, table.id)
      .where(sql`${table.status} = 'failed'`),
    check(
      "deliveries_status",
      sql`${table.status} IN ('pending', 'succeeded', 'failed')`
    ),
    check("deliveries_attempts", sql`${table.attempts} >= 0`),
  ]
);

/**
 * What a workspace's members sent by hand in each hour (`window_start`,
 * on the hour, UTC), by kind: `single` (test events and deliveries sent
 * again one by one) and `bulk` (deliveries sent again by the many). One
 * statement adds to the hour's row, so sends from every server take turns
 * on it. Rows older than a day go with the delivery logs' retention.
 */
export const manualSends = webhooksSchema.table(
  "manual_sends",
  {
    kind: text("kind").notNull(),
    sent: integer("sent").notNull(),
    windowStart: instant("window_start").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.kind, table.windowStart] }),
    index("manual_sends_window_start").on(table.windowStart),
    check("manual_sends_kind", sql`${table.kind} IN ('single', 'bulk')`),
    check("manual_sends_sent", sql`${table.sent} > 0`),
  ]
);
