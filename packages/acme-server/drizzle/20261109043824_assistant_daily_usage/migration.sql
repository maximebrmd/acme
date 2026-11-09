CREATE SCHEMA "assistant";
--> statement-breakpoint
CREATE TABLE "assistant"."daily_usage" (
	"day" date,
	"requests" integer NOT NULL,
	"workspace_id" uuid,
	CONSTRAINT "daily_usage_pkey" PRIMARY KEY("workspace_id","day"),
	CONSTRAINT "daily_usage_requests" CHECK ("requests" >= 0)
);
