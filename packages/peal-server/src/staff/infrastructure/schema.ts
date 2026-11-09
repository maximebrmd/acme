import {
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// The staff context's tables, in their own Postgres schema. Instants are
// timestamptz written from the Clock (never NOW()), so tests control them.
export const staffSchema = pgSchema("staff");

const instant = (name: string) => timestamp(name, { withTimezone: true });

/**
 * The audit log: what staff did, recorded before it was carried out. Ids
 * only (Better Auth's user ids, without foreign keys, so an entry outlives
 * its accounts), the action, the reason staff gave and when; never what
 * anyone wrote. Closing an account sets the target id of the events about
 * it to null, with their reason; the events its user made as staff keep
 * their id (StaffRecords). `action` is a StaffAction: add values, never
 * rename one. A change staff made while acting as an account also keeps
 * its operation (an endpoint or route name), the workspace it was in and
 * the ids it named (`object_ids`, an object of id names to ids), never
 * what the request carried.
 */
export const auditEvents = staffSchema.table(
  "audit_events",
  {
    action: text("action").notNull(),
    at: instant("at").notNull(),
    banExpiresAt: instant("ban_expires_at"),
    id: uuid("id").primaryKey(),
    objectIds: jsonb("object_ids")
      .$type<Readonly<Record<string, string>>>()
      .notNull()
      .default({}),
    operation: text("operation"),
    reason: text("reason"),
    staffId: uuid("staff_id"),
    targetId: uuid("target_id"),
    workspaceId: uuid("workspace_id"),
  },
  (table) => [
    index("audit_events_at").on(table.at, table.id),
    index("audit_events_target").on(table.targetId, table.at),
    index("audit_events_staff").on(table.staffId),
    index("audit_events_workspace").on(table.workspaceId, table.at),
  ]
);
