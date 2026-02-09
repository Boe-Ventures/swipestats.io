#!/usr/bin/env bun
/**
 * Sanitizes a Hinge data blob by removing message content
 * Makes the JSON manageable for analysis without exposing private messages
 *
 * Usage: bun run src/scripts/sanitize-hinge-blob.ts
 */

import type { AnonymizedHingeDataJSON } from "@/lib/interfaces/HingeDataJSON";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Paste your blob URL here
const BLOB_URL =
  "https://bt5mtixvtadyfri3.public.blob.vercel-storage.com/hinge-data/38842d8c7049729229335662270681cc2e5a453fd098c724914f9978f64c1795/2026-02-09/data-rUer7hN0rYg6gwiaYy4N3mJcYQH2sK.json";

//const BLOB_URL =
//  "https://xxcnc3l01nlbs8ho.public.blob.vercel-storage.com/hinge-data/e01d8853740e6541ef9569ec45e49518444474eb336ebe67c3d26e2e5e577516/2026-02-08/data-dab7Ihn8qFIoNpIfjKwmAavtNFiEb0.json";
// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function sanitizeHingeBlob(blobUrl: string) {
  console.log("📥 Downloading blob from:", blobUrl);

  // Download the blob
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to download blob: ${response.statusText}`);
  }

  const data = (await response.json()) as AnonymizedHingeDataJSON;
  console.log("✅ Downloaded successfully");
  console.log("📊 Original stats:");
  console.log(`  - Matches: ${data.Matches.length}`);
  console.log(`  - Prompts: ${data.Prompts.length}`);
  console.log(`  - Media: ${data.Media?.length ?? 0}`);

  // Count original messages
  let originalMessageCount = 0;
  data.Matches.forEach((thread) => {
    originalMessageCount += thread.chats?.length ?? 0;
  });
  console.log(`  - Messages: ${originalMessageCount}`);

  // Sanitize: Remove sensitive content and replace with compact metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: any = {
    ...data,
    User: {
      ...data.User,
      devices: undefined, // Remove devices entirely
    },
    Matches: data.Matches.map((thread) => ({
      ...thread,
      chats: undefined, // Remove the full chats array
      _chat_count: thread.chats?.length ?? 0,
      _chat_timestamps: thread.chats?.map((chat) => chat.timestamp) ?? [],
    })),
    // Remove audit trail entirely - not needed for analysis
    audit_trail_image: undefined,
  };

  console.log("\n🧹 Sanitized:");
  console.log(`  - Message bodies replaced with metadata`);
  console.log(`  - Devices removed`);
  console.log(`  - Audit trail removed`);

  // Calculate size reduction
  const originalSize = JSON.stringify(data).length;
  const sanitizedSize = JSON.stringify(sanitized).length;
  const reduction = ((1 - sanitizedSize / originalSize) * 100).toFixed(1);

  console.log("\n📦 Size:");
  console.log(`  - Original: ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`  - Sanitized: ${(sanitizedSize / 1024).toFixed(1)} KB`);
  console.log(`  - Reduction: ${reduction}%`);

  console.log("\n📋 Output (sanitized JSON):");
  console.log("─".repeat(80));
  console.log(JSON.stringify(sanitized, null, 2));
}

// Run the script
const PLACEHOLDER_URL = "https://your-blob-url-here.com/data.json";
// @ts-expect-error - This check is intentionally for detecting placeholder URL
if (BLOB_URL === PLACEHOLDER_URL) {
  console.error("❌ Error: Please set BLOB_URL in the script first!");
  console.error(
    "   Edit src/scripts/sanitize-hinge-blob.ts and paste your blob URL",
  );
  process.exit(1);
}

sanitizeHingeBlob(BLOB_URL).catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
