CREATE TABLE "swipe_rank_publication" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"user_id" text NOT NULL,
	"public_key" text NOT NULL,
	"status" text DEFAULT 'PRIVATE' NOT NULL,
	"alias" text DEFAULT 'Anonymous dater' NOT NULL,
	"show_gender" boolean DEFAULT false NOT NULL,
	"show_age_band" boolean DEFAULT false NOT NULL,
	"show_interested_in" boolean DEFAULT false NOT NULL,
	"location_granularity" text DEFAULT 'NONE' NOT NULL,
	"consent_version" integer DEFAULT 1 NOT NULL,
	"consented_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "swipe_rank_publication_publicKey_unique" UNIQUE("public_key"),
	CONSTRAINT "swipe_rank_publication_status" CHECK ("swipe_rank_publication"."status" IN ('PRIVATE', 'PUBLIC')),
	CONSTRAINT "swipe_rank_publication_location_granularity" CHECK ("swipe_rank_publication"."location_granularity" IN ('NONE', 'COUNTRY', 'REGION', 'CITY')),
	CONSTRAINT "swipe_rank_publication_consent_state" CHECK ("swipe_rank_publication"."status" <> 'PUBLIC' OR ("swipe_rank_publication"."consented_at" IS NOT NULL AND "swipe_rank_publication"."revoked_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "swipe_rank_publication" ADD CONSTRAINT "swipe_rank_publication_profile_id_swipe_rank_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."swipe_rank_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_publication" ADD CONSTRAINT "swipe_rank_publication_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "swipe_rank_publication_profile_idx" ON "swipe_rank_publication" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "swipe_rank_publication_public_idx" ON "swipe_rank_publication" USING btree ("status","updated_at");