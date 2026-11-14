import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

import { countryComparisonValues } from "@/lib/swipe-rank/country";

function inList(values: readonly string[]): SQL {
  return sql`(${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;
}

/**
 * Compare mixed source labels (for example, `NO`, `NOR`, and `Norway`)
 * without rewriting the provider/user location stored in the registry.
 */
export function swipeRankCountryFilterSql(
  column: SQLWrapper,
  value: string,
): SQL {
  const comparison = countryComparisonValues(value);

  return sql`(
    lower(trim(${column})) IN ${inList(comparison.aliases)}
    OR regexp_replace(
      lower(trim(${column})),
      '[^a-z0-9]+',
      '',
      'g'
    ) IN ${inList(comparison.keys)}
  )`;
}
