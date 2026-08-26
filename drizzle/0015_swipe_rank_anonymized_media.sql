ALTER TABLE "media" ADD COLUMN "swipe_rank_anonymized_url" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "swipe_rank_anonymized_at" timestamp;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "swipe_rank_anonymization_model" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "swipe_rank_anonymized_face_count" integer;