ALTER TABLE "catalog_entry" ADD COLUMN "market_keys" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX "catalog_entry_market_keys_idx" ON "catalog_entry" USING gin ("market_keys");