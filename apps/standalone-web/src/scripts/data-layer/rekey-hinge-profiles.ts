import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import postgres, { type Sql, type TransactionSql } from "postgres";
import { z } from "zod";
import { createSHA256Hash } from "@/lib/utils/hash";
import { resolveHingeUploadTarget } from "@/server/services/hinge/hinge-upload-target";
import { swipeRankBuildLockName } from "@/server/services/swipe-rank/constants";

const rowSchema = z.object({
  oldId: z.string().min(1),
  newId: z.string().regex(/^[a-f0-9]{64}$/),
  ownerId: z.string().nullable(),
  signupTime: z.iso.datetime(),
});
const planSchema = z.object({
  version: z.literal(1),
  target: z.string(),
  generatedAt: z.iso.datetime(),
  rows: z.array(rowSchema),
});
export type HingeRekeyPlan = z.infer<typeof planSchema>;
type RekeyRow = z.infer<typeof rowSchema>;
type ProfileRow = {
  hinge_id: string;
  user_id: string | null;
  signup_time: string;
};
type Reference = {
  schema_name: string;
  table_name: string;
  column_name: string;
  condition?: string;
};
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
const tableName = (ref: Reference) =>
  `${quote(ref.schema_name)}.${quote(ref.table_name)}`;

/** Do not include credentials in the plan or its console summary. */
export async function hingeRekeyTarget(connectionString: string) {
  const url = new URL(connectionString);
  return createSHA256Hash(`${url.host}${url.pathname}`);
}

export async function planHingeRekey(
  db: Sql,
  target: string,
): Promise<HingeRekeyPlan> {
  const profiles = await db<ProfileRow[]>`
    SELECT hinge_id, user_id,
      to_char(create_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS signup_time
    FROM public.hinge_profile ORDER BY hinge_id
  `;
  const rows: RekeyRow[] = [];
  for (const profile of profiles) {
    // Ownerless legacy rows also need opaque IDs. Their random target is saved
    // in the plan, so applying the same plan again is an idempotent operation.
    const newId = profile.user_id
      ? (
          await resolveHingeUploadTarget({
            userId: profile.user_id,
            signupTime: profile.signup_time,
          })
        ).hingeId
      : randomBytes(32).toString("hex");
    if (newId !== profile.hinge_id)
      rows.push({
        oldId: profile.hinge_id,
        newId,
        ownerId: profile.user_id,
        signupTime: profile.signup_time,
      });
  }
  return { version: 1, target, generatedAt: new Date().toISOString(), rows };
}

export function validateHingeRekeyPlan(
  value: unknown,
  target: string,
): HingeRekeyPlan {
  const plan = planSchema.parse(value);
  if (plan.target !== target)
    throw new Error("Re-key plan belongs to a different database endpoint.");
  const oldIds = new Set(plan.rows.map((row) => row.oldId));
  const newIds = new Set(plan.rows.map((row) => row.newId));
  if (
    oldIds.size !== plan.rows.length ||
    newIds.size !== plan.rows.length ||
    plan.rows.some((row) => oldIds.has(row.newId))
  ) {
    throw new Error("Re-key plan contains duplicate or overlapping IDs.");
  }
  return plan;
}

async function references(tx: TransactionSql): Promise<Reference[]> {
  const foreignKeys = await tx.unsafe<(Reference & { key_count: number })[]>(`
    SELECT ns.nspname AS schema_name, rel.relname AS table_name,
      att.attname AS column_name, cardinality(c.conkey) AS key_count
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = c.conrelid AND att.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = 'public.hinge_profile'::regclass
  `);
  if (foreignKeys.some((key) => key.key_count !== 1)) {
    throw new Error(
      "Unexpected composite Hinge reference; review the re-key script before applying.",
    );
  }
  // These are intentionally not FKs because the tables span data providers.
  return [
    ...foreignKeys,
    {
      schema_name: "public",
      table_name: "swipe_rank_profile",
      column_name: "provider_profile_id",
      condition: "data_provider = 'HINGE'",
    },
    {
      schema_name: "public",
      table_name: "transient_upload",
      column_name: "result_profile_id",
      condition: "data_provider = 'HINGE'",
    },
    {
      schema_name: "public",
      table_name: "attachment",
      column_name: "resource_id",
      condition: "resource_type = 'hinge_data'",
    },
  ];
}

