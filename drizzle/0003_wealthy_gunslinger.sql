ALTER TABLE "cohort_definition" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "comparison_column" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "email_reminder" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "original_anonymized_file" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "data_provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."DataProvider";--> statement-breakpoint
CREATE TYPE "public"."DataProvider" AS ENUM('TINDER', 'HINGE', 'BUMBLE', 'GRINDR', 'BADOO', 'BOO', 'OK_CUPID', 'FEELD', 'RAYA');--> statement-breakpoint
ALTER TABLE "cohort_definition" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "comparison_column" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "email_reminder" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "original_anonymized_file" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "data_provider" SET DATA TYPE "public"."DataProvider" USING "data_provider"::"public"."DataProvider";--> statement-breakpoint
ALTER TABLE "comparison_column" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "attachment_url_key" ON "attachment" USING btree ("url");