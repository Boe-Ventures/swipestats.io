-- Custom SQL migration file, put your code below! --
ALTER TABLE "transient_upload" DROP CONSTRAINT "transient_upload_commit_state";--> statement-breakpoint
ALTER TABLE "transient_upload" ADD CONSTRAINT "transient_upload_commit_state" CHECK ("transient_upload"."status" NOT IN ('COMMITTED', 'RETAINED', 'CLEANED') OR ("transient_upload"."result_profile_id" IS NOT NULL AND "transient_upload"."committed_at" IS NOT NULL));
