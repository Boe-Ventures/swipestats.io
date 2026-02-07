CREATE TYPE "public"."DataProvider" AS ENUM('TINDER', 'HINGE', 'BUMBLE', 'GRINDER', 'BADOO', 'BOO', 'OK_CUPID', 'FEELD');--> statement-breakpoint
CREATE TYPE "public"."DatasetExportStatus" AS ENUM('PENDING', 'GENERATING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."DatasetTier" AS ENUM('STARTER', 'STANDARD', 'FRESH', 'PREMIUM', 'ACADEMIC');--> statement-breakpoint
CREATE TYPE "public"."EducationLevel" AS ENUM('HIGH_SCHOOL', 'BACHELORS', 'IN_COLLEGE', 'IN_GRAD_SCHOOL', 'MASTERS', 'TRADE_SCHOOL', 'PHD');--> statement-breakpoint
CREATE TYPE "public"."EventType" AS ENUM('RELATIONSHIP', 'FRIENDS_WITH_BENEFITS', 'TRIP', 'SUBSCRIPTION', 'NEW_LOCATION', 'NEW_PHOTOS', 'NEW_FIRST_PHOTO', 'NEW_JOB', 'GRADUATION', 'JOINED_SWIPESTATS', 'JOINED_TINDER', 'JOINED_HINGE', 'NEW_BIO', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."Gender" AS ENUM('MALE', 'FEMALE', 'OTHER', 'MORE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."HingeInteractionType" AS ENUM('LIKE_SENT', 'REJECT', 'UNMATCH');--> statement-breakpoint
CREATE TYPE "public"."MessageType" AS ENUM('TEXT', 'GIF', 'VOICE_NOTE', 'GESTURE', 'ACTIVITY', 'CONTACT_CARD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."SwipestatsTier" AS ENUM('FREE', 'PLUS', 'ELITE');--> statement-breakpoint
CREATE TYPE "public"."SwipestatsVersion" AS ENUM('SWIPESTATS_1', 'SWIPESTATS_2', 'SWIPESTATS_3', 'SWIPESTATS_4');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cohort_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"data_provider" "DataProvider",
	"gender" "Gender",
	"age_min" integer,
	"age_max" integer,
	"country" text,
	"region" text,
	"type" text DEFAULT 'SYSTEM' NOT NULL,
	"created_by_user_id" text,
	"profile_count" integer DEFAULT 0 NOT NULL,
	"last_computed_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cohort_stats" (
	"id" text PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"period" text DEFAULT 'all-time' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"profile_count" integer NOT NULL,
	"like_rate_p_10" double precision,
	"like_rate_p_25" double precision,
	"like_rate_p_50" double precision,
	"like_rate_p_75" double precision,
	"like_rate_p_90" double precision,
	"like_rate_mean" double precision,
	"match_rate_p_10" double precision,
	"match_rate_p_25" double precision,
	"match_rate_p_50" double precision,
	"match_rate_p_75" double precision,
	"match_rate_p_90" double precision,
	"match_rate_mean" double precision,
	"swipes_per_day_p_10" double precision,
	"swipes_per_day_p_25" double precision,
	"swipes_per_day_p_50" double precision,
	"swipes_per_day_p_75" double precision,
	"swipes_per_day_p_90" double precision,
	"swipes_per_day_mean" double precision,
	"computed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_column_content" (
	"id" text PRIMARY KEY NOT NULL,
	"column_id" text NOT NULL,
	"type" text NOT NULL,
	"attachment_id" text,
	"caption" text,
	"prompt" text,
	"answer" text,
	"order" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comparison_column" (
	"id" text PRIMARY KEY NOT NULL,
	"comparison_id" text NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"order" integer NOT NULL,
	"bio" text,
	"title" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_data" (
	"id" text PRIMARY KEY NOT NULL,
	"messaged" integer,
	"good_conversation" integer,
	"moved_to_a_different_app" integer,
	"phone_numbers_exchanged" integer,
	"date_arranged" integer,
	"date_attended" integer,
	"date_no_show" integer,
	"date_creepy" integer,
	"date_no_spark" integer,
	"only_one_date" integer,
	"one_night_stands" integer,
	"multiple_dates" integer,
	"slept_with_on_first_date" integer,
	"slept_with_eventually" integer,
	"friends_with_benefits" integer,
	"just_friends" integer,
	"relationships_started" integer,
	"cohabitation" integer,
	"married" integer,
	"divorce" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"tinder_profile_id" text,
	"hinge_profile_id" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "dataset_export" (
	"id" text PRIMARY KEY NOT NULL,
	"license_key" text NOT NULL,
	"license_key_id" text,
	"order_id" text,
	"tier" "DatasetTier" NOT NULL,
	"status" "DatasetExportStatus" DEFAULT 'PENDING' NOT NULL,
	"profile_count" integer NOT NULL,
	"recency" text NOT NULL,
	"profile_ids" jsonb DEFAULT '[]'::jsonb,
	"blob_url" text,
	"blob_size" integer,
	"download_count" integer DEFAULT 0 NOT NULL,
	"max_downloads" integer DEFAULT 3 NOT NULL,
	"customer_email" text,
	"expires_at" timestamp,
	"generated_at" timestamp,
	"error_message" text,
	"first_downloaded_at" timestamp,
	"last_downloaded_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "dataset_export_licenseKey_unique" UNIQUE("license_key")
);
--> statement-breakpoint
CREATE TABLE "email_reminder" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"remind_on" timestamp NOT NULL,
	"double_opted_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "EventType" NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"location_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hinge_interaction" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "HingeInteractionType" NOT NULL,
	"timestamp" timestamp NOT NULL,
	"timestamp_raw" text NOT NULL,
	"comment" text,
	"has_comment" boolean NOT NULL,
	"match_id" text,
	"hinge_profile_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hinge_profile" (
	"hinge_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"birth_date" timestamp NOT NULL,
	"age_at_upload" integer NOT NULL,
	"create_date" timestamp NOT NULL,
	"height_centimeters" integer NOT NULL,
	"gender" "Gender" NOT NULL,
	"gender_str" text NOT NULL,
	"gender_identity" text NOT NULL,
	"gender_identity_displayed" boolean NOT NULL,
	"ethnicities" text[],
	"ethnicities_displayed" boolean NOT NULL,
	"religions" text[],
	"religions_displayed" boolean NOT NULL,
	"workplaces" text[],
	"workplaces_displayed" boolean NOT NULL,
	"job_title" text NOT NULL,
	"job_title_displayed" boolean NOT NULL,
	"schools" text[],
	"schools_displayed" boolean NOT NULL,
	"hometowns" text[],
	"hometowns_displayed" boolean NOT NULL,
	"smoking" boolean NOT NULL,
	"smoking_displayed" boolean NOT NULL,
	"drinking" boolean NOT NULL,
	"drinking_displayed" boolean NOT NULL,
	"marijuana" boolean NOT NULL,
	"marijuana_displayed" boolean NOT NULL,
	"drugs" boolean NOT NULL,
	"drugs_displayed" boolean NOT NULL,
	"children" text NOT NULL,
	"children_displayed" boolean NOT NULL,
	"family_plans" text NOT NULL,
	"family_plans_displayed" boolean NOT NULL,
	"education_attained" text NOT NULL,
	"politics" text NOT NULL,
	"politics_displayed" boolean NOT NULL,
	"instagram_displayed" boolean NOT NULL,
	"dating_intention" text NOT NULL,
	"dating_intention_displayed" boolean NOT NULL,
	"languages_spoken" text NOT NULL,
	"languages_spoken_displayed" boolean NOT NULL,
	"relationship_type" text NOT NULL,
	"relationship_type_displayed" boolean NOT NULL,
	"selfie_verified" boolean NOT NULL,
	"distance_miles_max" integer NOT NULL,
	"age_min" integer NOT NULL,
	"age_max" integer NOT NULL,
	"age_dealbreaker" boolean NOT NULL,
	"height_min" integer NOT NULL,
	"height_max" integer NOT NULL,
	"height_dealbreaker" boolean NOT NULL,
	"gender_preference" text NOT NULL,
	"ethnicity_preference" text[],
	"ethnicity_dealbreaker" boolean NOT NULL,
	"religion_preference" text[],
	"religion_dealbreaker" boolean NOT NULL,
	"device_count" integer,
	"device_platforms" text[],
	"device_os_versions" text[],
	"app_versions" text[],
	"country" text,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "hinge_prompt" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"answer_text" text,
	"answer_options" text,
	"created_prompt_at" timestamp NOT NULL,
	"updated_prompt_at" timestamp NOT NULL,
	"hinge_profile_id" text
);
--> statement-breakpoint
CREATE TABLE "job" (
	"job_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"title_displayed" boolean NOT NULL,
	"company" text,
	"company_displayed" boolean,
	"tinder_profile_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"country" text NOT NULL,
	"country_short" text NOT NULL,
	"admin_area1" text NOT NULL,
	"admin_area1_short" text NOT NULL,
	"admin_area2" text NOT NULL,
	"cbsa" text NOT NULL,
	"locality" text NOT NULL,
	"sublocality" text NOT NULL,
	"neighborhood" text NOT NULL,
	"postal_code" text NOT NULL,
	"postal_suffix" text NOT NULL,
	"location_source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"total_message_count" integer NOT NULL,
	"text_count" integer NOT NULL,
	"gif_count" integer NOT NULL,
	"gesture_count" integer NOT NULL,
	"other_message_type_count" integer NOT NULL,
	"primary_language" text,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"initial_message_at" timestamp,
	"last_message_at" timestamp,
	"engagement_score" integer,
	"response_time_median_seconds" integer,
	"conversation_duration_days" integer,
	"message_imbalance_ratio" double precision,
	"longest_gap_hours" integer,
	"did_match_reply" boolean,
	"last_message_from" text,
	"tinder_match_id" text,
	"tinder_profile_id" text,
	"we_met" jsonb,
	"like" jsonb,
	"match" jsonb,
	"liked_at" timestamp,
	"matched_at" timestamp,
	"hinge_profile_id" text
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"prompt" text,
	"caption" text,
	"url" text NOT NULL,
	"from_so_me" boolean,
	"hinge_profile_id" text,
	"tinder_profile_id" text
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"to" integer NOT NULL,
	"sent_date" timestamp NOT NULL,
	"sent_date_raw" text NOT NULL,
	"content_raw" text NOT NULL,
	"content" text NOT NULL,
	"char_count" integer NOT NULL,
	"message_type" "MessageType" NOT NULL,
	"type" text,
	"gif_url" text,
	"order" integer NOT NULL,
	"language" text,
	"time_since_last_message_relative" text,
	"emotion_score" integer,
	"match_id" text NOT NULL,
	"tinder_profile_id" text,
	"hinge_profile_id" text,
	"content_sanitized" text,
	"time_since_last_message" integer
);
--> statement-breakpoint
CREATE TABLE "newsletter" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_hash" text NOT NULL,
	"three_day_reminder" boolean NOT NULL,
	"double_opt_in_confirmation" boolean DEFAULT false NOT NULL,
	"global_unsubscribe" boolean DEFAULT false NOT NULL,
	"receive_dating_tips" boolean DEFAULT true NOT NULL,
	"receive_product_updates" boolean DEFAULT true NOT NULL,
	"receive_research_news" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "original_anonymized_file" (
	"id" text PRIMARY KEY NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"swipestats_version" "SwipestatsVersion" NOT NULL,
	"file" jsonb,
	"blob_url" text,
	"user_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile_comparison_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text,
	"column_id" text,
	"author_id" text NOT NULL,
	"actor_type" text DEFAULT 'user' NOT NULL,
	"rating" integer,
	"body" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "profile_comparison" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"profile_name" text,
	"default_bio" text,
	"age" integer,
	"city" text,
	"state" text,
	"country" text,
	"hometown" text,
	"nationality" text,
	"height_cm" integer,
	"education_level" "EducationLevel",
	"is_public" boolean DEFAULT false NOT NULL,
	"share_key" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "profile_comparison_shareKey_unique" UNIQUE("share_key")
);
--> statement-breakpoint
CREATE TABLE "profile_meta" (
	"id" text PRIMARY KEY NOT NULL,
	"tinder_profile_id" text,
	"hinge_profile_id" text,
	"from" timestamp NOT NULL,
	"to" timestamp NOT NULL,
	"days_in_period" integer NOT NULL,
	"days_active" integer NOT NULL,
	"swipe_likes_total" integer NOT NULL,
	"swipe_passes_total" integer NOT NULL,
	"matches_total" integer NOT NULL,
	"messages_sent_total" integer NOT NULL,
	"messages_received_total" integer NOT NULL,
	"app_opens_total" integer NOT NULL,
	"like_rate" double precision NOT NULL,
	"match_rate" double precision NOT NULL,
	"swipes_per_day" double precision NOT NULL,
	"conversation_count" integer NOT NULL,
	"conversations_with_messages" integer NOT NULL,
	"ghosted_count" integer NOT NULL,
	"average_response_time_seconds" integer,
	"mean_response_time_seconds" integer,
	"median_conversation_duration_days" integer,
	"longest_conversation_days" integer,
	"average_messages_per_conversation" double precision,
	"median_messages_per_conversation" integer,
	"computed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tinder_profile_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school" (
	"school_id" text PRIMARY KEY NOT NULL,
	"id" text,
	"displayed" boolean NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"year" text,
	"metadata_id" text,
	"tinder_profile_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequence" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"opened" timestamp,
	"clicked" timestamp,
	"created_at" timestamp NOT NULL,
	"newsletter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tinder_profile" (
	"computed" boolean DEFAULT false NOT NULL,
	"tinder_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"birth_date" timestamp NOT NULL,
	"age_at_upload" integer NOT NULL,
	"age_at_last_usage" integer NOT NULL,
	"create_date" timestamp NOT NULL,
	"active_time" timestamp,
	"gender" "Gender" NOT NULL,
	"gender_str" text NOT NULL,
	"bio" text,
	"bio_original" text,
	"city" text,
	"country" text,
	"region" text,
	"user_interests" jsonb,
	"interests" jsonb,
	"sexual_orientations" jsonb,
	"descriptors" jsonb,
	"instagram_connected" boolean NOT NULL,
	"spotify_connected" boolean NOT NULL,
	"job_title" text,
	"job_title_displayed" boolean,
	"company" text,
	"company_displayed" boolean,
	"school" text,
	"school_displayed" boolean,
	"college" jsonb,
	"jobs_raw" jsonb,
	"schools_raw" jsonb,
	"education_level" text,
	"age_filter_min" integer NOT NULL,
	"age_filter_max" integer NOT NULL,
	"interested_in" "Gender" NOT NULL,
	"interested_in_str" text NOT NULL,
	"gender_filter" "Gender" NOT NULL,
	"gender_filter_str" text NOT NULL,
	"swipestats_version" "SwipestatsVersion" NOT NULL,
	"user_id" text,
	"first_day_on_app" timestamp NOT NULL,
	"last_day_on_app" timestamp NOT NULL,
	"days_in_profile_period" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tinder_usage" (
	"date_stamp" timestamp NOT NULL,
	"date_stamp_raw" text NOT NULL,
	"tinder_profile_id" text NOT NULL,
	"app_opens" integer NOT NULL,
	"matches" integer NOT NULL,
	"swipe_likes" integer NOT NULL,
	"swipe_super_likes" integer NOT NULL,
	"swipe_passes" integer NOT NULL,
	"swipes_combined" integer NOT NULL,
	"messages_received" integer NOT NULL,
	"messages_sent" integer NOT NULL,
	"match_rate" double precision NOT NULL,
	"like_rate" double precision NOT NULL,
	"messages_sent_rate" double precision NOT NULL,
	"response_rate" double precision NOT NULL,
	"engagement_rate" double precision NOT NULL,
	"user_age_this_day" integer NOT NULL,
	CONSTRAINT "tinder_usage_date_stamp_raw_tinder_profile_id_pk" PRIMARY KEY("date_stamp_raw","tinder_profile_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"is_anonymous" boolean DEFAULT false,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"active_on_tinder" boolean DEFAULT false NOT NULL,
	"active_on_hinge" boolean DEFAULT false NOT NULL,
	"active_on_bumble" boolean DEFAULT false NOT NULL,
	"active_on_happn" boolean DEFAULT false NOT NULL,
	"active_on_other" boolean DEFAULT false NOT NULL,
	"other_dating_apps" text[],
	"current_hotness" integer,
	"current_happiness" integer,
	"time_zone" text,
	"city" text,
	"country" text,
	"region" text,
	"continent" text,
	"first_started_with_dating_apps" timestamp,
	"happiness_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hotness_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"past_dating_apps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relationship_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"swipestats_tier" "SwipestatsTier" DEFAULT 'FREE' NOT NULL,
	"subscription_provider_id" text,
	"subscription_current_period_end" timestamp,
	"is_lifetime" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_definition" ADD CONSTRAINT "cohort_definition_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_stats" ADD CONSTRAINT "cohort_stats_cohort_id_cohort_definition_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohort_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_column_content" ADD CONSTRAINT "comparison_column_content_column_id_comparison_column_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."comparison_column"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_column_content" ADD CONSTRAINT "comparison_column_content_attachment_id_attachment_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."attachment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comparison_column" ADD CONSTRAINT "comparison_column_comparison_id_profile_comparison_id_fk" FOREIGN KEY ("comparison_id") REFERENCES "public"."profile_comparison"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_data" ADD CONSTRAINT "custom_data_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_data" ADD CONSTRAINT "custom_data_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_data" ADD CONSTRAINT "custom_data_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hinge_interaction" ADD CONSTRAINT "hinge_interaction_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hinge_interaction" ADD CONSTRAINT "hinge_interaction_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hinge_profile" ADD CONSTRAINT "hinge_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hinge_prompt" ADD CONSTRAINT "hinge_prompt_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "original_anonymized_file" ADD CONSTRAINT "original_anonymized_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_comparison_feedback" ADD CONSTRAINT "profile_comparison_feedback_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_comparison_feedback" ADD CONSTRAINT "pcf_content_fk" FOREIGN KEY ("content_id") REFERENCES "public"."comparison_column_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_comparison_feedback" ADD CONSTRAINT "pcf_column_fk" FOREIGN KEY ("column_id") REFERENCES "public"."comparison_column"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_comparison" ADD CONSTRAINT "profile_comparison_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_meta" ADD CONSTRAINT "profile_meta_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_meta" ADD CONSTRAINT "profile_meta_hinge_profile_id_hinge_profile_hinge_id_fk" FOREIGN KEY ("hinge_profile_id") REFERENCES "public"."hinge_profile"("hinge_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school" ADD CONSTRAINT "school_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence" ADD CONSTRAINT "sequence_newsletter_id_newsletter_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletter"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tinder_profile" ADD CONSTRAINT "tinder_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tinder_usage" ADD CONSTRAINT "tinder_usage_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attachment_resource_idx" ON "attachment" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "attachment_uploaded_by_idx" ON "attachment" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "attachment_mime_type_idx" ON "attachment" USING btree ("mime_type");--> statement-breakpoint
CREATE UNIQUE INDEX "cohort_period_idx" ON "cohort_stats" USING btree ("cohort_id","period");--> statement-breakpoint
CREATE INDEX "comparison_column_content_column_id_idx" ON "comparison_column_content" USING btree ("column_id");--> statement-breakpoint
CREATE INDEX "comparison_column_content_attachment_id_idx" ON "comparison_column_content" USING btree ("attachment_id");--> statement-breakpoint
CREATE INDEX "comparison_column_content_type_idx" ON "comparison_column_content" USING btree ("type");--> statement-breakpoint
CREATE INDEX "comparison_column_comparison_id_idx" ON "comparison_column" USING btree ("comparison_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hinge_profile_user_id_unique" ON "hinge_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "match_tinder_profile_id_idx" ON "match" USING btree ("tinder_profile_id");--> statement-breakpoint
CREATE INDEX "match_hinge_profile_id_idx" ON "match" USING btree ("hinge_profile_id");--> statement-breakpoint
CREATE INDEX "media_tinder_profile_id_idx" ON "media" USING btree ("tinder_profile_id");--> statement-breakpoint
CREATE INDEX "media_hinge_profile_id_idx" ON "media" USING btree ("hinge_profile_id");--> statement-breakpoint
CREATE INDEX "message_match_id_idx" ON "message" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "message_tinder_profile_id_idx" ON "message" USING btree ("tinder_profile_id");--> statement-breakpoint
CREATE INDEX "message_hinge_profile_id_idx" ON "message" USING btree ("hinge_profile_id");--> statement-breakpoint
CREATE INDEX "post_created_by_idx" ON "post" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "post_name_idx" ON "post" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pcf_content_id_idx" ON "profile_comparison_feedback" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "pcf_column_id_idx" ON "profile_comparison_feedback" USING btree ("column_id");--> statement-breakpoint
CREATE INDEX "pcf_author_id_idx" ON "profile_comparison_feedback" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "pcf_created_at_idx" ON "profile_comparison_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "profile_comparison_user_id_idx" ON "profile_comparison" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profile_comparison_share_key_idx" ON "profile_comparison" USING btree ("share_key");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tinder_profile_user_id_unique" ON "tinder_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tinder_usage_tinder_profile_id_idx" ON "tinder_usage" USING btree ("tinder_profile_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");