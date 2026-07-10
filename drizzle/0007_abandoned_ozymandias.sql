CREATE TABLE "raya_profile" (
	"raya_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"birth_date" timestamp NOT NULL,
	"age_at_upload" integer NOT NULL,
	"gender" "Gender" NOT NULL,
	"gender_str" text NOT NULL,
	"occupation" text,
	"company" text,
	"residence_location" text,
	"status" text,
	"instagram_connected" boolean NOT NULL,
	"website_connected" boolean NOT NULL,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_day_on_app" timestamp NOT NULL,
	"last_day_on_app" timestamp NOT NULL,
	"days_in_profile_period" integer NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "raya_usage" (
	"date_stamp" timestamp NOT NULL,
	"date_stamp_raw" text NOT NULL,
	"raya_profile_id" text NOT NULL,
	"swipe_likes" integer NOT NULL,
	"swipe_passes" integer NOT NULL,
	"swipes_combined" integer NOT NULL,
	"matches" integer NOT NULL,
	"messages_sent" integer NOT NULL,
	"match_rate" double precision NOT NULL,
	"like_rate" double precision NOT NULL,
	CONSTRAINT "raya_usage_date_stamp_raw_raya_profile_id_pk" PRIMARY KEY("date_stamp_raw","raya_profile_id")
);
--> statement-breakpoint
ALTER TABLE "raya_profile" ADD CONSTRAINT "raya_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raya_usage" ADD CONSTRAINT "raya_usage_raya_profile_id_raya_profile_raya_id_fk" FOREIGN KEY ("raya_profile_id") REFERENCES "public"."raya_profile"("raya_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "raya_profile_user_id_unique" ON "raya_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "raya_usage_raya_profile_id_idx" ON "raya_usage" USING btree ("raya_profile_id");