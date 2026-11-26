/**
 * Bulk unsubscribe all contacts from all topics
 *
 * Usage:
 *   bun src/scripts/resend/bulk-unsubscribe-topics.ts
 */

import { Resend } from "resend";
import { NEWSLETTER_TOPICS } from "@/server/clients/resend.constants";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: RESEND_API_KEY environment variable is required");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  console.log("🔍 Fetching all contacts...\n");

  // Get all contacts
  const { data: contacts, error: contactsError } = await resend.contacts.list();

  if (contactsError) {
    console.error("❌ Error fetching contacts:", contactsError);
    process.exit(1);
  }

  if (!contacts?.data || contacts.data.length === 0) {
    console.log("📭 No contacts found");
    return;
  }

  console.log(`✅ Found ${contacts.data.length} contact(s)\n`);

  const allTopicIds = Object.values(NEWSLETTER_TOPICS);

  console.log(
    `🚀 Unsubscribing everyone from ${allTopicIds.length} topics...\n`,
  );
  console.log("⏱️  Adding delays to respect rate limit...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const contact of contacts.data) {
    console.log(`Processing: ${contact.email}`);

    try {
      // Unsubscribe from all topics
      const topics = allTopicIds.map((topicId) => ({
        id: topicId,
        subscription: "opt_out" as const, // Unsubscribe from all
      }));

      const { error } = await resend.contacts.topics.update({
        email: contact.email,
        topics,
      });

      if (error) {
        console.error(
          `   ❌ Failed: ${error.message || (error as Error).message}`,
        );
        errorCount++;
      } else {
        console.log(`   ✅ Unsubscribed from all topics`);
        successCount++;
      }
    } catch (error) {
      console.error(
        `   ❌ Failed:`,
        error instanceof Error ? error.message : error,
      );
      errorCount++;
    }

    // Rate limit: wait 600ms between requests (under 2 req/sec)
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  console.log(`\n✨ Done!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(
    "\n💡 From now on, users will only be subscribed when they explicitly opt in.",
  );
}

void main();
