"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import {
  ALL_OFF,
  ALL_ON,
  CONSENT_CATEGORY_META,
  type ConsentCategory,
  type ConsentPreferences,
} from "@/lib/analytics/consent";

export function CookiePreferences() {
  const { preferences, setConsent } = useAnalytics();
  const [draft, setDraft] = useState<ConsentPreferences>(
    preferences ?? ALL_OFF,
  );
  const [saved, setSaved] = useState(false);

  // Sync the draft when the resolved preferences arrive / change.
  useEffect(() => {
    if (preferences) setDraft(preferences);
  }, [preferences]);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (key: ConsentCategory, value: boolean) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    setConsent(draft);
    flashSaved();
  };

  const acceptAll = () => {
    setDraft(ALL_ON);
    setConsent(ALL_ON);
    flashSaved();
  };

  const rejectNonEssential = () => {
    setDraft(ALL_OFF);
    setConsent(ALL_OFF);
    flashSaved();
  };

  return (
    <Card>
      <CardContent className="divide-y divide-gray-100 p-0">
        {CONSENT_CATEGORY_META.map((cat) => (
          <div
            key={cat.key}
            className="flex items-start justify-between gap-4 p-5"
          >
            <div>
              <div className="font-medium text-gray-900">{cat.label}</div>
              <p className="mt-1 text-sm text-gray-600">{cat.description}</p>
            </div>
            <Switch
              checked={cat.locked ? true : draft[cat.key]}
              disabled={cat.locked}
              onCheckedChange={(value) => toggle(cat.key, value)}
              aria-label={`Toggle ${cat.label} cookies`}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2 p-5">
          <Button onClick={save}>{saved ? "Saved" : "Save preferences"}</Button>
          <Button variant="outline" onClick={acceptAll}>
            Accept all
          </Button>
          <Button variant="outline" onClick={rejectNonEssential}>
            Reject non-essential
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
