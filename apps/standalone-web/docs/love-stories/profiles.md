# Love Stories profiles

`love_self_profile` has one private row per account, keyed by `user_id`.
Authentication, billing and account preferences remain on the user account.
Tinder and Hinge imports remain independent source records. There is no automatic
copying or synchronization between imported profiles and this diary profile.

Self profiles and love interests share the `profileFields` contract:

| Meaning               | Shape                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| Where someone is from | Optional primary country, additional country codes and hometown           |
| Nationality           | Multiple country codes, with no primary ordering                          |
| Where someone lives   | Current country and city; optional residence history                      |
| Background            | Multiple controlled groups, optional detail, source and uncertainty notes |
| Eye color             | One optional value plus notes                                             |
| Other appearance      | Optional height and free text                                             |

Country codes use uppercase two-letter codes. Additional origins cannot repeat
the primary origin. Unknown values remain null or empty; a meeting location does
not establish origin, nationality or residence. Encounters retain their own
locations and uncertain time context.

Background groups are intentionally broad and may overlap. Multiple selected
groups display as "Multiple backgrounds" with the individual values retained.
Source distinguishes self-description, what someone told the diarist and the
diarist's impression. Do not infer background from names, photos or nationality.

The authenticated MCP inventory contains 23 tools. `getLoveStorySelfProfile`
returns null before the first save. `updateLoveStorySelfProfile` takes `version:
null` to create, or the current positive version to update, plus partial
`changes`. Omitted fields stay unchanged; null clears a field. Neither tool accepts
a target user ID. Existing person create/update tools accept the same shared
fields. Updates with stale versions fail without overwriting newer data.

The workspace exposes these fields under **My profile** and each person's edit
form. Journal exports use schema version 2 and include `selfProfile`. Account
transfer preserves the previous self profile in private journal entries before
filling missing destination values. Background descriptions and their attribution,
and eye colors and their notes, travel together. Account deletion cascades to the
self profile. No profiles are copied between development and production.

Validation: `bun check` and `bun test:love-stories:postgres`. The latter creates a
disposable local PostgreSQL database and exercises the real migrations, ownership,
version conflicts, MCP schemas, merges, export and account transfer/deletion.
