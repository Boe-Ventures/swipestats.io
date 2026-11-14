/**
 * List all Resend topics
 *
 * Usage:
 *   bun src/scripts/resend/list-topics.ts
 */

import { Resend } from "resend";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: RESEND_API_KEY environment variable is required");
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  console.log("🔍 Fetching all topics...\n");

  try {
    const { data: topics, error } = await resend.topics.list();

    if (error) {
      console.error("❌ Error fetching topics:", error);
      process.exit(1);
    }

    if (!topics?.data || topics.data.length === 0) {
      console.log("📭 No topics found");
      console.log(
        "\n💡 Create topics with: bun src/scripts/resend/create-topics.ts",
      );
      return;
    }

    console.log(`✅ Found ${topics.data.length} topic(s):\n`);

    topics.data.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic.name}`);
      console.log(`   ID: ${topic.id}`);
      console.log(`   Description: ${topic.description || "No description"}`);

      console.log(
        `   Created: ${new Date(topic.created_at).toLocaleDateString()}`,
      );
      console.log("");
    });

    console.log(
      "\n💡 Use these topic IDs in NEWSLETTER_TOPICS to match your code.",
    );
  } catch (error) {
    console.error("❌ Failed to fetch topics:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    process.exit(1);
  }
}

void main();
