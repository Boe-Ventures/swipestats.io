"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Error Testing Page
 *
 * Test PostHog error tracking with different error scenarios
 */
export default function ErrorTestPage() {
  const [asyncError, setAsyncError] = useState(false);

  // 1. Synchronous error (caught by error boundary)
  if (asyncError) {
    throw new Error("💥 Test: React component render error");
  }

  // 2. Manual error capture
  const handleManualError = () => {
    const error = new Error("🎯 Test: Manually captured error");
    posthog.captureException(error, {
      source: "manual_test",
      timestamp: new Date().toISOString(),
    });
    alert("Manual error captured! Check PostHog.");
  };

  // 3. Async error (unhandled promise rejection)
  const handleAsyncError = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error("⏱️ Test: Async error (unhandled promise rejection)");
  };

  // 4. Server-side error (API route)
  const handleServerError = async () => {
    try {
      const response = await fetch("/api/test/error");
      const data = await response.json();
      console.log(data);
    } catch (err) {
      console.error("Server error response:", err);
    }
  };

  // 5. Network error simulation
  const handleNetworkError = async () => {
    try {
      await fetch("https://this-will-definitely-fail-12345.com");
    } catch (err) {
      posthog.captureException(err as Error, {
        source: "network_test",
      });
      alert("Network error captured! Check PostHog.");
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">PostHog Error Testing</h1>
        <p className="text-muted-foreground">
          Test different error scenarios and check PostHog dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Client-Side Errors */}
        <Card>
          <CardHeader>
            <CardTitle>Client-Side Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Button
                onClick={() => setAsyncError(true)}
                variant="destructive"
                className="w-full"
              >
                1. Trigger Render Error
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Throws error during component render (error boundary catches
                this)
              </p>
            </div>

            <div>
              <Button
                onClick={handleManualError}
                variant="outline"
                className="w-full"
              >
                2. Manual Error Capture
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Uses posthog.captureException() directly
              </p>
            </div>

            <div>
              <Button
                onClick={() => void handleAsyncError()}
                variant="outline"
                className="w-full"
              >
                3. Async Error
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Unhandled promise rejection (autocapture catches this)
              </p>
            </div>

            <div>
              <Button
                onClick={() => void handleNetworkError()}
                variant="outline"
                className="w-full"
              >
                4. Network Error
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Failed fetch request
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Server-Side Errors */}
        <Card>
          <CardHeader>
            <CardTitle>Server-Side Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Button
                onClick={() => void handleServerError()}
                variant="destructive"
                className="w-full"
              >
                5. Trigger API Error
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Calls /api/test/error route (server-side error)
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <h3 className="mb-2 font-semibold">Instructions:</h3>
              <ol className="list-inside list-decimal space-y-1 text-sm">
                <li>Open PostHog error tracking dashboard</li>
                <li>Click any button to trigger an error</li>
                <li>Check PostHog for the captured exception</li>
                <li>Verify stack traces and user context</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Details */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>What to Check in PostHog</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Error message matches the button you clicked</li>
            <li>Stack trace shows correct file and line numbers</li>
            <li>User distinct_id is associated with the error</li>
            <li>Additional properties (source, timestamp) are captured</li>
            <li>
              Server errors show correct route and include request context
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
