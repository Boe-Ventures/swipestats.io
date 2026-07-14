CREATE TYPE "public"."catalog_submission_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TABLE "catalog_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"submitter_user_id" text,
	"contact_email" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"status" "catalog_submission_status" DEFAULT 'PENDING' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_submission" ADD CONSTRAINT "catalog_submission_submitter_user_id_user_id_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_submission_status_category_idx" ON "catalog_submission" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "catalog_submission_contact_idx" ON "catalog_submission" USING btree ("contact_email");