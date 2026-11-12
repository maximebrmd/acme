CREATE TABLE "assistant"."image_providers" (
	"base_url" text NOT NULL,
	"key_id" text NOT NULL,
	"model" text NOT NULL,
	"sealed_key" text NOT NULL,
	"set_by" uuid,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
