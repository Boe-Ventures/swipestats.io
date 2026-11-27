# Love Stories capture from an assistant

Connect to `https://www.swipestats.io/api/mcp`. New OAuth connections request
one `swipestats:all` account grant covering the exposed analytics and Love Stories
tools. There is no separate Love Stories permission choice or per-save approval
flow in SwipeStats. The client still controls its own tool confirmations.
Existing analytics-only connections stay read-only until reconnected with the
new grant. Personal API keys retain their selected read/write permissions.

## Capture contract

The assistant listens to the account, finds or creates the relevant person,
saves encounters when identifiable, and saves a detailed journal summary linked
to those records. Preserve concrete details, feelings, changes of perspective
and uncertainty so future fields can be reconstructed from the narrative.
Do not invent dates, intentions or ratings. Verbatim transcripts are optional.

Use `createLoveStoryEntry` with `sourceKind: "summary"` for the narrative.
The submitted summary is the durable source; `originalBody` preserves its first
version when the entry is edited. It does not imply that audio or a verbatim
transcript was captured. Once capture is requested, save directly and briefly
report success. Do not require a review screen or an ingestion-session workflow.

`listLoveStoryPeople` accepts an optional `query` matching names and aliases.
Its result includes aliases, location context, first-meeting year and current
version. `getLoveStoryPerson` reads full details before updates. Keep reads
paginated and mutations singular so the assistant can compose its own workflow.

## Merging duplicate people

`mergeLoveStoryPeople` takes `keep` and `merge`, each with an ID and current
version. The kept person's populated fields win; empty fields are filled from
the duplicate. Names become aliases. Encounters move to the kept person in their
existing order, appended after that person's encounters. Use the existing
reorder tool if the combined timeline needs a different order. Relative-date
references and journal links remain valid. The duplicate's narrative notes are
retained in a linked journal entry before its person row is removed.

Merges are atomic and owner-scoped. Stale versions fail before any data changes.
Read the latest records, then apply the user's same winner choice. If a response
is interrupted, check whether the duplicate still exists before retrying.

## Verification

`bun run test:love-stories:postgres` starts an isolated loopback PostgreSQL
cluster, applies the real migrations and uses fictional users. It checks merge
ownership, stale writes, rollback, linked-record preservation and the actual
OAuth registration, consent, PKCE, MCP write, refresh and revocation handlers.
It does not connect to a shared database or test Dot/Muse's voice interface.
