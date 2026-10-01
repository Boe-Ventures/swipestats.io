"use client";

import * as React from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import * as z from "zod/v4";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const ThemeModeSchema = z.enum(["light", "dark", "auto"]);

const themeKey = "swipestats-theme";
const themeChangeEvent = "swipestats-theme-change";
// Retain a selection for this tab even when browser storage is unavailable.
let transientTheme: ThemeMode | undefined;

export type ThemeMode = z.output<typeof ThemeModeSchema>;
export type ResolvedTheme = Exclude<ThemeMode, "auto">;

const getStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  if (transientTheme) return transientTheme;
  try {
    const storedTheme = localStorage.getItem(themeKey);
    return ThemeModeSchema.parse(storedTheme);
  } catch {
    return "light";
  }
};

const setStoredThemeMode = (theme: ThemeMode) => {
  transientTheme = ThemeModeSchema.parse(theme);
  try {
    localStorage.setItem(themeKey, transientTheme);
  } catch {
    // The in-memory selection still works if localStorage is unavailable.
  }
  window.dispatchEvent(new Event(themeChangeEvent));
};

const getSystemTheme = () => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const updateThemeClass = (themeMode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "auto");
  const newTheme = themeMode === "auto" ? getSystemTheme() : themeMode;
  root.classList.add(newTheme);

  if (themeMode === "auto") {
    root.classList.add("auto");
  }
};

const subscribeTheme = (onChange: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeKey && event.key !== null) return;
    transientTheme = undefined;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(themeChangeEvent, onChange);
  };
};

const subscribeSystemTheme = (onChange: () => void) => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
};

const getServerTheme = (): ResolvedTheme => "light";

const getNextTheme = (current: ThemeMode): ThemeMode => {
  const themes: ThemeMode[] =
    getSystemTheme() === "dark"
      ? ["auto", "light", "dark"]
      : ["auto", "dark", "light"];

  return themes[(themes.indexOf(current) + 1) % themes.length]!;
};

export const themeDetectorScript = (function () {
  function themeFn() {
    const isValidTheme = (theme: string): theme is ThemeMode => {
      const validThemes = ["light", "dark", "auto"] as const;
      return validThemes.includes(theme as ThemeMode);
    };

    try {
      const storedTheme = localStorage?.getItem("swipestats-theme") ?? "light";
      const validTheme = isValidTheme(storedTheme) ? storedTheme : "light";

      if (validTheme === "auto") {
        const autoTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        document.documentElement.classList.add(autoTheme, "auto");
      } else {
        document.documentElement.classList.add(validTheme);
      }
    } catch {
      // localStorage unavailable (privacy mode, browser restrictions)
      document.documentElement.classList.add("light");
    }
  }
  return `(${themeFn.toString()})();`;
})();

interface ThemeContextProps {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleMode: () => void;
}
const ThemeContext = React.createContext<ThemeContextProps | undefined>(
  undefined,
);

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const themeMode = React.useSyncExternalStore(
    subscribeTheme,
    getStoredThemeMode,
    getServerTheme,
  );
  const systemTheme = React.useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    getServerTheme,
  );
  const resolvedTheme = themeMode === "auto" ? systemTheme : themeMode;

  React.useEffect(() => {
    // During hydration the server snapshot is light. Read the actual preference
    // so this effect cannot briefly undo the theme applied by the head script.
    updateThemeClass(getStoredThemeMode());
  }, [themeMode, resolvedTheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setStoredThemeMode(newTheme);
    updateThemeClass(newTheme);
  };

  const toggleMode = () => {
    setTheme(getNextTheme(themeMode));
  };

  return (
    <ThemeContext
      value={{
        themeMode,
        resolvedTheme,
        setTheme,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = React.use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="[&>svg]:absolute [&>svg]:size-5 [&>svg]:scale-0"
          >
            <SunIcon className="light:scale-100! auto:scale-0!" />
            <MoonIcon className="auto:scale-0! dark:scale-100!" />
            <MonitorIcon className="auto:scale-100!" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("auto")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
