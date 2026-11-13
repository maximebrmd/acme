import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Like every context, media keeps its tables in a Postgres schema of its own.
export const media = pgSchema("media");

const instant = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true });

// One row per media asset. The status columns mirror MediaStatus: a pending
// multipart upload keeps the store's upload id and part size, an uploaded
// asset where its probe stands, and a rejected asset its reason. Metadata
// stays null until a probe finds it.
export const mediaAssets = media.table(
  "media_assets",
  {
    // True only for a file the writing assistant made, stored as the
    // provider gave it.
    aiGenerated: boolean("ai_generated").notNull().default(false),
    altText: text("alt_text"),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    codec: text("codec"),
    contentType: text("content_type").notNull(),
    createdAt: instant("created_at").notNull(),
    durationMs: integer("duration_ms"),
    // What the file was called where it came from, cleaned: null for a
    // file the assistant made and for every file added before names were
    // kept.
    fileName: text("file_name"),
    height: integer("height"),
    id: uuid("id").primaryKey(),
    multipartPartSize: integer("multipart_part_size"),
    multipartUploadId: text("multipart_upload_id"),
    // A document's pages, when the probe could count them.
    pageCount: integer("page_count"),
    // Null on rows saved uploaded before probes were tracked: not probed yet.
    probeState: text("probe_state"),
    rejectionReason: text("rejection_reason"),
    status: text("status").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    updatedAt: instant("updated_at").notNull(),
    width: integer("width"),
    workspaceId: uuid("workspace_id").notNull(),
  },
  (table) => [
    // A workspace's assets, newest first: ids are UUIDv7s, so they sort by
    // creation time.
    index("media_assets_workspace_id_id_index").on(
      table.workspaceId,
      table.id.desc()
    ),
    // A workspace's files of some content types, newest first: the
    // library's filter by kind, which a kind the workspace holds few of
    // would otherwise read the whole library for.
    index("media_assets_workspace_id_content_type_id_index").on(
      table.workspaceId,
      table.contentType,
      table.id.desc()
    ),
    // The library's search, text anywhere in a name or a description
    // whatever its case (ILIKE), on pg_trgm's trigrams: the planner takes
    // the files that hold the text from these, and those of the workspace
    // from the index above, so a search that finds few files reads few.
    index("media_assets_file_name_trigram_index").using(
      "gin",
      table.fileName.op("gin_trgm_ops")
    ),
    index("media_assets_alt_text_trigram_index").using(
      "gin",
      table.altText.op("gin_trgm_ops")
    ),
    // The uploads never completed, oldest first, for their sweep: few
    // rows of all, so it reads no other.
    index("media_assets_pending_created_at_index")
      .on(table.createdAt)
      .where(sql`${table.status} = 'pending'`),
    check(
      "media_assets_status",
      sql`${table.status} IN ('pending', 'uploaded', 'ready', 'rejected')`
    ),
    check(
      "media_assets_multipart_upload",
      sql`(${table.multipartUploadId} IS NULL) = (${table.multipartPartSize} IS NULL) AND (${table.multipartUploadId} IS NULL OR ${table.status} = 'pending')`
    ),
    check(
      "media_assets_probe_state",
      sql`${table.probeState} IS NULL OR ${table.status} = 'uploaded'`
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

// Where each sweep that lists the bucket over several runs stopped: the
// last key listed (relative to the store's prefix) and, for multipart
// uploads, the last upload of it. No row: the next run starts from the
// first key.
export const sweepCursors = media.table("sweep_cursors", {
  afterKey: text("after_key").notNull(),
  afterUploadId: text("after_upload_id"),
  sweep: text("sweep").primaryKey(),
  updatedAt: instant("updated_at").notNull(),
});

// The workspaces erased whose folder the store may still hold: written in
// the erasure's transaction, deleted once the folder is empty, so a store
// that failed after the erasure committed has its folder emptied by the
// sweep. Ids only.
export const erasedFolders = media.table(
  "erased_folders",
  {
    erasedAt: instant("erased_at").notNull(),
    workspaceId: uuid("workspace_id").primaryKey(),
  },
  (table) => [index("erased_folders_erased_at_index").on(table.erasedAt)]
);
