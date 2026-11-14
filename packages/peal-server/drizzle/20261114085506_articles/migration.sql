CREATE TABLE "publishing"."article_calls" (
	"article_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"finished_at" timestamp with time zone,
	"idempotency_key" text PRIMARY KEY,
	"outcome" jsonb,
	"round" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	CONSTRAINT "article_calls_article_round_attempt" UNIQUE("article_id","round","attempt")
);
--> statement-breakpoint
CREATE TABLE "publishing"."articles" (
	"author_id" uuid,
	"body" jsonb NOT NULL,
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"channel_id" uuid NOT NULL,
	"cover_media_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"excerpt" text,
	"id" uuid PRIMARY KEY,
	"revision" integer DEFAULT 0 NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"schedule_zone" text,
	"scheduled_at" timestamp with time zone,
	"site_status" text NOT NULL,
	"state" jsonb NOT NULL,
	"status" text NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE INDEX "articles_workspace" ON "publishing"."articles" ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "articles_scheduled" ON "publishing"."articles" ("scheduled_at") WHERE "status" = 'scheduled';--> statement-breakpoint
ALTER TABLE "publishing"."article_calls" ADD CONSTRAINT "article_calls_article_id_articles_id_fkey" FOREIGN KEY ("article_id") REFERENCES "publishing"."articles"("id") ON DELETE CASCADE;