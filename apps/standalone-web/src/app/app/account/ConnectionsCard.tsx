"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { domain } from "@/domain/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
export function ConnectionsCard() {
  const cache = useQueryClient();
  const connections = useQuery(domain.connections.list.queryOptions());
  const revoke = useMutation(
    domain.connections.revoke.mutationOptions({
      onSuccess: () =>
        cache.invalidateQueries({ queryKey: domain.connections.list.key() }),
    }),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected assistants</CardTitle>
        <CardDescription>
          Manage assistants authorized to read your SwipeStats profiles and
          results. Disconnecting stops further access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {connections.isPending ? (
          <p>Loading connections...</p>
        ) : connections.error ? (
          <p role="alert">Could not load connections.</p>
        ) : !connections.data?.length ? (
          <p className="text-muted-foreground text-sm">
            No assistants connected.
          </p>
        ) : (
          connections.data.map((connection) => (
            <div
              key={connection.clientId}
              className="flex items-center justify-between gap-4"
            >
              <span>{connection.name ?? "Connected application"}</span>
              <Button
                variant="outline"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate({ clientId: connection.clientId })}
              >
                Disconnect
              </Button>
            </div>
          ))
        )}
        {revoke.error && (
          <p role="alert">Could not disconnect. Please try again.</p>
        )}
      </CardContent>
    </Card>
  );
}
