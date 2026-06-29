CREATE TYPE "public"."app_token_purpose" AS ENUM('email_preferences', 'unsubscribe');--> statement-breakpoint
CREATE TABLE "app_token" (
	"id" text PRIMARY KEY NOT NULL,
	"purpose" "app_token_purpose" NOT NULL,
	"subject" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_token" ADD CONSTRAINT "app_token_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "app_token_token_hash_idx" ON "app_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "app_token_purpose_subject_idx" ON "app_token" USING btree ("purpose","subject");--> statement-breakpoint
CREATE INDEX "app_token_expires_at_idx" ON "app_token" USING btree ("expires_at");