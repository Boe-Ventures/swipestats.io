"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ---------------------------------------------------------------------------

type Variant = "split" | "centered" | "hero";

const VARIANTS: { value: Variant; label: string }[] = [
  { value: "centered", label: "Centered (brand wall)" },
  { value: "hero", label: "Hero (title + screenshot)" },
  { value: "split", label: "Split (screenshot right)" },
];

type Preset = {
  label: string;
  title: string;
  subtitle: string;
  path: string;
  screenshot: string;
  variant: Variant;
};

const PRESETS: Preset[] = [
  {
    label: "Home (/)",
    title: "Analyze Your Dating App Data",
    subtitle: "Upload your Tinder or Hinge data and get insights into your dating patterns.",
    path: "/",
    screenshot: "",
    variant: "centered",
  },
  {
    label: "Home (minimal)",
    title: "SwipeStats",
    subtitle: "Dating app analytics",
    path: "/",
    screenshot: "",
    variant: "centered",
  },
  {
    label: "Hero (dashboard)",
    title: "Analyze Your Dating App Data",
    subtitle: "Upload your Tinder or Hinge data and get insights into your dating patterns.",
    path: "/",
    screenshot: "/SwipeStats-og.png",
    variant: "hero",
  },
  {
    label: "Hero (no screenshot)",
    title: "Analyze Your Dating App Data",
    subtitle: "Compare your swipes, matches, and messages with others worldwide.",
    path: "/",
    screenshot: "",
    variant: "hero",
  },
  {
    label: "Split (dashboard)",
    title: "Analyze Your Dating App Data",
    subtitle: "Upload your Tinder or Hinge data and get insights into your dating patterns.",
    path: "/",
    screenshot: "/SwipeStats-og.png",
    variant: "split",
  },
  {
    label: "Blog post",
    title: "Best Pickup Lines That Actually Work",
    subtitle: "Data-driven analysis of what openers get the most responses.",
    path: "/blog/best-pickup-lines",
    screenshot: "",
    variant: "centered",
  },
  {
    label: "Tinder Stats",
    title: "Your Tinder Statistics",
    subtitle: "Swipes, matches, messages — see how you compare.",
    path: "/insights/tinder",
    screenshot: "",
    variant: "centered",
  },
  {
    label: "Hinge Stats",
    title: "Your Hinge Statistics",
    subtitle: "Likes, matches, conversations — decoded.",
    path: "/insights/hinge",
    screenshot: "",
    variant: "centered",
  },
  {
    label: "Compare",
    title: "How Do You Compare?",
    subtitle: "See how your dating stats stack up against the global average.",
    path: "/compare",
    screenshot: "",
    variant: "centered",
  },
];

// ---------------------------------------------------------------------------

function buildUrl(preset: Preset, cacheBust = 0) {
  const params = new URLSearchParams();
  params.set("title", preset.title);
  if (preset.subtitle) params.set("subtitle", preset.subtitle);
  if (preset.path) params.set("path", preset.path);
  if (preset.screenshot) params.set("screenshot", preset.screenshot);
  if (preset.variant !== "centered") params.set("variant", preset.variant);
  if (cacheBust) params.set("_", String(cacheBust));
  return `/api/og?${params.toString()}`;
}

// ---------------------------------------------------------------------------

export default function OgPreviewPage() {
  const [title, setTitle] = useState(PRESETS[0]!.title);
  const [subtitle, setSubtitle] = useState(PRESETS[0]!.subtitle);
  const [path, setPath] = useState(PRESETS[0]!.path);
  const [screenshot, setScreenshot] = useState("");
  const [variant, setVariant] = useState<Variant>("centered");
  const [cacheBust, setCacheBust] = useState(0);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("title", title);
    if (subtitle) params.set("subtitle", subtitle);
    if (path) params.set("path", path);
    if (screenshot) params.set("screenshot", screenshot);
    if (variant !== "centered") params.set("variant", variant);
    if (cacheBust) params.set("_", String(cacheBust));
    return `/api/og?${params.toString()}`;
  }, [title, subtitle, path, screenshot, variant, cacheBust]);

  const applyPreset = (preset: Preset) => {
    setTitle(preset.title);
    setSubtitle(preset.subtitle);
    setPath(preset.path);
    setScreenshot(preset.screenshot);
    setVariant(preset.variant);
  };

  const copyUrl = async () => {
    const full = new URL(url, window.location.origin).toString();
    await navigator.clipboard.writeText(full);
    toast.success("Copied URL to clipboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">OG Image Preview</h1>
        <p className="text-gray-600">
          Iterate on the /api/og route. Live-reloads as you type.
        </p>
      </div>

      <div className="mb-4">
        <a
          href="/admin/og-map"
          className="inline-flex items-center gap-1 text-sm text-rose-500 hover:underline"
        >
          <ExternalLink className="size-3.5" />
          OG / Meta Audit (all pages)
        </a>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="wall">Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <div className="mt-4 grid gap-6 lg:grid-cols-[360px_1fr]">
            {/* Controls */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Parameters</CardTitle>
                  <CardDescription>
                    Edit fields to see live preview.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="subtitle">Subtitle</Label>
                    <Textarea
                      id="subtitle"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="path">Path</Label>
                    <Input
                      id="path"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="/"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Variant</Label>
                    <Select
                      value={variant}
                      onValueChange={(v) => setVariant(v as Variant)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIANTS.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="screenshot">Screenshot</Label>
                    <Input
                      id="screenshot"
                      value={screenshot}
                      onChange={(e) => setScreenshot(e.target.value)}
                      placeholder="/SwipeStats-og.png or URL"
                    />
                    <p className="text-xs text-gray-500">
                      Public path or full URL. Leave empty for text-only.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={copyUrl}>
                      <Copy className="mr-1 size-4" />
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCacheBust(Date.now())}
                    >
                      <RefreshCcw className="mr-1 size-4" />
                      Re-render
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Presets</CardTitle>
                  <CardDescription>
                    Click to load a preset.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {url}
                  </CardDescription>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-rose-500 hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  Open raw
                </a>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="OG preview"
                    className="w-full"
                    width={1200}
                    height={630}
                  />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Rendered at native 1200×630. Different platforms crop
                  differently.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="wall">
          <OgWall />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------

function OgWall() {
  const [cacheBust, setCacheBust] = useState(0);

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>OG Wall</CardTitle>
          <CardDescription>
            All {PRESETS.length} presets rendered side by side.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCacheBust(Date.now())}
        >
          <RefreshCcw className="mr-1 size-4" />
          Re-render all
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PRESETS.map((preset) => {
            const url = buildUrl(preset, cacheBust);
            return (
              <div key={preset.label} className="flex flex-col gap-2">
                <div className="overflow-hidden rounded-lg border bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={preset.label}
                    className="w-full"
                    width={1200}
                    height={630}
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {preset.label}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {preset.variant}
                    </p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-rose-500 hover:underline"
                  >
                    Open ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
