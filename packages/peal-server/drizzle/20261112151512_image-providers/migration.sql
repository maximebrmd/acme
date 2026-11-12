CREATE TABLE "assistant"."image_providers" (
	"base_url" text NOT NULL,
	"key_id" text NOT NULL,
	"model" text NOT NULL,
	"sealed_key" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "assistant"."own_image_days" (
	"day" date,
	"images" integer NOT NULL,
	"workspace_id" uuid,
	CONSTRAINT "own_image_days_pkey" PRIMARY KEY("workspace_id","day"),
	CONSTRAINT "own_image_days_images" CHECK ("images" >= 0)
);
