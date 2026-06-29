"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTRPC } from "@/trpc/react";

export function UnsubscribeClient() {
  const token = useSearchParams().get("token") ?? "";
  const trpc = useTRPC();
  const unsubscribeMutation = useMutation(
    trpc.newsletter.unsubscribeByToken.mutationOptions(),
  );

  useEffect(() => {
    if (token && unsubscribeMutation.isIdle) {
      unsubscribeMutation.mutate({ token });
    }
  }, [token, unsubscribeMutation]);

  if (!token || unsubscribeMutation.isError) {
    return (
      <Card>
        <CardContent className="flex gap-3 py-8 text-sm">
          <AlertTriangle className="mt-0.5 size-4 text-destructive" />
          <div>
            <p className="font-medium">This unsubscribe link is invalid.</p>
            <p className="text-muted-foreground">
              You can request a new preferences link instead.
            </p>
            <ButtonLink
              href="/email-preferences"
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Manage preferences
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unsubscribeMutation.isSuccess) {
    return (
      <Card>
        <CardContent className="flex gap-3 py-8 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 text-green-600" />
          <div>
            <p className="font-medium">You have been unsubscribed.</p>
            <p className="text-muted-foreground">
              {unsubscribeMutation.data.topic
                ? `We opted ${unsubscribeMutation.data.email} out of ${unsubscribeMutation.data.topic}.`
                : `We opted ${unsubscribeMutation.data.email} out of SwipeStats marketing emails.`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-8 text-sm text-muted-foreground">
        Unsubscribing...
      </CardContent>
    </Card>
  );
}
