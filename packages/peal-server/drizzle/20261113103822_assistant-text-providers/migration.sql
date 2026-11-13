CREATE TABLE "assistant"."own_text_days" (
	"day" date,
	"requests" integer NOT NULL,
	"workspace_id" uuid,
	CONSTRAINT "own_text_days_pkey" PRIMARY KEY("workspace_id","day"),
	CONSTRAINT "own_text_days_requests" CHECK ("requests" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assistant"."text_providers" (
	"base_url" text NOT NULL,
	"key_id" text NOT NULL,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"sealed_key" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY,
	CONSTRAINT "text_providers_kind" CHECK ("kind" IN ('anthropic', 'openai-compatible'))
);
