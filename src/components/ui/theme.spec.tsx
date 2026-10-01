import { describe, expect, test } from "bun:test";
import { runInNewContext } from "node:vm";

import { themeDetectorScript } from "./theme";

function detectTheme(
  stored: string | null,
  systemDark = false,
  blocked = false,
) {
  const classes = new Set<string>(["font-variable"]);
  runInNewContext(themeDetectorScript, {
    localStorage: {
      getItem: () => {
        if (blocked) throw new Error("Storage blocked");
        return stored;
      },
    },
    window: { matchMedia: () => ({ matches: systemDark }) },
    document: {
      documentElement: {
        classList: {
          add: (...values: string[]) =>
            values.forEach((value) => classes.add(value)),
        },
      },
    },
  });
  return [...classes];
}

describe("theme initialization before paint", () => {
  test("restores an explicit choice regardless of the system preference", () => {
    expect(detectTheme("dark", false)).toEqual(["font-variable", "dark"]);
    expect(detectTheme("light", true)).toEqual(["font-variable", "light"]);
  });

  test("resolves system mode and retains its marker", () => {
    expect(detectTheme("auto", true)).toEqual([
      "font-variable",
      "dark",
      "auto",
    ]);
    expect(detectTheme("auto", false)).toEqual([
      "font-variable",
      "light",
      "auto",
    ]);
  });

  test("falls back to light for absent, invalid, or blocked storage", () => {
    expect(detectTheme(null, true)).toEqual(["font-variable", "light"]);
    expect(detectTheme("invalid", true)).toEqual(["font-variable", "light"]);
    expect(detectTheme("dark", true, true)).toEqual(["font-variable", "light"]);
  });
});
