ALTER TABLE "publishing"."posts" ADD COLUMN "media" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "publishing"."posts" ADD COLUMN "text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "publishing"."posts" ADD COLUMN "text_overrides" jsonb DEFAULT '[]' NOT NULL;