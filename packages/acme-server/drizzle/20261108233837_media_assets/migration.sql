CREATE TABLE "media_assets" (
	"byte_size" bigint NOT NULL,
	"codec" text,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"height" integer,
	"id" uuid PRIMARY KEY,
	"multipart_part_size" integer,
	"multipart_upload_id" text,
	"rejection_reason" text,
	"status" text NOT NULL,
	"storage_key" text NOT NULL UNIQUE,
	"updated_at" timestamp with time zone NOT NULL,
	"width" integer,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "media_assets_status" CHECK ("status" IN ('pending', 'uploaded', 'ready', 'rejected')),
	CONSTRAINT "media_assets_multipart_upload" CHECK (("multipart_upload_id" IS NULL) = ("multipart_part_size" IS NULL) AND ("multipart_upload_id" IS NULL OR "status" = 'pending')),
	CONSTRAINT "media_assets_rejection_reason" CHECK (("rejection_reason" IS NULL) = ("status" <> 'rejected')),
	CONSTRAINT "media_assets_dimensions" CHECK (("width" IS NULL) = ("height" IS NULL))
);
--> statement-breakpoint
CREATE INDEX "media_assets_workspace_id_index" ON "media_assets" ("workspace_id");