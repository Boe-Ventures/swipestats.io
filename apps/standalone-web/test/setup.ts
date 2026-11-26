// Unit tests must never inherit credentials for a shared database or provider.
process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.LEMON_SQUEEZY_API_KEY = "test-key";
process.env.SWIPE_RANK_PUBLIC_ID_SECRET =
  "test-only-swipe-rank-public-identity-secret";
