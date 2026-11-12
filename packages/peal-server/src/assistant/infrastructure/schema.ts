import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Like every context, the assistant keeps its tables in a Postgres schema of
// its own.
export const assistant = pgSchema("assistant");

// How many requests each workspace sent the assistant on each UTC day: the
// daily quota reads today's row, and billing can read them all. A row holds
// counts only, never what was asked or answered.
export const dailyUsage = assistant.table(
  "daily_usage",
  {
    day: date("day", { mode: "string" }).notNull(),
    requests: integer("requests").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.day] }),
    check("daily_usage_requests", sql`${table.requests} >= 0`),
  ]
);

/**
 * The image provider a workspace brought, one at most: its address and
 * model, and its key, encrypted with the server's keyring as
 * `<keyId>.<iv>.<ciphertext>` and bound to
 * `assistant:<workspace id>:<address>`, so a row whose address changed
 * in any way, or that was copied to another workspace, does not decrypt.
 * `key_id` names the key that encrypted it, for a rotation. Who saved it
 * is the activity log's to say, not this row's.
 */
export const imageProviders = assistant.table("image_providers", {
  baseUrl: text("base_url").notNull(),
  keyId: text("key_id").notNull(),
  model: text("model").notNull(),
  sealedKey: text("sealed_key").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  workspaceId: uuid("workspace_id").primaryKey(),
});

// How many images each workspace asked its own provider for each UTC day,
// bounded by `ownImagesPerDay`: counts only, apart from Peal's requests,
// which billing reads.
export const ownImageDays = assistant.table(
  "own_image_days",
  {
    day: date("day", { mode: "string" }).notNull(),
    images: integer("images").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.day] }),
    check("own_image_days_images", sql`${table.images} >= 0`),
  ]
);
