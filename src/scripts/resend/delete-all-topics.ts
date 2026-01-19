/**
 * Delete all Resend topics
 *
 * Use this to clean up topics that were created with wrong settings (e.g., opt_in instead of opt_out)
 * After running this, recreate topics with: bun src/scripts/resend/create-topics.ts
 *
 * Usage:
 *   bun src/scripts/resend/delete-all-topics.ts
 */

import { Resend } from "resend";

const TOPICS_TO_DELETE = [
  // Current topics (to be renamed with better prefixes)
  "cd53ae86-7048-4a60-bbbb-edbcc2cfa8ce", // General Newsletter
  "55ef0009-eceb-4592-813e-ddf8497b4e66", // Dating Tips & Advice
  "16b415f6-150f-45ae-97f5-6b5bfd2221c7", // Product Updates
  "5d0f29c3-e8f0-49e8-911d-db031b8f4a66", // Research & Statistics
  "428e50fc-3cff-4843-8312-1d7fb3862a96", // Profile Compare Waitlist
  "a82c1230-dc2e-4a29-878e-5bebe5f40049", // Bumble Support Waitlist
];

async function main() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: RESEND_API_KEY environment variable is required");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  console.log("🔍 Fetching existing topics to verify...\n");

  const { data: existingTopics, error: listError } = await resend.topics.list();

  if (listError) {
    console.error("❌ Error fetching topics:", listError);
    process.exit(1);
  }

  console.log(
    `📋 Found ${existingTopics?.data?.length || 0} existing topic(s)\n`,
  );

  if (!existingTopics?.data || existingTopics.data.length === 0) {
    console.log("✅ No topics to delete!");
    return;
  }

  console.log("🗑️  Deleting topics...\n");
  console.log("⏱️  Adding delays to respect rate limit (2 requests/sec)...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const topicId of TOPICS_TO_DELETE) {
    // Find the topic name for better logging
    const topic = existingTopics.data.find((t) => t.id === topicId);
    const topicName = topic?.name || "Unknown";

    console.log(`Deleting: ${topicName}`);
    console.log(`   ID: ${topicId}`);

    try {
      const { error } = await resend.topics.remove(topicId);

      if (error) {
        console.error(
          `   ❌ Failed: ${error.message || (error as Error).message}\n`,
        );
        errorCount++;

        // If rate limited, wait longer
        if (error.message?.includes("Too many requests")) {
          console.log("   ⏳ Waiting 2 seconds...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } else {
        console.log(`   ✅ Deleted successfully\n`);
        successCount++;
      }
    } catch (error) {
      console.error(
        `   ❌ Failed:`,
        error instanceof Error ? error.message : error,
      );
      console.log("");
      errorCount++;
    }

    // Rate limit: wait 600ms between requests (under 2 req/sec)
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.log("✨ Done!");
  console.log(`   ✅ Deleted: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Run: bun src/scripts/resend/create-topics.ts");
  console.log("   2. Update NEWSLETTER_TOPICS with the new IDs");
  console.log("   3. Users will now need to explicitly opt-in to topics");
}

void main();
