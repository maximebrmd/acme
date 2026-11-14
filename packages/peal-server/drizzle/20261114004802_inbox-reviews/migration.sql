CREATE TABLE "engagement"."review_replies" (
	"attempted_at" timestamp with time zone,
	"author_id" uuid,
	"call_claimed_at" timestamp with time zone,
	"channel_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"reason" text,
	"review_id" uuid NOT NULL,
	"settled_at" timestamp with time zone,
	"status" text NOT NULL,
	"text" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "review_replies_status" CHECK ("status" IN ('sending', 'sent', 'failed', 'unconfirmed', 'withdrawn')),
	CONSTRAINT "review_replies_settled" CHECK (("status" = 'sending') = ("settled_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "engagement"."review_threads" (
	"average_rating" double precision,
	"channel_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY,
	"last_read_at" timestamp with time zone,
	"last_review_at" timestamp with time zone,
	"next_read_at" timestamp with time zone NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"total_review_count" integer,
	"unanswered_count" integer DEFAULT 0 NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement"."reviews" (
	"answered_at" timestamp with time zone,
	"channel_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"platform_review_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"reply_moderation" text,
	"reply_text" text,
	"reply_updated_at" timestamp with time zone,
	"reviewer_name" text,
	"text" text NOT NULL,
	"thread_id" uuid NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL,
	"written_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reviews_rating" CHECK ("rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_photos" CHECK ("photo_count" >= 0),
	CONSTRAINT "reviews_reply" CHECK (("reply_text" IS NULL) = ("reply_updated_at" IS NULL)),
	CONSTRAINT "reviews_reply_moderation" CHECK ("reply_moderation" IS NULL OR ("reply_text" IS NOT NULL AND "reply_moderation" IN ('pending', 'approved', 'rejected')))
);
--> statement-breakpoint
CREATE INDEX "review_replies_thread" ON "engagement"."review_replies" ("thread_id","id");--> statement-breakpoint
CREATE INDEX "review_replies_review" ON "engagement"."review_replies" ("review_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_replies_pending" ON "engagement"."review_replies" ("review_id") WHERE "status" IN ('sending', 'unconfirmed');--> statement-breakpoint
CREATE INDEX "review_replies_sending" ON "engagement"."review_replies" ("created_at","id") WHERE "status" = 'sending';--> statement-breakpoint
CREATE INDEX "review_replies_author" ON "engagement"."review_replies" ("author_id") WHERE "author_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "review_threads_channel" ON "engagement"."review_threads" ("channel_id");--> statement-breakpoint
CREATE INDEX "review_threads_due" ON "engagement"."review_threads" ("next_read_at","id");--> statement-breakpoint
CREATE INDEX "review_threads_workspace_listed" ON "engagement"."review_threads" ("workspace_id","last_review_at","id") WHERE "review_count" > 0;--> statement-breakpoint
CREATE INDEX "review_threads_read" ON "engagement"."review_threads" ("last_read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_platform_id" ON "engagement"."reviews" ("thread_id","platform_review_id");--> statement-breakpoint
CREATE INDEX "reviews_thread_updated" ON "engagement"."reviews" ("thread_id","updated_at");--> statement-breakpoint
CREATE INDEX "reviews_updated" ON "engagement"."reviews" ("updated_at");--> statement-breakpoint
ALTER TABLE "engagement"."review_replies" ADD CONSTRAINT "review_replies_review_id_reviews_id_fkey" FOREIGN KEY ("review_id") REFERENCES "engagement"."reviews"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."review_replies" ADD CONSTRAINT "review_replies_thread_id_review_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "engagement"."review_threads"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "engagement"."reviews" ADD CONSTRAINT "reviews_thread_id_review_threads_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "engagement"."review_threads"("id") ON DELETE CASCADE;