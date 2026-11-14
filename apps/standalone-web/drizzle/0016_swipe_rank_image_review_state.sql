CREATE TYPE "public"."SwipeRankImageReviewStatus" AS ENUM('APPROVED', 'NEEDS_REVIEW', 'SOURCE_UNAVAILABLE');--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "swipe_rank_image_review_status" "SwipeRankImageReviewStatus";--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "swipe_rank_image_review_note" text;