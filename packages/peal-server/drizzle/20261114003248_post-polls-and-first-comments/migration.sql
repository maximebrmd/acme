DROP INDEX "publishing"."post_targets_published";--> statement-breakpoint
ALTER TABLE "publishing"."post_targets" ADD COLUMN "first_comment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "publishing"."post_targets" ADD COLUMN "parts_left_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "publishing"."posts" ADD COLUMN "poll" jsonb;--> statement-breakpoint
CREATE INDEX "post_targets_listed" ON "publishing"."post_targets" ("listed_at","id") WHERE "listed_at" IS NOT NULL;