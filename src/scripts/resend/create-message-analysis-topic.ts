/**
 * Create Resend topic for Message Analysis waitlist
 *
 * Usage:
 *   bun src/scripts/resend/create-message-analysis-topic.ts
 */

import { Resend } from "resend";

const TOPIC_DEFINITION = {
  name: "Waitlist Message Analysis",
  description: "Notifications for Messages & Conversations feature launch",
  defaultSubscription: "opt_out" as const, // MUST be opt-out for waitlists
};

async function main() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: RESEND_API_KEY environment variable is required");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  console.log("🚀 Creating topic for Message Analysis waitlist...\n");
  console.log(`   Name: ${TOPIC_DEFINITION.name}`);
  console.log(`   Description: ${TOPIC_DEFINITION.description}\n`);

  try {
    const { data, error } = await resend.topics.create({
      name: TOPIC_DEFINITION.name,
      description: TOPIC_DEFINITION.description,
      defaultSubscription: TOPIC_DEFINITION.defaultSubscription,
    });

    if (error) {
      console.error(`❌ Failed: ${error.message}`);
      process.exit(1);
    }

    console.log(`✅ Created successfully!`);
    console.log(`   Topic ID: ${data?.id}\n`);

    console.log("⚠️  IMPORTANT: Add this to your code:\n");

    console.log(
      "1. In src/server/clients/resend.client.ts, update TopicKey type:",
    );
    console.log('   | "waitlist-message-analysis"');
    console.log("");

    console.log(
      "2. In src/server/clients/resend.client.ts, add to TOPIC_ID_MAP:",
    );
    console.log(`   "waitlist-message-analysis": "${data?.id}",`);
    console.log("");

    console.log(
      "3. In src/server/api/routers/newsletterRouter.ts, add to topicKeySchema:",
    );
    console.log('   "waitlist-message-analysis",');
    console.log("");

    console.log(
      "✨ Done! Users can now subscribe to the Message Analysis waitlist.",
    );
  } catch (error) {
    console.error(`❌ Failed:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
