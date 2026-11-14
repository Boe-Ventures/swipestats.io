"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ShareButton({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
      setOpen(false);
    } catch {
      toast.error(
        "Could not copy the link. Select it above and copy manually.",
      );
    }
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title, text, url });
      setOpen(false);
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        toast.error("Could not share. Try copying the link instead.");
      }
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setUrl(window.location.href);
          setCanShare(
            typeof navigator.share === "function" &&
              window.matchMedia("(pointer: coarse)").matches,
          );
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="gap-2" />}
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl"
      >
        <div>
          <h2 className="font-semibold">Share this page</h2>
          <p className="text-muted-foreground text-sm">
            Send a link to your SwipeStats.
          </p>
        </div>
        <Input
          aria-label="Share link"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button onClick={() => void copyLink()} className="w-full gap-2">
          <Copy className="h-4 w-4" />
          Copy link
        </Button>
        {canShare && (
          <Button
            variant="outline"
            onClick={() => void shareNative()}
            className="w-full gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share via apps
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
