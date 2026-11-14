/**
 * Test FAL.ai Image Generation
 * Quick script to verify FAL.ai API works and understand response format
 *
 * Run with: bun run src/scripts/test-fal-image.ts
 */

const FAL_KEY = process.env.FAL_KEY;

if (!FAL_KEY) {
  console.error("❌ Missing FAL_KEY environment variable");
  process.exit(1);
}

type FalImageResponse = {
  request_id: string;
  status_url: string;
  response_url?: string;
  status?: string;
  images?: Array<{ url: string; width: number; height: number }>;
  metrics?: {
    inference_time: number;
  };
};

async function testFalImage() {
  console.log("🧪 Testing FAL.ai Image Generation\n");

  // Step 1: Submit request
  console.log("1️⃣  Submitting image generation request...");
  const response = await fetch("https://queue.fal.run/fal-ai/gpt-image-1.5", {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt:
        "An attractive guy in his mid-20s filming a selfie video, amused expression, looking at phone/laptop screen with graphs. Casual setting, good lighting, well-groomed, wearing t-shirt. Authentic selfie angle, not staged.",
      image_size: "1024x1536",
      num_images: 1,
      output_format: "png",
      quality: "medium",
    }),
  });

  if (!response.ok) {
    console.error(
      `❌ Request failed: ${response.status} ${response.statusText}`,
    );
    const errorText = await response.text();
    console.error(errorText);
    process.exit(1);
  }

  const data = (await response.json()) as FalImageResponse;
  console.log(`✅ Request submitted`);
  console.log(`   Request ID: ${data.request_id}`);
  console.log(`   Status URL: ${data.status_url}`);
  console.log();

  // Step 2: Poll for completion
  console.log("2️⃣  Polling for completion...\n");
  let imageUrl: string | undefined;
  let attempts = 0;
  const maxAttempts = 90; // 6 minutes max
  const pollInterval = 3000; // 3 seconds
  const startTime = Date.now();

  while (!imageUrl && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    attempts++;

    const statusResponse = await fetch(data.status_url, {
      headers: {
        Authorization: `Key ${FAL_KEY}`,
      },
    });

    if (!statusResponse.ok) {
      console.error(`\n❌ Status check failed: ${statusResponse.status}`);
      const errorText = await statusResponse.text();
      console.error(errorText);
      process.exit(1);
    }

    const statusData = (await statusResponse.json()) as FalImageResponse;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // Log every single response to see what's happening
    console.log(`\n   [${elapsed}s] Poll #${attempts}:`);
    console.log(`   Status: ${statusData.status || "unknown"}`);

    // Show full response for debugging
    if (attempts <= 3 || statusData.status === "COMPLETED") {
      console.log(`   Full response: ${JSON.stringify(statusData, null, 2)}`);
    }

    // Check if completed
    if (statusData.status === "COMPLETED") {
      console.log(
        `   ✅ Status is COMPLETED! Now fetching result from response_url...`,
      );

      // Fetch the actual result from response_url
      if (!statusData.response_url) {
        throw new Error("No response_url in completed status");
      }

      const resultResponse = await fetch(statusData.response_url, {
        headers: {
          Authorization: `Key ${FAL_KEY}`,
        },
      });

      if (!resultResponse.ok) {
        throw new Error(`Failed to fetch result: ${resultResponse.status}`);
      }

      const resultData = (await resultResponse.json()) as FalImageResponse;
      console.log(`   Result data: ${JSON.stringify(resultData, null, 2)}`);

      if (resultData.images && resultData.images.length > 0) {
        console.log(
          `   ✅ Images ready! Found ${resultData.images.length} image(s)`,
        );
        imageUrl = resultData.images[0]?.url;
      } else {
        throw new Error("No images in completed result");
      }
    } else {
      console.log(`   ⏳ Still processing... (status: ${statusData.status})`);
    }
  }

  console.log("\n");

  // Step 3: Result
  if (!imageUrl) {
    console.error("❌ Image generation timed out after 6 minutes");
    console.error("   This might mean:");
    console.error("   - FAL.ai queue is very slow right now");
    console.error("   - Your API key doesn't have access to this model");
    console.error("   - The API response format has changed");
    process.exit(1);
  }

  console.log("✅ Success! Image generated:");
  console.log(`   ${imageUrl}`);
  console.log(`\n🎉 FAL.ai is working correctly!\n`);
}

// Run test
testFalImage().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});
