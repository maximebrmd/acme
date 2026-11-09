CREATE SCHEMA "analytics";
--> statement-breakpoint
CREATE TABLE "analytics"."metric_snapshots" (
	"collected_at" timestamp with time zone,
	"impressions" integer,
	"likes" integer NOT NULL,
	"quotes" integer,
	"replies" integer NOT NULL,
	"reposts" integer NOT NULL,
	"target_id" uuid,
	CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY("target_id","collected_at"),
	CONSTRAINT "metric_snapshots_counts" CHECK ("likes" >= 0 AND "reposts" >= 0 AND "replies" >= 0 AND coalesce("quotes", 0) >= 0 AND coalesce("impressions", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "analytics"."tracked_posts" (
	"channel_id" uuid NOT NULL,
	"end_reason" text,
	"ended_at" timestamp with time zone,
	"impressions" integer,
	"last_collected_at" timestamp with time zone,
	"likes" integer,
	"next_collection_at" timestamp with time zone,
	"permalink" text,
	"platform_post_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"quotes" integer,
	"replies" integer,
	"reposts" integer,
	"target_id" uuid PRIMARY KEY,
	"workspace_id" uuid NOT NULL,
	CONSTRAINT "tracked_posts_collection" CHECK (("next_collection_at" IS NULL) <> ("ended_at" IS NULL))
);
--> statement-breakpoint
CREATE INDEX "tracked_posts_due" ON "analytics"."tracked_posts" ("next_collection_at","target_id") WHERE "next_collection_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "tracked_posts_workspace_published" ON "analytics"."tracked_posts" ("workspace_id","published_at");--> statement-breakpoint
CREATE INDEX "tracked_posts_post" ON "analytics"."tracked_posts" ("post_id");--> statement-breakpoint
CREATE INDEX "tracked_posts_published" ON "analytics"."tracked_posts" ("published_at","target_id");--> statement-breakpoint
CREATE INDEX "post_targets_published" ON "publishing"."post_targets" ("finished_at","id") WHERE "status" = 'published';--> statement-breakpoint
ALTER TABLE "analytics"."metric_snapshots" ADD CONSTRAINT "metric_snapshots_target_id_tracked_posts_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "analytics"."tracked_posts"("target_id") ON DELETE CASCADE;