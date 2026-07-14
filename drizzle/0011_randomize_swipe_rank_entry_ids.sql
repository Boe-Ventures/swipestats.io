-- Snapshot entry identifiers must not be derivable from a Tinder/profile ID.
-- No table references swipe_rank_entry.id, so existing editions can be
-- re-keyed without changing their rank, field size, or metric values.
UPDATE "swipe_rank_entry"
SET "id" = 'sre_' || replace(gen_random_uuid()::text, '-', '');
