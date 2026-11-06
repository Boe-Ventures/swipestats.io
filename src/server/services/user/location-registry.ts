/** Uses the user row returned by a preceding `updated` CTE, not a stale table snapshot. */
export const locationRegistrySyncCte = `
  synced AS (
    UPDATE swipe_rank_profile registry
    SET city = coalesce(u.city, p.city),
        region = coalesce(u.region, p.region),
        country = coalesce(u.country, p.country),
        location_source = CASE WHEN u.city IS NOT NULL OR u.region IS NOT NULL OR u.country IS NOT NULL
          THEN 'USER_CURRENT_WITH_TINDER_PROFILE_FALLBACK' ELSE 'TINDER_PROFILE' END,
        updated_at = now()
    FROM updated u JOIN tinder_profile p ON p.user_id = u.id
    WHERE registry.data_provider = 'TINDER' AND registry.provider_profile_id = p.tinder_id
    RETURNING registry.id
  )`;
