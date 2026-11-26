ALTER TABLE "swipe_rank_entry" ADD COLUMN "like_rate_numerator" bigint;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD COLUMN "like_rate_denominator" bigint;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD COLUMN "like_rate" double precision;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD COLUMN "swipes_per_active_day" double precision;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD COLUMN "age_in_period" integer;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD COLUMN "active_days" integer;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD COLUMN "observed_days" integer;--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ADD COLUMN "observed_history_days" integer;