import "@/components/ui/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { cn } from "@/components/ui/lib/utils";
import { ThemeProvider } from "@/components/ui/theme";
import { Toaster } from "@/components/ui/toast";

import { TRPCReactProvider } from "@/trpc/react";
import { UpgradeProvider } from "@/contexts/UpgradeContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsProvider";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://swipestats.io"),
  title: {
    template: "%s | SwipeStats",
    default: "SwipeStats - Analyze Your Dating App Data",
  },
  description:
    "Upload your Tinder or Hinge data anonymously and get insights into your dating patterns. Compare with others worldwide.",
  icons: [
    { rel: "icon", url: "/icon.png" },
    { rel: "apple-touch-icon", url: "/icon.png" },
  ],
  openGraph: {
    type: "website",
    siteName: "SwipeStats",
    locale: "en_US",
    images: [
      {
        url: "/SwipeStats-og.png",
        width: 1200,
        height: 630,
        alt: "SwipeStats - Analyze Your Dating App Data",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@SwipeStats",
    images: ["/SwipeStats-og.png"],
  },
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
  preload: true,
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, geistMono.variable)}
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <TRPCReactProvider>
          <ThemeProvider>
            <AnalyticsProvider>
              <UpgradeProvider>
                <NuqsAdapter>{children}</NuqsAdapter>
              </UpgradeProvider>
            </AnalyticsProvider>
          </ThemeProvider>
        </TRPCReactProvider>
        <Toaster />
        <VercelAnalytics />
      </body>
    </html>
  );
}
