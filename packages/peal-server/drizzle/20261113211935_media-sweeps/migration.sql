CREATE TABLE "media"."erased_folders" (
	"erased_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "media"."store_identity" (
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"epoch" bigint DEFAULT 0 NOT NULL,
	"id" uuid NOT NULL,
	"singleton" boolean PRIMARY KEY DEFAULT true,
	CONSTRAINT "store_identity_singleton" CHECK ("singleton")
);
--> statement-breakpoint
CREATE TABLE "media"."sweep_cursors" (
	"after_key" text NOT NULL,
	"after_upload_id" text,
	"sweep" text PRIMARY KEY,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "erased_folders_erased_at_index" ON "media"."erased_folders" ("erased_at");--> statement-breakpoint
CREATE INDEX "media_assets_pending_created_at_index" ON "media"."media_assets" ("created_at") WHERE "status" = 'pending';