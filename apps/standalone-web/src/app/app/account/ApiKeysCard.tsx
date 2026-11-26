"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { domain, domainClient } from "@/domain/react";
import { authClient } from "@/server/better-auth/client";
import { API_KEY_LIFETIMES, type LoveStoriesAccess } from "@/lib/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ApiKeysCard() {
  const session = authClient.useSession();
  const registered = !!session.data?.user && !session.data.user.isAnonymous;
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [access, setAccess] = useState<LoveStoriesAccess>("write");
  const [days, setDays] = useState<(typeof API_KEY_LIFETIMES)[number]>(90);
  const [credential, setCredential] = useState<{
    id: string;
    key: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const keys = useQuery(
    domain.apiKeys.list.queryOptions({ enabled: registered }),
  );
  const refresh = () =>
    cache.invalidateQueries({ queryKey: domain.apiKeys.list.key() });
  const create = useMutation({
    mutationFn: async () => {
      const result = await domainClient.apiKeys.create({
        name,
        expiresInDays: days,
        loveStoriesAccess: access,
      });
      setCredential({ id: result.id, key: result.key });
      setCopied(false);
      setCopyError(false);
      setName("");
      // The reusable query cache never receives the plaintext credential.
      return { id: result.id };
    },
    onSuccess: refresh,
  });
  const revoke = useMutation(
    domain.apiKeys.revoke.mutationOptions({
      onSuccess: async (_result, input) => {
        if (credential?.id === input.id) setCredential(null);
        await refresh();
      },
    }),
  );
  return (
    <Card className="ph-no-capture amp-block" data-amp-block>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>
          Connect an MCP client to your SwipeStats account with a personal key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-sm">
          Keys can access your SwipeStats analytics and Love Stories. Choose
          read and write access, or keep this key read only.
        </p>
        {session.isPending ? (
          <p className="text-sm">Loading API keys…</p>
        ) : !registered ? (
          <p className="text-sm">
            Sign in to a registered account to manage API keys.
          </p>
        ) : (
          <>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                create.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="api-key-name" className="text-sm font-medium">
                    Key name
                  </label>
                  <Input
                    id="api-key-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="My MCP client"
                    required
                    maxLength={80}
                    disabled={create.isPending || !!credential}
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Expires after</span>
                  <SimpleSelect
                    aria-label="API key expiration"
                    className="w-full"
                    value={days === null ? "never" : String(days)}
                    options={API_KEY_LIFETIMES.map((value) => ({
                      value: value === null ? "never" : String(value),
                      label: value === null ? "Never expires" : `${value} days`,
                    }))}
                    onValueChange={(value) =>
                      setDays(
                        value === "never"
                          ? null
                          : (Number(value) as 30 | 90 | 365),
                      )
                    }
                    disabled={create.isPending || !!credential}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Access</span>
                <SimpleSelect
                  aria-label="API key access"
                  className="w-full"
                  value={access}
                  options={[
                    { value: "read", label: "Read only" },
                    { value: "write", label: "Read and write" },
                  ]}
                  onValueChange={(value) => setAccess(value)}
                  disabled={create.isPending || !!credential}
                />
                <p className="text-muted-foreground text-sm">
                  {access === "write"
                    ? "Allows reading, creating, editing and permanently deleting your people, encounters and reflections."
                    : "Allows reading your analytics and exporting your people, encounters and reflections."}
                </p>
              </div>
              <Button type="submit" disabled={create.isPending || !!credential}>
                {create.isPending ? "Creating…" : "Create API key"}
              </Button>
            </form>
            {create.error && (
              <p role="alert" className="text-destructive text-sm">
                Could not create the key. Please try again.
              </p>
            )}
            {credential && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">
                  Copy your key now. It will not be shown again.
                </p>
                <Input
                  aria-label="New API key"
                  type="password"
                  readOnly
                  value={credential.key}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(credential.key);
                        setCopied(true);
                        setCopyError(false);
                      } catch {
                        setCopyError(true);
                      }
                    }}
                  >
                    {copied ? "Copied" : "Copy key"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCredential(null)}
                  >
                    Done
                  </Button>
                </div>
                {copyError && (
                  <p role="alert" className="text-destructive text-sm">
                    Clipboard access failed. Select the key field and copy it
                    manually.
                  </p>
                )}
              </div>
            )}
            <div className="bg-muted rounded-lg p-4 text-sm">
              <p>
                MCP endpoint: <code>/api/mcp</code> on this SwipeStats instance.
              </p>
              <p className="mt-2">
                Send your key as <code>Authorization: Bearer YOUR_KEY</code> or{" "}
                <code>x-api-key</code>.
              </p>
            </div>
            {keys.isPending ? (
              <p className="text-sm">Loading API keys…</p>
            ) : keys.error ? (
              <p role="alert" className="text-destructive text-sm">
                Could not load API keys.
              </p>
            ) : !keys.data?.length ? (
              <p className="text-muted-foreground text-sm">
                No active API keys.
              </p>
            ) : (
              <ul className="divide-y">
                {keys.data.map((key) => (
                  <li
                    key={key.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{key.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Love Stories:{" "}
                        {key.loveStoriesAccess === "write"
                          ? "Read and write"
                          : key.loveStoriesAccess === "read"
                            ? "Read only"
                            : "No access"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {key.start}… ·{" "}
                        {key.expiresAt
                          ? `${key.expiresAt <= new Date() ? "Expired" : "Expires"} ${key.expiresAt.toLocaleDateString()}`
                          : "Never expires"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {key.lastRequest
                          ? `Last used ${key.lastRequest.toLocaleDateString()}`
                          : "Not used yet"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate({ id: key.id })}
                    >
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {revoke.error && (
              <p role="alert" className="text-destructive text-sm">
                Could not revoke the key. Please try again.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
