CREATE TYPE "public"."TransientUploadStatus" AS ENUM('ISSUED', 'UPLOADED', 'PROCESSING', 'COMMITTED', 'CLEANED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "transient_upload" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"session_id" text NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"profile_id" text NOT NULL,
	"expected_pathname" text NOT NULL,
	"blob_url" text,
	"blob_pathname" text,
	"status" "TransientUploadStatus" DEFAULT 'ISSUED' NOT NULL,
	"result_profile_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"uploaded_at" timestamp with time zone,
	"processing_started_at" timestamp with time zone,
	"committed_at" timestamp with time zone,
	"cleaned_at" timestamp with time zone,
	"cleanup_attempted_at" timestamp with time zone,
	"cleanup_attempts" integer DEFAULT 0 NOT NULL,
	"last_cleanup_error" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "transient_upload_blobUrl_unique" UNIQUE("blob_url"),
	CONSTRAINT "transient_upload_provider" CHECK ("transient_upload"."data_provider" IN ('TINDER', 'HINGE')),
	CONSTRAINT "transient_upload_cleanup_attempts" CHECK ("transient_upload"."cleanup_attempts" >= 0),
	CONSTRAINT "transient_upload_blob_state" CHECK ("transient_upload"."status" IN ('ISSUED', 'ABANDONED') OR ("transient_upload"."blob_url" IS NOT NULL AND "transient_upload"."blob_pathname" IS NOT NULL AND "transient_upload"."uploaded_at" IS NOT NULL)),
	CONSTRAINT "transient_upload_processing_state" CHECK ("transient_upload"."status" <> 'PROCESSING' OR "transient_upload"."processing_started_at" IS NOT NULL),
	CONSTRAINT "transient_upload_commit_state" CHECK ("transient_upload"."status" NOT IN ('COMMITTED', 'CLEANED') OR ("transient_upload"."result_profile_id" IS NOT NULL AND "transient_upload"."committed_at" IS NOT NULL)),
	CONSTRAINT "transient_upload_cleaned_state" CHECK ("transient_upload"."status" <> 'CLEANED' OR "transient_upload"."cleaned_at" IS NOT NULL),
	CONSTRAINT "transient_upload_abandoned_state" CHECK ("transient_upload"."status" <> 'ABANDONED' OR ("transient_upload"."result_profile_id" IS NULL AND "transient_upload"."committed_at" IS NULL)),
	CONSTRAINT "transient_upload_lease_bounds" CHECK ("transient_upload"."expires_at" > "transient_upload"."created_at")
);
--> statement-breakpoint
ALTER TABLE "transient_upload" ADD CONSTRAINT "transient_upload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transient_upload_owner_idx" ON "transient_upload" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "transient_upload_expiry_idx" ON "transient_upload" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transient_upload_binding_idx" ON "transient_upload" USING btree ("user_id","session_id","data_provider","profile_id","expected_pathname");