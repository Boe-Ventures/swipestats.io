/**
 * Create the waitlist-directory-profiles topic in Resend
 *
 * Usage:
 *   bun src/scripts/resend/create-directory-profiles-topic.ts
 */

import { Resend } from "resend";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: RESEND_API_KEY environment variable is required");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  console.log("🚀 Creating 'Waitlist Directory Profiles' topic...\n");

  try {
    const { data, error } = await resend.topics.create({
      name: "Waitlist Directory Profiles",
      description: "Notifications for All Directory Profiles feature launch",
      defaultSubscription: "opt_out", // MUST be opt-out for waitlists
    });

    if (error) {
      console.error(`❌ Failed: ${error.message}`);
      process.exit(1);
    }

    console.log(`✅ Created successfully!`);
    console.log(`\n📋 Topic ID: ${data?.id}`);
    console.log(
      `\n⚠️  IMPORTANT: Add this to resend.client.ts TopicKey type and TOPIC_ID_MAP:\n`,
    );
    console.log(`export type TopicKey =`);
    console.log(`  | "newsletter-general"`);
    console.log(`  | "newsletter-dating-tips"`);
    console.log(`  | "newsletter-product-updates"`);
    console.log(`  | "newsletter-research"`);
    console.log(`  | "waitlist-profile-compare"`);
    console.log(`  | "waitlist-bumble"`);
    console.log(`  | "waitlist-message-analysis"`);
    console.log(`  | "waitlist-directory-profiles"; // NEW\n`);
    console.log(`const TOPIC_ID_MAP: Record<TopicKey, string> = {`);
    console.log(`  // ... existing topics ...`);
    console.log(`  "waitlist-directory-profiles": "${data?.id}", // NEW`);
    console.log(`};\n`);
  } catch (error) {
    console.error(`❌ Failed:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
