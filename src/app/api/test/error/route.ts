import { NextResponse } from "next/server";

/**
 * Test API Route - Triggers Server-Side Error
 *
 * This endpoint intentionally throws an error to test PostHog's
 * server-side error tracking via instrumentation.ts
 */
export async function GET() {
  // Simulate some async work
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Throw an error - this will be caught by instrumentation.ts onRequestError
  throw new Error("🚨 Test: Server-side API error from /api/test/error");

  // This code is unreachable but TypeScript needs a return type
  return NextResponse.json({ error: "This won't be reached" });
}

/**
 * POST version for testing different HTTP methods
 */
export async function POST() {
  throw new Error("🚨 Test: POST request error from /api/test/error");

  return NextResponse.json({ error: "This won't be reached" });
}
