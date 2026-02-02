import type { DataProvider } from "@/server/db/schema";

export type DisplayMode = "stack" | "flow" | "platform";

export interface ProviderConfig {
  name: string;
  brandColor: string;
  secondaryColor: string;
  accentColor: string;
  defaultDisplayMode: DisplayMode;
  supportedModes: DisplayMode[];
  description: string;
}

export const PROVIDER_CONFIGS: Record<DataProvider, ProviderConfig> = {
  TINDER: {
    name: "Tinder",
    brandColor: "#FF6B6B", // Tinder red/pink
    secondaryColor: "#FD297B",
    accentColor: "#FF7854",
    defaultDisplayMode: "stack",
    supportedModes: ["stack", "flow", "platform"],
    description: "Swipe-based dating - stack view recommended",
  },
  HINGE: {
    name: "Hinge",
    brandColor: "#9D4EDD", // Hinge purple
    secondaryColor: "#7209B7",
    accentColor: "#B185DB",
    defaultDisplayMode: "flow",
    supportedModes: ["flow", "stack", "platform"],
    description: "Profile-based dating - flow view recommended",
  },
  BUMBLE: {
    name: "Bumble",
    brandColor: "#FFD200", // Bumble yellow
    secondaryColor: "#FFA500",
    accentColor: "#FFE55C",
    defaultDisplayMode: "stack",
    supportedModes: ["stack", "flow", "platform"],
    description: "Women make the first move",
  },
  GRINDER: {
    name: "Grindr",
    brandColor: "#FFCE00", // Grindr yellow
    secondaryColor: "#FF9900",
    accentColor: "#FFE066",
    defaultDisplayMode: "stack",
    supportedModes: ["stack", "flow", "platform"],
    description: "LGBTQ+ dating app",
  },
  BADOO: {
    name: "Badoo",
    brandColor: "#6F5CF8", // Badoo purple
    secondaryColor: "#5A4BD9",
    accentColor: "#8B7FFF",
    defaultDisplayMode: "flow",
    supportedModes: ["stack", "flow", "platform"],
    description: "Social dating network",
  },
  BOO: {
    name: "Boo",
    brandColor: "#7C3AED", // Purple
    secondaryColor: "#6D28D9",
    accentColor: "#9F7AEA",
    defaultDisplayMode: "flow",
    supportedModes: ["stack", "flow", "platform"],
    description: "Personality-based dating",
  },
  OK_CUPID: {
    name: "OkCupid",
    brandColor: "#0084FF", // OkCupid blue
    secondaryColor: "#006DD9",
    accentColor: "#4DA6FF",
    defaultDisplayMode: "flow",
    supportedModes: ["stack", "flow", "platform"],
    description: "Question-based matching",
  },
  FEELD: {
    name: "Feeld",
    brandColor: "#1A1A1A", // Feeld dark
    secondaryColor: "#2D2D2D",
    accentColor: "#404040",
    defaultDisplayMode: "flow",
    supportedModes: ["stack", "flow", "platform"],
    description: "Open-minded dating",
  },
};

export function getProviderConfig(
  provider: DataProvider | "FRIEND",
): ProviderConfig {
  // If it's a standard provider, return its config
  if (provider in PROVIDER_CONFIGS) {
    return PROVIDER_CONFIGS[provider as DataProvider];
  }

  // For FRIEND or custom providers, return a default config
  // The title field will be used for display
  return {
    name: provider === "FRIEND" ? "Friend" : provider,
    brandColor: "#6366F1", // Indigo
    secondaryColor: "#4F46E5",
    accentColor: "#818CF8",
    defaultDisplayMode: "flow",
    supportedModes: ["flow", "stack", "platform"],
    description: "Friend-curated profile",
  };
}
