"use client";

import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";

import { SimpleDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getPromptsByApp, type Prompt } from "@/lib/prompt-bank";

interface PromptSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (prompt: Prompt) => void;
  currentApp?: "TINDER" | "HINGE";
}

export function PromptSelector({
  open,
  onOpenChange,
  onSelect,
  currentApp,
}: PromptSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<"TINDER" | "HINGE">(
    currentApp || "TINDER",
  );

  // Get prompts for selected app
  const prompts = useMemo(() => {
    return getPromptsByApp(selectedApp);
  }, [selectedApp]);

  // Filter prompts by search query
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return prompts;

    const query = searchQuery.toLowerCase();
    return prompts.filter(
      (prompt) =>
        prompt.text.toLowerCase().includes(query) ||
        prompt.category?.toLowerCase().includes(query),
    );
  }, [prompts, searchQuery]);

  // Group prompts by category
  const promptsByCategory = useMemo(() => {
    const grouped = new Map<string, Prompt[]>();
    filteredPrompts.forEach((prompt) => {
      const category = prompt.category || "Other";
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(prompt);
    });
    return grouped;
  }, [filteredPrompts]);

  const handleSelectPrompt = (prompt: Prompt) => {
    onSelect(prompt);
    onOpenChange(false);
    setSearchQuery(""); // Reset search
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearchQuery(""); // Reset search
  };

  return (
    <SimpleDialog
      title="Choose a Prompt"
      description="Select a prompt to add to your profile"
      open={open}
      onOpenChange={handleClose}
      size="lg"
    >
      <div className="space-y-4 py-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* App Tabs */}
        <Tabs
          value={selectedApp}
          onValueChange={(v) => setSelectedApp(v as "TINDER" | "HINGE")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="TINDER">Tinder</TabsTrigger>
            <TabsTrigger value="HINGE">Hinge</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedApp} className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {filteredPrompts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground text-sm">
                    No prompts found matching &quot;{searchQuery}&quot;
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(promptsByCategory.entries()).map(
                    ([category, categoryPrompts]) => (
                      <div key={category}>
                        <h3 className="text-muted-foreground mb-3 text-sm font-semibold">
                          {category}
                        </h3>
                        <div className="grid gap-2">
                          {categoryPrompts.map((prompt) => (
                            <button
                              key={prompt.id}
                              onClick={() => handleSelectPrompt(prompt)}
                              className="group bg-card hover:border-primary hover:bg-accent flex items-start gap-3 rounded-lg border p-4 text-left transition-all"
                            >
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed font-medium">
                                  {prompt.text}
                                </p>
                                {prompt.type === "image" && (
                                  <Badge
                                    variant="secondary"
                                    className="mt-2 text-xs"
                                  >
                                    Image Paired
                                  </Badge>
                                )}
                              </div>
                              <div className="border-muted-foreground/20 flex h-5 w-5 items-center justify-center rounded-full border opacity-0 transition-opacity group-hover:opacity-100">
                                <Check className="text-muted-foreground h-3 w-3" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer Help Text */}
        <div className="bg-muted/50 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">
            💡 Tip: You can also type a custom prompt manually if you don&apos;t
            find one here
          </p>
        </div>
      </div>
    </SimpleDialog>
  );
}
