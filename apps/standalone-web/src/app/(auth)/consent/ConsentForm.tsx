"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/server/better-auth/client";

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your identity",
  profile: "View your name and profile",
  email: "View your email address",
  offline_access: "Stay connected when you are away",
  "swipestats:read":
    "Read your uploaded profile list, subscription status and SwipeRank results",
};

export function ConsentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = searchParams.get("client_id");
  const scopes = (searchParams.get("scope") ?? "").split(" ").filter(Boolean);

  const handleConsent = useCallback(
    async (accept: boolean) => {
      setLoading(accept ? "accept" : "deny");
      setError(null);
      try {
        const response = await authClient.oauth2.consent({
          accept,
          oauth_query: window.location.search.replace(/^\?/, ""),
        });
        if (response.error) {
          throw new Error(
            response.error.message ?? "Could not process authorization",
          );
        }
        const data = response.data as
          | { redirect_uri?: string; url?: string }
          | undefined;
        const redirectUri = data?.redirect_uri ?? data?.url;
        if (redirectUri) {
          window.location.assign(redirectUri);
          return;
        }
        router.push("/app");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not process authorization",
        );
        setLoading(null);
      }
    },
    [router],
  );

  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid authorization request</CardTitle>
          <CardDescription>
            Start the connection again from ChatGPT, Claude, or your MCP client.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <ShieldCheck className="text-primary mx-auto size-10" />
        <CardTitle>Authorize access</CardTitle>
        <CardDescription>
          Connect this application to your private SwipeStats account.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-6">
        <ul className="space-y-3">
          {(scopes.length ? scopes : ["swipestats:read"]).map((scope) => (
            <li key={scope} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span>{SCOPE_LABELS[scope] ?? scope}</span>
            </li>
          ))}
        </ul>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          disabled={loading !== null}
          onClick={() => handleConsent(false)}
        >
          <XCircle className="mr-2 size-4" />
          Deny
        </Button>
        <Button
          className="flex-1"
          disabled={loading !== null}
          onClick={() => handleConsent(true)}
        >
          <ShieldCheck className="mr-2 size-4" />
          {loading === "accept" ? "Authorizing…" : "Allow"}
        </Button>
      </CardFooter>
    </Card>
  );
}
