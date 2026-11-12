import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Short links keep their tables in a Postgres schema of their own. Ids of
// other contexts without foreign keys: erasing a workspace deletes its
// rows. Instants are timestamptz written from the Clock (never NOW()), so
// tests control them.
export const shortlinksSchema = pgSchema("shortlinks");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Each short address issued: one per target, part and destination, so
 * every run of an attempt sends the same text. `code` finds it from a
 * visit; `destination` is the workspace's own content.
 */
export const links = shortlinksSchema.table(
  "links",
  {
    channelId: uuid("channel_id").notNull(),
    code: text("code").notNull(),
    createdAt: instant("created_at").notNull(),
    destination: text("destination").notNull(),
    disabledAt: instant("disabled_at"),
    id: uuid("id").primaryKey(),
    part: integer("part").notNull(),
    postId: uuid("post_id").notNull(),
    targetId: uuid("target_id").notNull(),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    uniqueIndex("links_code").on(table.code),
    uniqueIndex("links_target_part_destination").on(
      table.targetId,
      table.part,
      table.destination
    ),
    // A workspace's links, newest first: ids are UUIDv7s.
    index("links_workspace_id").on(table.workspaceId, table.id),
    index("links_post_id").on(table.postId),
  ]
);

/**
 * How many counted visits a link had each day (UTC): a count only, never
 * anything of the visitor. Days past their retention are deleted by the
 * daily `shortlinks.click-retention` cron.
 */
export const clicks = shortlinksSchema.table(
  "clicks",
  {
    clicks: integer("clicks").notNull(),
    day: date("day", { mode: "date" }).notNull(),
    linkId: uuid("link_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.linkId, table.day] }),
    foreignKey({
      columns: [table.linkId],
      foreignColumns: [links.id],
    }).onDelete("cascade"),
    index("clicks_day").on(table.day),
    check("clicks_clicks", sql`${table.clicks} > 0`),
  ]
);

/** Each workspace's default for new posts; none is false. */
export const settings = shortlinksSchema.table("settings", {
  byDefault: boolean("by_default").notNull(),
  workspaceId: uuid("workspace_id").primaryKey(),
});

export type LinkRow = typeof links.$inferSelect;
