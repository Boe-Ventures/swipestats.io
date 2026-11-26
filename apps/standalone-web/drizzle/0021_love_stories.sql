CREATE TABLE "love_encounter" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"request_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"person_id" text NOT NULL,
	"position" integer NOT NULL,
	"kind" text,
	"medium" text,
	"initiator" text,
	"status" text,
	"platform" text,
	"country_code" text,
	"subdivision_code" text,
	"city" text,
	"venue_name" text,
	"place_id" text,
	"place_provider" text,
	"map_url" text,
	"description" text,
	"reflection" text,
	"occurred_at" timestamp with time zone,
	"activities" text[],
	"time_context" jsonb,
	"stops" jsonb,
	"experience_rating" integer,
	"chemistry" integer,
	"compatibility" integer,
	CONSTRAINT "love_encounter_owner_request" UNIQUE("user_id","request_id"),
	CONSTRAINT "love_encounter_version_positive" CHECK ("love_encounter"."version" > 0),
	CONSTRAINT "love_encounter_position" CHECK ("love_encounter"."position" >= 0),
	CONSTRAINT "love_encounter_experienceRating_range" CHECK ("love_encounter"."experience_rating" BETWEEN 1 AND 10),
	CONSTRAINT "love_encounter_chemistry_range" CHECK ("love_encounter"."chemistry" BETWEEN 1 AND 10),
	CONSTRAINT "love_encounter_compatibility_range" CHECK ("love_encounter"."compatibility" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "love_entry_encounter" (
	"entry_id" text NOT NULL,
	"encounter_id" text NOT NULL,
	CONSTRAINT "love_entry_encounter_entry_id_encounter_id_pk" PRIMARY KEY("entry_id","encounter_id")
);
--> statement-breakpoint
CREATE TABLE "love_entry_person" (
	"entry_id" text NOT NULL,
	"person_id" text NOT NULL,
	CONSTRAINT "love_entry_person_entry_id_person_id_pk" PRIMARY KEY("entry_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "love_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"request_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"original_body" text NOT NULL,
	"source_kind" text NOT NULL,
	"occurrence_context" jsonb,
	CONSTRAINT "love_entry_owner_request" UNIQUE("user_id","request_id"),
	CONSTRAINT "love_entry_version_positive" CHECK ("love_entry"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "love_person" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"request_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_name" text NOT NULL,
	"tagline" text,
	"summary" text,
	"origin_country_code" text,
	"origin_subdivision_code" text,
	"origin_city" text,
	"origin_place_id" text,
	"origin_label" text,
	"current_residence_country_code" text,
	"current_residence_subdivision_code" text,
	"current_residence_city" text,
	"current_residence_place_id" text,
	"current_residence_label" text,
	"age_estimate" text,
	"my_age_estimate" text,
	"occupation" text,
	"industry" text,
	"appearance" text,
	"first_contact_method" text,
	"first_contact_platform" text,
	"looking_for" text,
	"contact_context" text,
	"work_arrangement" text,
	"remote_region" text,
	"first_contact_initiator" text,
	"aliases" text[],
	"labels" text[],
	"nationality_codes" text[],
	"side_occupations" text[],
	"interests" text[],
	"age_at_first_meeting" integer,
	"my_age_at_first_meeting" integer,
	"first_met_year" integer,
	"height_cm" integer,
	"compatibility" integer,
	"chemistry" integer,
	"overall" integer,
	"looks" integer,
	"personality" integer,
	"humor" integer,
	"age_is_estimated" boolean,
	"my_age_is_estimated" boolean,
	"residence_history" jsonb,
	"first_contact_place" jsonb,
	"first_contact_time_context" jsonb,
	"first_contact_at" timestamp with time zone,
	CONSTRAINT "love_person_owner_request" UNIQUE("user_id","request_id"),
	CONSTRAINT "love_person_owner_id" UNIQUE("user_id","id"),
	CONSTRAINT "love_person_version_positive" CHECK ("love_person"."version" > 0),
	CONSTRAINT "love_person_name" CHECK (length(btrim("love_person"."display_name")) > 0),
	CONSTRAINT "love_person_compatibility_range" CHECK ("love_person"."compatibility" BETWEEN 1 AND 10),
	CONSTRAINT "love_person_chemistry_range" CHECK ("love_person"."chemistry" BETWEEN 1 AND 10),
	CONSTRAINT "love_person_overall_range" CHECK ("love_person"."overall" BETWEEN 1 AND 10),
	CONSTRAINT "love_person_looks_range" CHECK ("love_person"."looks" BETWEEN 1 AND 10),
	CONSTRAINT "love_person_personality_range" CHECK ("love_person"."personality" BETWEEN 1 AND 10),
	CONSTRAINT "love_person_humor_range" CHECK ("love_person"."humor" BETWEEN 1 AND 10),
	CONSTRAINT "love_person_ageAtFirstMeeting_range" CHECK ("love_person"."age_at_first_meeting" BETWEEN 0 AND 130),
	CONSTRAINT "love_person_myAgeAtFirstMeeting_range" CHECK ("love_person"."my_age_at_first_meeting" BETWEEN 0 AND 130),
	CONSTRAINT "love_person_remote_scope" CHECK ("love_person"."remote_region" IS NULL OR ("love_person"."work_arrangement" IS NOT NULL AND "love_person"."work_arrangement" = 'remote'))
);
--> statement-breakpoint
ALTER TABLE "love_encounter" ADD CONSTRAINT "love_encounter_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_encounter" ADD CONSTRAINT "love_encounter_user_id_person_id_love_person_user_id_id_fk" FOREIGN KEY ("user_id","person_id") REFERENCES "public"."love_person"("user_id","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "love_entry_encounter" ADD CONSTRAINT "love_entry_encounter_entry_id_love_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."love_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_entry_encounter" ADD CONSTRAINT "love_entry_encounter_encounter_id_love_encounter_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."love_encounter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_entry_person" ADD CONSTRAINT "love_entry_person_entry_id_love_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."love_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_entry_person" ADD CONSTRAINT "love_entry_person_person_id_love_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."love_person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_entry" ADD CONSTRAINT "love_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "love_person" ADD CONSTRAINT "love_person_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "love_encounter_owner_idx" ON "love_encounter" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "love_encounter_person_order" ON "love_encounter" USING btree ("user_id","person_id","position");--> statement-breakpoint
CREATE INDEX "love_entry_encounter_target_idx" ON "love_entry_encounter" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "love_entry_person_target_idx" ON "love_entry_person" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "love_entry_owner_idx" ON "love_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "love_person_owner_idx" ON "love_person" USING btree ("user_id");