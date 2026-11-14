CREATE TABLE "tinder_export_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"tinder_profile_id" text NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"blob_etag" text NOT NULL,
	"content_sha256" text NOT NULL,
	"content_length" bigint NOT NULL,
	"swipestats_version" "SwipestatsVersion" NOT NULL,
	"transport_upload_id" text,
	"accepted_at" timestamp NOT NULL,
	CONSTRAINT "tinder_export_revision_sha256" CHECK ("tinder_export_revision"."content_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "tinder_export_revision_content_length" CHECK ("tinder_export_revision"."content_length" > 0)
);
--> statement-breakpoint
ALTER TABLE "tinder_export_revision" ADD CONSTRAINT "tinder_export_revision_tinder_profile_id_tinder_profile_tinder_id_fk" FOREIGN KEY ("tinder_profile_id") REFERENCES "public"."tinder_profile"("tinder_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tinder_export_revision_profile_accepted_idx" ON "tinder_export_revision" USING btree ("tinder_profile_id","accepted_at");--> statement-breakpoint
CREATE INDEX "tinder_export_revision_digest_idx" ON "tinder_export_revision" USING btree ("tinder_profile_id","content_sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "tinder_export_revision_blob_pathname_unique" ON "tinder_export_revision" USING btree ("blob_pathname");