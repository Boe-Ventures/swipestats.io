CREATE TYPE "public"."catalog_claim_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."catalog_entry_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."catalog_member_role" AS ENUM('OWNER', 'EDITOR');--> statement-breakpoint
CREATE TYPE "public"."catalog_request_status" AS ENUM('OPEN', 'MATCHED', 'CLOSED', 'WITHDRAWN');--> statement-breakpoint
CREATE TYPE "public"."catalog_request_visibility" AS ENUM('PRIVATE', 'INVITED', 'BROADCAST');--> statement-breakpoint
CREATE TYPE "public"."catalog_verification_status" AS ENUM('UNVERIFIED', 'VERIFIED');--> statement-breakpoint
CREATE TABLE "catalog_entry_claim" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"claimant_user_id" text,
	"claimant_email" text,
	"status" "catalog_claim_status" DEFAULT 'PENDING' NOT NULL,
	"evidence" jsonb NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "catalog_entry_claim_has_identity" CHECK ("catalog_entry_claim"."claimant_user_id" is not null or "catalog_entry_claim"."claimant_email" is not null)
);
--> statement-breakpoint
CREATE TABLE "catalog_entry_member" (
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "catalog_member_role" DEFAULT 'EDITOR' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_entry_member_entry_id_user_id_pk" PRIMARY KEY("entry_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"primary_category" text NOT NULL,
	"status" "catalog_entry_status" DEFAULT 'DRAFT' NOT NULL,
	"verification_status" "catalog_verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"claimed_at" timestamp with time zone,
	"featured" boolean DEFAULT false NOT NULL,
	"editorial_pick" boolean DEFAULT false NOT NULL,
	"remote" boolean DEFAULT false NOT NULL,
	"location_keys" text[] DEFAULT '{}' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_entry_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "catalog_request" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_user_id" text,
	"anonymous_session_id" text,
	"contact_email" text,
	"target_entry_id" text,
	"category" text NOT NULL,
	"status" "catalog_request_status" DEFAULT 'OPEN' NOT NULL,
	"visibility" "catalog_request_visibility" DEFAULT 'PRIVATE' NOT NULL,
	"data" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_request_has_identity" CHECK ("catalog_request"."requester_user_id" is not null or "catalog_request"."contact_email" is not null)
);
--> statement-breakpoint
ALTER TABLE "catalog_entry_claim" ADD CONSTRAINT "catalog_entry_claim_entry_id_catalog_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."catalog_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_entry_claim" ADD CONSTRAINT "catalog_entry_claim_claimant_user_id_user_id_fk" FOREIGN KEY ("claimant_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_entry_claim" ADD CONSTRAINT "catalog_entry_claim_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_entry_member" ADD CONSTRAINT "catalog_entry_member_entry_id_catalog_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."catalog_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_entry_member" ADD CONSTRAINT "catalog_entry_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_request" ADD CONSTRAINT "catalog_request_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_request" ADD CONSTRAINT "catalog_request_target_entry_id_catalog_entry_id_fk" FOREIGN KEY ("target_entry_id") REFERENCES "public"."catalog_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_entry_claim_entry_status_idx" ON "catalog_entry_claim" USING btree ("entry_id","status");--> statement-breakpoint
CREATE INDEX "catalog_entry_claim_claimant_idx" ON "catalog_entry_claim" USING btree ("claimant_user_id","claimant_email");--> statement-breakpoint
CREATE INDEX "catalog_entry_member_user_idx" ON "catalog_entry_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "catalog_entry_status_category_idx" ON "catalog_entry" USING btree ("status","primary_category");--> statement-breakpoint
CREATE INDEX "catalog_entry_presentation_idx" ON "catalog_entry" USING btree ("featured","editorial_pick","name");--> statement-breakpoint
CREATE INDEX "catalog_entry_location_keys_idx" ON "catalog_entry" USING gin ("location_keys");--> statement-breakpoint
CREATE INDEX "catalog_request_status_category_idx" ON "catalog_request" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "catalog_request_target_entry_idx" ON "catalog_request" USING btree ("target_entry_id");