DROP INDEX "media"."media_assets_workspace_id_index";--> statement-breakpoint
ALTER TABLE "media"."media_assets" ADD COLUMN "alt_text" text;--> statement-breakpoint
ALTER TABLE "media"."media_assets" ADD COLUMN "probe_state" text;--> statement-breakpoint
CREATE INDEX "media_assets_workspace_id_id_index" ON "media"."media_assets" ("workspace_id","id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "media"."media_assets" ADD CONSTRAINT "media_assets_probe_state" CHECK ("probe_state" IS NULL OR "status" = 'uploaded');