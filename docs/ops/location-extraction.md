# Location capture and backfill

Tinder and Hinge uploads use the same request-location helper on create,
update, account merge, historical-ID update, legacy routes, and committed
upload retries. Browser timezone is saved even when IP geography is unavailable.
Provider country is preferred; Vercel request geography and browser-country
inference are fallbacks. Known countries are canonicalized to ISO alpha-2.

Automatic capture only fills missing user fields. It does not replace a saved
location with a travel/VPN location or combine conflicting country/city/region
signals. Manual account edits and the account's explicit Detect Location action
can still replace values. Tinder's existing SwipeRank registry descriptors are
updated in the same transaction, under the shared build-policy lock. No facts,
published ranks, or provider profile rows are rewritten by the backfill.

## Run v2 locally

Use the intended `DATABASE_URL` in your environment. Bun also loads the local
repo's environment files, which normally point at shared dev. The script never
fetches or chooses production credentials. Check the database hostname printed
at startup before continuing a run.

Sign into the Codex CLI with ChatGPT. AI mode checks this login and does not use
API-key login. The parent script reads the database and retained exports. The
Codex child receives selected evidence over stdin, an allowlisted OS/auth
environment, and no database/provider keys. Shell, apps, plugins, web search,
and code execution tools are disabled. Inference runs through the signed-in
Codex account, not a local model.

Start with a bounded dry run:

```sh
bun locations:extract --limit 25
```

This writes only private local run files. It prioritizes users missing country
and selects only users with Tinder/Hinge profiles. A user with both providers
is processed once. Post-fill is AI-first: Codex weighs saved profile fields,
bounded export location hints, and recent message samples from both providers
together. Rules do not prefill inferred answers or override the model with a
timezone/region guess. Code validates the structured output, normalizes country
codes, derives continent, and preserves existing user fields when applying.

The goal is useful geography for dating/export analysis, not verification of
present-day residence. Signup country or consistent hometown/phone-country clues
are reasonable country-level fallbacks when stronger evidence is absent.
Recent explicit residence statements take precedence over older origin clues.
Language alone and planned travel do not establish location. City and region
can remain empty even when country is inferred. Not every country has an
applicable subdivision. The upload path remains entirely rules-based.

Useful selections:

```sh
bun locations:extract --no-ai --limit 100
bun locations:extract --provider HINGE --limit 25
bun locations:extract --user-id USER_ID
bun locations:extract --limit 100000 --output-dir temp/location-extraction/all-users
```

`--no-ai` explicitly opts into the older rules-only reconciliation mode.
The default model is `gpt-6.1-sol`; override it with `--model`. New runs default
to 25 candidates, processed sequentially. `--timeout-seconds` bounds each model
call (default 180). This command uses your Codex allowance. For a large run,
interrupt and resume the same run directory to avoid repeating completed calls.

## Resume, inspect, and apply

`run.json` freezes the candidate list and database identity. `results/*.json`
contains each user's proposed missing-field patch; files without a patch are
explicit abstentions. Per-user model outputs and diagnostic logs live under
`codex/`. Run files have private permissions and belong under gitignored `temp/`.
Do not commit or share them: message evidence can contain personal data.

```sh
bun locations:extract --resume temp/location-extraction/RUN
```

Resume reuses completed proposals, retries failed users, and refuses a different
database. It cannot be combined with a different model or candidate selection;
start a new directory for those changes. Older completed proposals also remain
cached; use a new run to regenerate them with the AI-first policy.
Review `summary.json` and the proposed
patches, then apply the saved run:

```sh
bun locations:extract --resume temp/location-extraction/RUN --apply
```

Apply performs no inference. It updates existing user location fields only and
syncs existing Tinder SwipeRank descriptors atomically. It never creates users,
changes ownership, or overwrites populated location fields. The saved location
and owned-profile descriptors must still match the proposal's basis. A final
conditional database update guards concurrent user edits and ownership changes.
Stale proposals are skipped; generate a new run for those users. Reapplying is
safe and does not overwrite changes made after the first apply.

`apply-summary.json` reports actual updates, stale/skipped records, and errors.
Any per-user error produces a nonzero exit status while allowing other users to
finish. Inspect the private logs and resume to retry failures. A missing/deleted
retained export is reported; remaining profile/message evidence is still used.

The old `migrate-extract-locations.ts` command now exits without querying or
writing. No database migration, source/confidence columns, or new verification
workflow is required.
