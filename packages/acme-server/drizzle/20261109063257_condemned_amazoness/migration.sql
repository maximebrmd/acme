ALTER TABLE "notifications"."notification_preferences" ADD COLUMN "every_post" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "publishing"."posts" ADD COLUMN "author_id" uuid;--> statement-breakpoint
CREATE INDEX "posts_workspace_drafts" ON "publishing"."posts" ("workspace_id","id") WHERE "status" = 'draft';