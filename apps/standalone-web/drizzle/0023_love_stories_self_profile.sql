CREATE TABLE "love_self_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"origin_country_code" text,
	"origin_subdivision_code" text,
	"origin_city" text,
	"origin_place_id" text,
	"origin_label" text,
	"nationality_codes" text[],
	"additional_origin_country_codes" text[],
	"background_groups" text[],
	"background_detail" text,
	"background_source" text,
	"background_notes" text,
	"eye_color" text,
	"eye_color_notes" text,
	"current_residence_country_code" text,
	"current_residence_subdivision_code" text,
	"current_residence_city" text,
	"current_residence_place_id" text,
	"current_residence_label" text,
	"residence_history" jsonb,
	"height_cm" integer,
	"appearance" text,
	CONSTRAINT "love_self_profile_version_positive" CHECK ("love_self_profile"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "love_person" ADD COLUMN "additional_origin_country_codes" text[];--> statement-breakpoint
ALTER TABLE "love_person" ADD COLUMN "background_groups" text[];--> statement-breakpoint
ALTER TABLE "love_person" ADD COLUMN "background_detail" text;--> statement-breakpoint
ALTER TABLE "love_person" ADD COLUMN "background_source" text;--> statement-breakpoint
ALTER TABLE "love_person" ADD COLUMN "background_notes" text;--> statement-breakpoint
ALTER TABLE "love_person" ADD COLUMN "eye_color" text;--> statement-breakpoint
ALTER TABLE "love_person" ADD COLUMN "eye_color_notes" text;--> statement-breakpoint
ALTER TABLE "love_self_profile" ADD CONSTRAINT "love_self_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;