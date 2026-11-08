import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const instant = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

// One row per media asset. The status columns mirror MediaStatus: a pending
// multipart upload keeps the store's upload id and part size, and a rejected
// asset its reason. Metadata stays null until a probe finds it.
export const mediaAssets = pgTable(
  "media_assets",
  {
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    codec: text("codec"),
    contentType: text("content_type").notNull(),
    createdAt: instant("created_at").notNull(),
    durationMs: integer("duration_ms"),
    height: integer("height"),
    id: uuid("id").primaryKey(),
    multipartPartSize: integer("multipart_part_size"),
    multipartUploadId: text("multipart_upload_id"),
    rejectionReason: text("rejection_reason"),
    status: text("status").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    updatedAt: instant("updated_at").notNull(),
    width: integer("width"),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    index("media_assets_workspace_id_index").on(table.workspaceId),
    check(
      "media_assets_status",
      sql`${table.status} IN ('pending', 'uploaded', 'ready', 'rejected')`
    ),
    check(
      "media_assets_multipart_upload",
      sql`(${table.multipartUploadId} IS NULL) = (${table.multipartPartSize} IS NULL) AND (${table.multipartUploadId} IS NULL OR ${table.status} = 'pending')`
    ),
    check(
      "media_assets_rejection_reason",
      sql`(${table.rejectionReason} IS NULL) = (${table.status} <> 'rejected')`
    ),
    check(
      "media_assets_dimensions",
      sql`(${table.width} IS NULL) = (${table.height} IS NULL)`
    ),
  ]
);
