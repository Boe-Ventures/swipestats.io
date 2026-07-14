CREATE TABLE "swipe_rank_publication_event" (
	"id" text PRIMARY KEY NOT NULL,
	"publication_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"consent_version" integer NOT NULL,
	"explicit_consent_received" boolean DEFAULT false NOT NULL,
	"preferences" jsonb NOT NULL,
	"occurred_at" timestamp NOT NULL,
	CONSTRAINT "swipe_rank_publication_event_type" CHECK ("swipe_rank_publication_event"."event_type" IN ('PUBLISHED', 'CONSENT_RENEWED', 'SETTINGS_UPDATED', 'REVOKED')),
	CONSTRAINT "swipe_rank_publication_event_consent_version" CHECK ("swipe_rank_publication_event"."consent_version" > 0),
	CONSTRAINT "swipe_rank_publication_event_explicit_consent" CHECK ("swipe_rank_publication_event"."explicit_consent_received" = ("swipe_rank_publication_event"."event_type" IN ('PUBLISHED', 'CONSENT_RENEWED'))),
	CONSTRAINT "swipe_rank_publication_event_preferences" CHECK (jsonb_typeof("swipe_rank_publication_event"."preferences") = 'object')
);
--> statement-breakpoint
ALTER TABLE "swipe_rank_entry" ALTER COLUMN "profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "swipe_rank_build" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "swipe_rank_build" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "swipe_rank_publication_event" ADD CONSTRAINT "swipe_rank_publication_event_publication_id_swipe_rank_publication_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."swipe_rank_publication"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_publication_event" ADD CONSTRAINT "swipe_rank_publication_event_profile_id_swipe_rank_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."swipe_rank_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_rank_publication_event" ADD CONSTRAINT "swipe_rank_publication_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "swipe_rank_publication_event_publication_idx" ON "swipe_rank_publication_event" USING btree ("publication_id","occurred_at");--> statement-breakpoint
CREATE INDEX "swipe_rank_publication_event_user_idx" ON "swipe_rank_publication_event" USING btree ("user_id","occurred_at");--> statement-breakpoint
ALTER TABLE "swipe_rank_build" DROP COLUMN "error";--> statement-breakpoint
ALTER TABLE "swipe_rank_build" ADD CONSTRAINT "swipe_rank_build_activation_state" CHECK ("swipe_rank_build"."activated_at" IS NULL OR ("swipe_rank_build"."scope" = 'FULL' AND "swipe_rank_build"."status" = 'COMPLETE' AND "swipe_rank_build"."completed_at" IS NOT NULL));