/**
 * Test topic subscription directly with Resend API
 *
 * Usage:
 *   bun src/scripts/resend/test-topic-subscription.ts
 */

import { Resend } from "resend";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: RESEND_API_KEY environment variable is required");
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const testEmail = "boe@homi.so";
  // Use the waitlist-profile-compare topic
  const topicId = "waitlist-profile-compare" as const;

  console.log("🧪 Testing topic subscription...\n");
  console.log(`Email: ${testEmail}`);
  console.log(`Topic ID: ${topicId}\n`);

  try {
    // Step 1: Verify topic exists
    console.log("1️⃣ Checking if topic exists...");
    const { data: allTopics, error: listError } = await resend.topics.list();

    if (listError) {
      console.error("❌ Failed to list topics:", listError);
      process.exit(1);
    }

    const topic = allTopics?.data?.find((t) => t.id === topicId);
    if (!topic) {
      console.error(`❌ Topic not found: ${topicId}`);
      console.log("Available topics:");
      allTopics?.data?.forEach((t) => {
        console.log(`   - ${t.name} (${t.id})`);
      });
      process.exit(1);
    }

    console.log(`✅ Topic found: ${topic.name}\n`);

    // Wait to respect rate limit
    console.log("⏳ Waiting 1 second (rate limit)...\n");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: Get current topics for contact
    console.log("2️⃣ Getting current topics for contact...");
    const { data: currentTopics, error: getError } =
      await resend.contacts.topics.list({
        email: testEmail,
      });

    if (getError) {
      console.log(`⚠️  Contact might not exist yet: ${getError.message}`);
    } else {
      console.log("Current topics:");
      if (currentTopics?.data && currentTopics.data.length > 0) {
        currentTopics.data.forEach((t) => {
          console.log(`   - ${t.name || t.id}: ${t.subscription}`);
        });
      } else {
        console.log("   (none)");
      }
    }
    console.log("");

    // Wait to respect rate limit
    console.log("⏳ Waiting 1 second (rate limit)...\n");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 3: Subscribe to topic
    console.log("3️⃣ Subscribing to topic...");
    const { data: updateData, error: updateError } =
      await resend.contacts.topics.update({
        email: testEmail,
        topics: [
          {
            id: topicId,
            subscription: "opt_in",
          },
        ],
      });

    if (updateError) {
      console.error("❌ Failed to update topics:", updateError);
      console.error("Error details:", JSON.stringify(updateError, null, 2));
      process.exit(1);
    }

    console.log("✅ Update successful!");
    console.log("Response:", JSON.stringify(updateData, null, 2));
    console.log("");

    // Step 4: Verify subscription
    console.log("4️⃣ Verifying subscription...");
    console.log("⏳ Waiting 2 seconds (rate limit + processing)...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { data: verifyTopics, error: verifyError } =
      await resend.contacts.topics.list({
        email: testEmail,
      });

    if (verifyError) {
      console.error("❌ Failed to verify:", verifyError);
      process.exit(1);
    }

    console.log("Topics after update:");
    if (verifyTopics?.data && verifyTopics.data.length > 0) {
      verifyTopics.data.forEach((t) => {
        const isTarget = t.id === topicId;
        const marker = isTarget ? "✅" : "  ";
        console.log(`   ${marker} ${t.name || t.id}: ${t.subscription}`);
      });
    } else {
      console.log("   ❌ STILL NO TOPICS!");
    }
    console.log("");

    console.log("✨ Test complete!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

void main();
