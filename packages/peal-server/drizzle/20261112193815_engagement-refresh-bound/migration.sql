ALTER TABLE "engagement"."comments" ADD COLUMN "expired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "engagement"."threads" ADD COLUMN "refresh_by" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "threads_refresh_by" ON "engagement"."threads" ("refresh_by") WHERE "refresh_by" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "threads_channel_refresh" ON "engagement"."threads" ("channel_id") WHERE "refresh_by" IS NOT NULL;