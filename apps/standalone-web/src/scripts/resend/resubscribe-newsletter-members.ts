/**
 * Re-subscribe existing newsletter members to main newsletter topics
 *
 * Usage:
 *   bun src/scripts/resend/resubscribe-newsletter-members.ts
 */

import { Resend } from "resend";
import { NEWSLETTER_TOPICS } from "@/server/clients/resend.constants";

// Main newsletter topic (not waitlists)
// Note: NEWSLETTER_TOPICS is now an array, not an object
const NEWSLETTER_TOPIC_IDS = [NEWSLETTER_TOPICS[0]]; // "newsletter-general"

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
  console.log(`🚀 Re-subscribing everyone to General Newsletter...\n`);
  console.log("⏱️  Adding delays to respect rate limit...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const contact of contacts.data) {
    console.log(`Processing: ${contact.email}`);

    try {
      // Subscribe to main newsletter topics
      const topics = NEWSLETTER_TOPIC_IDS.map((topicId) => ({
        id: topicId,
        subscription: "opt_in" as const,
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
        console.log(`   ✅ Subscribed to newsletter topics`);
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
  console.log("\n💡 Everyone is now subscribed to General Newsletter.");
  console.log(
    "Product waitlists (Profile Compare, Bumble) remain unsubscribed.",
  );
}

void main();
