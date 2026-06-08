CREATE TABLE "ai_output" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"tone" text,
	"model" text NOT NULL,
	"version" smallint DEFAULT 1 NOT NULL,
	"input" jsonb NOT NULL,
	"output" jsonb NOT NULL,
	"share_key" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "ai_output_shareKey_unique" UNIQUE("share_key")
);
--> statement-breakpoint
ALTER TABLE "cohort_definition" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "comparison_column" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "email_reminder" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "original_anonymized_file" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
UPDATE "cohort_definition" SET "data_provider" = 'GRINDR' WHERE "data_provider" = 'GRINDER';--> statement-breakpoint
UPDATE "comparison_column" SET "data_provider" = 'GRINDR' WHERE "data_provider" = 'GRINDER';--> statement-breakpoint
UPDATE "email_reminder" SET "data_provider" = 'GRINDR' WHERE "data_provider" = 'GRINDER';--> statement-breakpoint
UPDATE "original_anonymized_file" SET "data_provider" = 'GRINDR' WHERE "data_provider" = 'GRINDER';--> statement-breakpoint
UPDATE "waitlist" SET "data_provider" = 'GRINDR' WHERE "data_provider" = 'GRINDER';--> statement-breakpoint
DROP TYPE "public"."DataProvider";--> statement-breakpoint
CREATE TYPE "public"."DataProvider" AS ENUM('TINDER', 'HINGE', 'BUMBLE', 'GRINDR', 'BADOO', 'BOO', 'OK_CUPID', 'FEELD', 'RAYA');--> statement-breakpoint
ALTER TABLE "cohort_definition" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "comparison_column" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "email_reminder" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "original_anonymized_file" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "comparison_column" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN IF NOT EXISTS "llm_analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "original_url" text;--> statement-breakpoint
ALTER TABLE "tinder_profile" ADD COLUMN IF NOT EXISTS "llm_analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "languages" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_output" ADD CONSTRAINT "ai_output_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_output_subject_key" ON "ai_output" USING btree ("kind","subject_id","scope");--> statement-breakpoint
CREATE INDEX "ai_output_user_id_idx" ON "ai_output" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_output_share_key_idx" ON "ai_output" USING btree ("share_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attachment_url_key" ON "attachment" USING btree ("url");