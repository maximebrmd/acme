CREATE TABLE "billing"."account_transfers" (
	"expires_at" timestamp with time zone NOT NULL,
	"from_account_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY,
	"offered_at" timestamp with time zone NOT NULL,
	"offered_by" text NOT NULL,
	"to_user_id" text NOT NULL,
	"workspace_id" uuid NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "billing"."account_workspaces" (
	"account_id" uuid NOT NULL,
	"attached_at" timestamp with time zone NOT NULL,
	"workspace_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "billing"."accounts" (
	"created_at" timestamp with time zone NOT NULL,
	"free_tier" boolean DEFAULT true NOT NULL,
	"holder_workspace_id" uuid NOT NULL UNIQUE,
	"id" uuid PRIMARY KEY,
	"partner_id" uuid,
	"payer_user_id" text,
	"standalone" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_transfers_from" ON "billing"."account_transfers" ("from_account_id");--> statement-breakpoint
CREATE INDEX "account_transfers_to" ON "billing"."account_transfers" ("to_user_id");--> statement-breakpoint
CREATE INDEX "account_transfers_by" ON "billing"."account_transfers" ("offered_by");--> statement-breakpoint
CREATE INDEX "account_workspaces_account" ON "billing"."account_workspaces" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_payer" ON "billing"."accounts" ("payer_user_id") WHERE "payer_user_id" IS NOT NULL AND "standalone" = false;--> statement-breakpoint
CREATE INDEX "accounts_payer_user" ON "billing"."accounts" ("payer_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_partner" ON "billing"."accounts" ("partner_id") WHERE "partner_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "billing"."account_transfers" ADD CONSTRAINT "account_transfers_from_account_id_accounts_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "billing"."accounts"("id");--> statement-breakpoint
ALTER TABLE "billing"."account_workspaces" ADD CONSTRAINT "account_workspaces_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "billing"."accounts"("id");