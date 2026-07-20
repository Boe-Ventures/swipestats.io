export function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

export function getFlagValue(flag: string): string | null {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  return index >= 0 ? (args[index + 1] ?? null) : null;
}

export function getIntegerFlag(flag: string): number | null {
  const raw = getFlagValue(flag);
  if (raw === null) return null;

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${flag} must be an integer.`);
  }
  return value;
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printHeading(title: string): void {
  console.log(`\n${title}`);
  console.log("─".repeat(title.length));
}

export function printRows(rows: Array<[string, unknown]>): void {
  const width = Math.max(...rows.map(([label]) => label.length), 0);
  for (const [label, value] of rows) {
    const display = typeof value === "number" ? value.toLocaleString() : value;
    console.log(`${label.padEnd(width)}  ${String(display)}`);
  }
}
