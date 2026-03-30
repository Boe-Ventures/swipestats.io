import { env } from "@/env";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deployHookUrl = env.VERCEL_DEPLOY_HOOK_URL;
  if (!deployHookUrl) {
    return NextResponse.json(
      { error: "VERCEL_DEPLOY_HOOK_URL not configured" },
      { status: 500 },
    );
  }

  const response = await fetch(deployHookUrl, { method: "POST" });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Deploy hook failed", status: response.status },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, triggered: new Date().toISOString() });
}
