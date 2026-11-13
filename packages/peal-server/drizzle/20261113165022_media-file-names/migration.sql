ALTER TABLE "media"."media_assets" ADD COLUMN "file_name" text;--> statement-breakpoint
CREATE INDEX "media_assets_workspace_id_content_type_id_index" ON "media"."media_assets" ("workspace_id","content_type","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "media_assets_file_name_trigram_index" ON "media"."media_assets" USING gin ("file_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "media_assets_alt_text_trigram_index" ON "media"."media_assets" USING gin ("alt_text" gin_trgm_ops);