async function referenceCount(
  tx: TransactionSql,
  ref: Reference,
  side: "old_id" | "new_id",
) {
  const [row] = await tx.unsafe<{ count: number }[]>(`
    SELECT count(*)::int AS count FROM ${tableName(ref)} r
    JOIN hinge_rekey_map m ON r.${quote(ref.column_name)} = m.${side}
    ${ref.condition ? `WHERE r.${ref.condition}` : ""}
  `);
  return row!.count;
}

/** One transaction, including postconditions. No profile children are deleted. */
export async function applyHingeRekey(db: Sql, value: unknown, target: string) {
  const plan = validateHingeRekeyPlan(value, target);
  for (const row of plan.rows) {
    if (
      row.ownerId &&
      (
        await resolveHingeUploadTarget({
          userId: row.ownerId,
          signupTime: row.signupTime,
        })
      ).hingeId !== row.newId
    ) {
      throw new Error(
        "Planned ID does not match the recorded owner and signup.",
      );
    }
  }
  return db.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL lock_timeout = '10s'`);
    await tx.unsafe(`SET LOCAL statement_timeout = '5min'`);
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      swipeRankBuildLockName("HINGE"),
    ]);
    // Hold the parent lock before catalog discovery so a concurrent schema
    // change cannot introduce an untracked cascading child during the re-key.
    await tx.unsafe(
      "LOCK TABLE public.hinge_profile IN SHARE ROW EXCLUSIVE MODE",
    );
    const refs = await references(tx);
    // Also serialize writers that do not participate in the provider lock.
    // Reads remain available. Run this during a maintenance window.
    const tables = [
      ...new Set(['"public"."hinge_profile"', ...refs.map(tableName)]),
    ].sort();
    await tx.unsafe(
      `LOCK TABLE ${tables.join(", ")} IN SHARE ROW EXCLUSIVE MODE`,
    );
    const current = await tx.unsafe<ProfileRow[]>(`
      SELECT hinge_id, user_id,
        to_char(create_date, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS signup_time
      FROM public.hinge_profile
    `);
    const byId = new Map(current.map((row) => [row.hinge_id, row]));
    const pending: RekeyRow[] = [];
    for (const row of plan.rows) {
      const old = byId.get(row.oldId);
      const replacement = byId.get(row.newId);
      const found = old ?? replacement;
      if (
        found?.user_id !== row.ownerId ||
        found?.signup_time !== row.signupTime ||
        (old && replacement)
      ) {
        throw new Error(
          "Re-key plan is stale or collides with an existing profile. Generate a fresh plan.",
        );
      }
      if (old) pending.push(row);
    }
    if (!pending.length)
      return {
        rekeyed: 0,
        alreadyApplied: plan.rows.length,
        referencesMoved: 0,
      };
    await tx.unsafe(
      `CREATE TEMP TABLE hinge_rekey_map (old_id text PRIMARY KEY, new_id text UNIQUE NOT NULL, original jsonb) ON COMMIT DROP`,
    );
    for (let offset = 0; offset < pending.length; offset += 500) {
      const batch = pending
        .slice(offset, offset + 500)
        .map((row) => ({ old_id: row.oldId, new_id: row.newId }));
      await tx.unsafe(
        "INSERT INTO hinge_rekey_map (old_id, new_id) SELECT old_id, new_id FROM jsonb_to_recordset($1::jsonb) AS x(old_id text, new_id text)",
        [JSON.stringify(batch)],
      );
    }
    await tx.unsafe(
      `UPDATE hinge_rekey_map m SET original = to_jsonb(p) FROM public.hinge_profile p WHERE p.hinge_id = m.old_id`,
    );
    const counts = await Promise.all(
      refs.map((ref) => referenceCount(tx, ref, "old_id")),
    );
    // Release the unique user slot inside this transaction, copy the complete
    // row with its new key, then move children before deleting the empty shell.
    await tx.unsafe(
      `UPDATE public.hinge_profile p SET user_id = NULL FROM hinge_rekey_map m WHERE p.hinge_id = m.old_id`,
    );
    await tx.unsafe(
      `INSERT INTO public.hinge_profile SELECT (jsonb_populate_record(NULL::public.hinge_profile, original || jsonb_build_object('hinge_id', new_id))).* FROM hinge_rekey_map`,
    );
    for (const ref of refs) {
      await tx.unsafe(
        `UPDATE ${tableName(ref)} r SET ${quote(ref.column_name)} = m.new_id FROM hinge_rekey_map m WHERE r.${quote(ref.column_name)} = m.old_id ${ref.condition ? `AND r.${ref.condition}` : ""}`,
      );
    }
    for (const [index, ref] of refs.entries()) {
      if (
        (await referenceCount(tx, ref, "old_id")) !== 0 ||
        (await referenceCount(tx, ref, "new_id")) !== counts[index]
      ) {
        throw new Error(
          "Re-key reference postcondition failed; transaction rolled back.",
        );
      }
    }
    const [audit] = await tx.unsafe<{ mismatches: number }[]>(`
      SELECT count(*)::int AS mismatches FROM hinge_rekey_map m
      LEFT JOIN public.hinge_profile p ON p.hinge_id = m.new_id
      WHERE to_jsonb(p) IS DISTINCT FROM (m.original || jsonb_build_object('hinge_id', m.new_id))
    `);
    if (audit?.mismatches !== 0)
      throw new Error(
        "Re-key changed profile contents; transaction rolled back.",
      );
    await tx.unsafe(
      `DELETE FROM public.hinge_profile p USING hinge_rekey_map m WHERE p.hinge_id = m.old_id`,
    );
    const [after] = await tx.unsafe<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM public.hinge_profile`,
    );
    if (after?.count !== current.length)
      throw new Error("Re-key profile count changed; transaction rolled back.");
    // Transport profile_id and blob paths remain immutable lease evidence.
    return {
      rekeyed: pending.length,
      alreadyApplied: plan.rows.length - pending.length,
      referencesMoved: counts.reduce((a, b) => a + b, 0),
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const planIndex = args.indexOf("--plan");
  const planPath = planIndex >= 0 ? args[planIndex + 1] : undefined;
  const apply = args.includes("--apply");
  if (!planPath || planPath.startsWith("--"))
    throw new Error(
      "Supply --plan /private/path/hinge-rekey.json. Without --apply, this only writes a plan.",
    );
  if (apply && !args.includes("--retire-old-links"))
    throw new Error(
      "Applying requires --retire-old-links. Old insights and comparison URLs will stop resolving; no public aliases are created.",
    );
  const connectionString = process.env.HINGE_REKEY_DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "Set HINGE_REKEY_DATABASE_URL explicitly to the intended direct database connection.",
    );
  if (new URL(connectionString).hostname.includes("-pooler"))
    throw new Error("Use a direct connection for re-keying.");
  const target = await hingeRekeyTarget(connectionString);
  const db = postgres(connectionString, { max: 1, prepare: false });
  try {
    if (apply) {
      const plan: unknown = JSON.parse(await readFile(planPath, "utf8"));
      console.log(JSON.stringify(await applyHingeRekey(db, plan, target)));
    } else {
      const plan = await planHingeRekey(db, target);
      await writeFile(planPath, JSON.stringify(plan, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600,
      });
      console.log(
        JSON.stringify({
          mode: "plan-only",
          profiles: plan.rows.length,
          ownerless: plan.rows.filter((row) => !row.ownerId).length,
        }),
      );
    }
  } finally {
    await db.end();
  }
}
if (import.meta.main)
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Hinge re-key failed.",
    );
    process.exitCode = 1;
  });
