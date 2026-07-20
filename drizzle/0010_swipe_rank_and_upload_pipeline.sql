CREATE TYPE "public"."SwipeRankBuildScope" AS ENUM('FULL', 'PROFILE');--> statement-breakpoint
CREATE TYPE "public"."SwipeRankBuildStatus" AS ENUM('RUNNING', 'COMPLETE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."SwipeRankPeriodKind" AS ENUM('MONTH', 'QUARTER', 'YEAR', 'ALL_TIME');--> statement-breakpoint
CREATE TYPE "public"."SwipeRankSnapshotStatus" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."TransientUploadStatus" AS ENUM('ISSUED', 'UPLOADED', 'PROCESSING', 'COMMITTED', 'CLEANED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "swipe_rank_build" (
	"id" text PRIMARY KEY NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"metric_version" text NOT NULL,
	"scope" "SwipeRankBuildScope" NOT NULL,
	"status" "SwipeRankBuildStatus" DEFAULT 'RUNNING' NOT NULL,
	"source_watermark" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"activated_at" timestamp,
	"failure_code" text,
	CONSTRAINT "swipe_rank_build_completion_state" CHECK (("swipe_rank_build"."status" = 'RUNNING' AND "swipe_rank_build"."completed_at" IS NULL) OR ("swipe_rank_build"."status" <> 'RUNNING' AND "swipe_rank_build"."completed_at" IS NOT NULL)),
	CONSTRAINT "swipe_rank_build_activation_state" CHECK ("swipe_rank_build"."activated_at" IS NULL OR ("swipe_rank_build"."scope" = 'FULL' AND "swipe_rank_build"."status" = 'COMPLETE' AND "swipe_rank_build"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "swipe_rank_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"rank" integer NOT NULL,
	"tie_count" integer NOT NULL,
	"field_size" integer NOT NULL,
	"percentile" double precision NOT NULL,
	"top_share" double precision NOT NULL,
	"metric_numerator" bigint NOT NULL,
	"metric_denominator" bigint NOT NULL,
	"metric_value" double precision NOT NULL,
	"quality_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "swipe_rank_entry_rank_bounds" CHECK ("swipe_rank_entry"."rank" > 0 AND "swipe_rank_entry"."tie_count" > 0 AND "swipe_rank_entry"."field_size" > 0 AND "swipe_rank_entry"."rank" <= "swipe_rank_entry"."field_size" AND "swipe_rank_entry"."tie_count" <= "swipe_rank_entry"."field_size"),
	CONSTRAINT "swipe_rank_entry_rate_bounds" CHECK ("swipe_rank_entry"."metric_numerator" >= 0 AND "swipe_rank_entry"."metric_denominator" > 0 AND "swipe_rank_entry"."metric_value" >= 0 AND "swipe_rank_entry"."percentile" >= 0 AND "swipe_rank_entry"."percentile" <= 100 AND "swipe_rank_entry"."top_share" >= 0 AND "swipe_rank_entry"."top_share" <= 100)
);
--> statement-breakpoint
CREATE TABLE "swipe_rank_period_fact" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"build_id" text NOT NULL,
	"metric_version" text NOT NULL,
	"period_kind" "SwipeRankPeriodKind" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"observed_first_date" date NOT NULL,
	"observed_last_date" date NOT NULL,
	"source_row_count" bigint NOT NULL,
	"observed_days" integer NOT NULL,
	"active_days" integer NOT NULL,
	"age_in_period" integer,
	"swipe_likes" bigint,
	"swipe_passes" bigint,
	"swipe_super_likes" bigint,
	"matches" bigint,
	"messages_sent" bigint,
	"messages_received" bigint,
	"app_opens" bigint,
	"match_rate_numerator" bigint,
	"match_rate_denominator" bigint,
	"like_rate_numerator" bigint,
	"like_rate_denominator" bigint,
	"match_rate" double precision GENERATED ALWAYS AS (CASE WHEN match_rate_denominator > 0 THEN match_rate_numerator::double precision / match_rate_denominator END) STORED,
	"like_rate" double precision GENERATED ALWAYS AS (CASE WHEN like_rate_denominator > 0 THEN like_rate_numerator::double precision / like_rate_denominator END) STORED,
	"swipes_per_active_day" double precision GENERATED ALWAYS AS (CASE WHEN active_days > 0 AND swipe_likes IS NOT NULL AND swipe_passes IS NOT NULL THEN (swipe_likes + swipe_passes)::double precision / active_days END) STORED,
	"quality_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"has_quality_anomaly" boolean DEFAULT false NOT NULL,
	"source_profile_updated_at" timestamp NOT NULL,
	"source_file_created_at" timestamp,
	"source_fingerprint" text NOT NULL,
	"computed_at" timestamp NOT NULL,
	CONSTRAINT "swipe_rank_fact_period_bounds" CHECK ("swipe_rank_period_fact"."period_start" < "swipe_rank_period_fact"."period_end"),
	CONSTRAINT "swipe_rank_fact_period_alignment" CHECK (("swipe_rank_period_fact"."period_kind" = 'MONTH' AND "swipe_rank_period_fact"."period_start" = date_trunc('month', "swipe_rank_period_fact"."period_start")::date AND "swipe_rank_period_fact"."period_end" = ("swipe_rank_period_fact"."period_start" + interval '1 month')::date) OR ("swipe_rank_period_fact"."period_kind" = 'QUARTER' AND extract(month from "swipe_rank_period_fact"."period_start") IN (1, 4, 7, 10) AND extract(day from "swipe_rank_period_fact"."period_start") = 1 AND "swipe_rank_period_fact"."period_end" = ("swipe_rank_period_fact"."period_start" + interval '3 months')::date) OR ("swipe_rank_period_fact"."period_kind" = 'YEAR' AND extract(month from "swipe_rank_period_fact"."period_start") = 1 AND extract(day from "swipe_rank_period_fact"."period_start") = 1 AND "swipe_rank_period_fact"."period_end" = ("swipe_rank_period_fact"."period_start" + interval '1 year')::date) OR ("swipe_rank_period_fact"."period_kind" = 'ALL_TIME' AND "swipe_rank_period_fact"."period_start" = date '0001-01-01' AND "swipe_rank_period_fact"."period_end" = date '9999-01-01')),
	CONSTRAINT "swipe_rank_fact_observed_bounds" CHECK ("swipe_rank_period_fact"."observed_first_date" <= "swipe_rank_period_fact"."observed_last_date" AND "swipe_rank_period_fact"."observed_first_date" >= "swipe_rank_period_fact"."period_start" AND "swipe_rank_period_fact"."observed_last_date" < "swipe_rank_period_fact"."period_end"),
	CONSTRAINT "swipe_rank_fact_day_counts" CHECK ("swipe_rank_period_fact"."source_row_count" > 0 AND "swipe_rank_period_fact"."observed_days" > 0 AND "swipe_rank_period_fact"."active_days" >= 0 AND "swipe_rank_period_fact"."active_days" <= "swipe_rank_period_fact"."observed_days"),
	CONSTRAINT "swipe_rank_fact_nonnegative_metrics" CHECK (coalesce("swipe_rank_period_fact"."swipe_likes", 0) >= 0 AND coalesce("swipe_rank_period_fact"."swipe_passes", 0) >= 0 AND coalesce("swipe_rank_period_fact"."swipe_super_likes", 0) >= 0 AND coalesce("swipe_rank_period_fact"."matches", 0) >= 0 AND coalesce("swipe_rank_period_fact"."messages_sent", 0) >= 0 AND coalesce("swipe_rank_period_fact"."messages_received", 0) >= 0 AND coalesce("swipe_rank_period_fact"."app_opens", 0) >= 0 AND coalesce("swipe_rank_period_fact"."match_rate_numerator", 0) >= 0 AND coalesce("swipe_rank_period_fact"."match_rate_denominator", 0) >= 0 AND coalesce("swipe_rank_period_fact"."like_rate_numerator", 0) >= 0 AND coalesce("swipe_rank_period_fact"."like_rate_denominator", 0) >= 0),
	CONSTRAINT "swipe_rank_fact_rate_inputs" CHECK (("swipe_rank_period_fact"."match_rate_numerator" IS NULL) = ("swipe_rank_period_fact"."match_rate_denominator" IS NULL) AND ("swipe_rank_period_fact"."like_rate_numerator" IS NULL) = ("swipe_rank_period_fact"."like_rate_denominator" IS NULL)),
	CONSTRAINT "swipe_rank_fact_quality_state" CHECK ("swipe_rank_period_fact"."has_quality_anomaly" = (jsonb_array_length("swipe_rank_period_fact"."quality_flags") > 0))
);
--> statement-breakpoint
CREATE TABLE "swipe_rank_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"provider_profile_id" text NOT NULL,
	"user_id" text,
	"gender" "Gender",
	"interested_in" "Gender",
	"city" text,
	"region" text,
	"country" text,
	"location_source" text,
	"is_synthetic" boolean DEFAULT false NOT NULL,
	"is_swipe_rank_excluded" boolean DEFAULT false NOT NULL,
	"swipe_rank_exclusion_reason" text,
	"swipe_rank_excluded_at" timestamp,
	"swipe_rank_excluded_by" text,
	"capabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_profile_updated_at" timestamp NOT NULL,
	"source_file_created_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "swipe_rank_profile_exclusion_state" CHECK ((
        "swipe_rank_profile"."is_swipe_rank_excluded" = false
        AND "swipe_rank_profile"."swipe_rank_exclusion_reason" IS NULL
        AND "swipe_rank_profile"."swipe_rank_excluded_at" IS NULL
        AND "swipe_rank_profile"."swipe_rank_excluded_by" IS NULL
      ) OR (
        "swipe_rank_profile"."is_swipe_rank_excluded" = true
        AND nullif(btrim("swipe_rank_profile"."swipe_rank_exclusion_reason"), '') IS NOT NULL
        AND "swipe_rank_profile"."swipe_rank_excluded_at" IS NOT NULL
        AND nullif(btrim("swipe_rank_profile"."swipe_rank_excluded_by"), '') IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "swipe_rank_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"build_id" text NOT NULL,
	"metric_key" text NOT NULL,
	"metric_version" text NOT NULL,
	"eligibility_version" text NOT NULL,
	"period_kind" "SwipeRankPeriodKind" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"cohort_spec" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cohort_hash" text NOT NULL,
	"minimum_rate_denominator" integer DEFAULT 0 NOT NULL,
	"minimum_active_days" integer DEFAULT 0 NOT NULL,
	"field_size" integer NOT NULL,
	"status" "SwipeRankSnapshotStatus" DEFAULT 'DRAFT' NOT NULL,
	"source_cutoff" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "swipe_rank_snapshot_period_bounds" CHECK ("swipe_rank_snapshot"."period_start" < "swipe_rank_snapshot"."period_end"),
	CONSTRAINT "swipe_rank_snapshot_period_alignment" CHECK (("swipe_rank_snapshot"."period_kind" = 'MONTH' AND "swipe_rank_snapshot"."period_start" = date_trunc('month', "swipe_rank_snapshot"."period_start")::date AND "swipe_rank_snapshot"."period_end" = ("swipe_rank_snapshot"."period_start" + interval '1 month')::date) OR ("swipe_rank_snapshot"."period_kind" = 'QUARTER' AND extract(month from "swipe_rank_snapshot"."period_start") IN (1, 4, 7, 10) AND extract(day from "swipe_rank_snapshot"."period_start") = 1 AND "swipe_rank_snapshot"."period_end" = ("swipe_rank_snapshot"."period_start" + interval '3 months')::date) OR ("swipe_rank_snapshot"."period_kind" = 'YEAR' AND extract(month from "swipe_rank_snapshot"."period_start") = 1 AND extract(day from "swipe_rank_snapshot"."period_start") = 1 AND "swipe_rank_snapshot"."period_end" = ("swipe_rank_snapshot"."period_start" + interval '1 year')::date) OR ("swipe_rank_snapshot"."period_kind" = 'ALL_TIME' AND "swipe_rank_snapshot"."period_start" = date '0001-01-01' AND "swipe_rank_snapshot"."period_end" = date '9999-01-01')),
	CONSTRAINT "swipe_rank_snapshot_nonnegative_thresholds" CHECK ("swipe_rank_snapshot"."minimum_rate_denominator" >= 0 AND "swipe_rank_snapshot"."minimum_active_days" >= 0 AND "swipe_rank_snapshot"."field_size" >= 0),
	CONSTRAINT "swipe_rank_snapshot_publication_state" CHECK (("swipe_rank_snapshot"."status" = 'PUBLISHED' AND "swipe_rank_snapshot"."published_at" IS NOT NULL) OR ("swipe_rank_snapshot"."status" <> 'PUBLISHED'))
);
--> statement-breakpoint
CREATE TABLE "swipe_rank_source_mutation" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"data_provider" "DataProvider" NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "hinge_prompt" ALTER COLUMN "prompt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hinge_profile" ADD COLUMN "first_account_create_date" timestamp;--> statement-breakpoint
ALTER TABLE "hinge_profile" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "hinge_prompt" ADD COLUMN "provider_prompt_id" integer;--> statement-breakpoint
ALTER TABLE "tinder_profile" ADD COLUMN "create_date_source" text;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD CONSTRAINT "swipe_rank_entry_snapshot_id_swipe_rank_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."swipe_rank_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD CONSTRAINT "swipe_rank_entry_profile_id_swipe_rank_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."swipe_rank_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_period_fact" ADD CONSTRAINT "swipe_rank_period_fact_profile_id_swipe_rank_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."swipe_rank_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_period_fact" ADD CONSTRAINT "swipe_rank_period_fact_build_id_swipe_rank_build_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."swipe_rank_build"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_profile" ADD CONSTRAINT "swipe_rank_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_snapshot" ADD CONSTRAINT "swipe_rank_snapshot_build_id_swipe_rank_build_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."swipe_rank_build"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transient_upload" ADD CONSTRAINT "transient_upload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "swipe_rank_build_provider_version_idx" ON "swipe_rank_build" USING btree ("data_provider","metric_version","started_at");--> statement-breakpoint
CREATE INDEX "swipe_rank_build_status_idx" ON "swipe_rank_build" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "swipe_rank_entry_snapshot_profile_idx" ON "swipe_rank_entry" USING btree ("snapshot_id","profile_id");--> statement-breakpoint
CREATE INDEX "swipe_rank_entry_snapshot_rank_idx" ON "swipe_rank_entry" USING btree ("snapshot_id","rank");--> statement-breakpoint
CREATE UNIQUE INDEX "swipe_rank_fact_profile_period_version_idx" ON "swipe_rank_period_fact" USING btree ("profile_id","period_kind","period_start","metric_version");--> statement-breakpoint
CREATE INDEX "swipe_rank_fact_period_rank_idx" ON "swipe_rank_period_fact" USING btree ("period_kind","period_start","metric_version","match_rate");--> statement-breakpoint
CREATE INDEX "swipe_rank_fact_profile_version_idx" ON "swipe_rank_period_fact" USING btree ("profile_id","metric_version","period_kind","period_start");--> statement-breakpoint
CREATE INDEX "swipe_rank_fact_build_idx" ON "swipe_rank_period_fact" USING btree ("build_id");--> statement-breakpoint
CREATE INDEX "swipe_rank_fact_anomaly_idx" ON "swipe_rank_period_fact" USING btree ("has_quality_anomaly","period_kind","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "swipe_rank_profile_provider_profile_idx" ON "swipe_rank_profile" USING btree ("data_provider","provider_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "swipe_rank_profile_provider_user_idx" ON "swipe_rank_profile" USING btree ("data_provider","user_id");--> statement-breakpoint
CREATE INDEX "swipe_rank_profile_dimensions_idx" ON "swipe_rank_profile" USING btree ("data_provider","gender","interested_in");--> statement-breakpoint
CREATE INDEX "swipe_rank_profile_country_idx" ON "swipe_rank_profile" USING btree ("data_provider","country");--> statement-breakpoint
CREATE INDEX "swipe_rank_profile_exclusion_idx" ON "swipe_rank_profile" USING btree ("data_provider","is_swipe_rank_excluded");--> statement-breakpoint
CREATE UNIQUE INDEX "swipe_rank_snapshot_edition_idx" ON "swipe_rank_snapshot" USING btree ("data_provider","metric_key","metric_version","eligibility_version","period_kind","period_start","cohort_hash","build_id");--> statement-breakpoint
CREATE INDEX "swipe_rank_snapshot_status_idx" ON "swipe_rank_snapshot" USING btree ("status","period_kind","period_start");--> statement-breakpoint
CREATE INDEX "swipe_rank_source_mutation_provider_idx" ON "swipe_rank_source_mutation" USING btree ("data_provider","id");--> statement-breakpoint
CREATE INDEX "transient_upload_owner_idx" ON "transient_upload" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "transient_upload_expiry_idx" ON "transient_upload" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transient_upload_binding_idx" ON "transient_upload" USING btree ("user_id","session_id","data_provider","profile_id","expected_pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_meta_tinder_profile_id_unique" ON "profile_meta" USING btree ("tinder_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_meta_hinge_profile_id_unique" ON "profile_meta" USING btree ("hinge_profile_id");--> statement-breakpoint
ALTER TABLE "hinge_profile" ADD CONSTRAINT "hinge_profile_account_signup_order" CHECK ("hinge_profile"."first_account_create_date" IS NULL OR "hinge_profile"."first_account_create_date" <= "hinge_profile"."create_date");--> statement-breakpoint
ALTER TABLE "profile_meta" ADD CONSTRAINT "profile_meta_exactly_one_provider" CHECK (num_nonnulls("profile_meta"."tinder_profile_id", "profile_meta"."hinge_profile_id") = 1);--> statement-breakpoint
ALTER TABLE "profile_meta" ADD CONSTRAINT "profile_meta_period_bounds" CHECK ("profile_meta"."from" <= "profile_meta"."to" AND "profile_meta"."days_in_period" >= 1 AND "profile_meta"."days_active" >= 0 AND "profile_meta"."days_active" <= "profile_meta"."days_in_period");--> statement-breakpoint
ALTER TABLE "profile_meta" ADD CONSTRAINT "profile_meta_nonnegative_core_metrics" CHECK ("profile_meta"."swipe_likes_total" >= 0 AND "profile_meta"."swipe_passes_total" >= 0 AND "profile_meta"."matches_total" >= 0 AND "profile_meta"."messages_sent_total" >= 0 AND "profile_meta"."messages_received_total" >= 0 AND "profile_meta"."app_opens_total" >= 0 AND "profile_meta"."like_rate" >= 0 AND "profile_meta"."like_rate" <= 1 AND "profile_meta"."match_rate" >= 0 AND "profile_meta"."swipes_per_day" >= 0);--> statement-breakpoint
ALTER TABLE "profile_meta" ADD CONSTRAINT "profile_meta_conversation_counts" CHECK ("profile_meta"."conversation_count" >= 0 AND "profile_meta"."conversations_with_messages" >= 0 AND "profile_meta"."conversations_with_messages" <= "profile_meta"."conversation_count" AND "profile_meta"."ghosted_count" = "profile_meta"."conversation_count" - "profile_meta"."conversations_with_messages");--> statement-breakpoint
ALTER TABLE "profile_meta" ADD CONSTRAINT "profile_meta_nonnegative_conversation_metrics" CHECK (("profile_meta"."average_response_time_seconds" IS NULL OR "profile_meta"."average_response_time_seconds" >= 0) AND ("profile_meta"."mean_response_time_seconds" IS NULL OR "profile_meta"."mean_response_time_seconds" >= 0) AND ("profile_meta"."median_conversation_duration_days" IS NULL OR "profile_meta"."median_conversation_duration_days" >= 0) AND ("profile_meta"."longest_conversation_days" IS NULL OR "profile_meta"."longest_conversation_days" >= 0) AND ("profile_meta"."average_messages_per_conversation" IS NULL OR "profile_meta"."average_messages_per_conversation" >= 0) AND ("profile_meta"."median_messages_per_conversation" IS NULL OR "profile_meta"."median_messages_per_conversation" >= 0));--> statement-breakpoint
ALTER TABLE "tinder_profile" ADD CONSTRAINT "tinder_profile_create_date_source" CHECK ("tinder_profile"."create_date_source" IS NULL OR "tinder_profile"."create_date_source" IN ('PROVIDER', 'INFERRED_FROM_USAGE'));