/**
 * Generate social media testimonial videos for SwipeStats
 * Run with: bun run src/scripts/generate-social-video.ts [angle-key]
 */

import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

// ============================================
// CONFIGURATION - Easy to modify and test
// ============================================

type ContentAngle = {
  name: string;
  description: string;
  prompt: string;
};

const CONTENT_ANGLES: Record<string, ContentAngle> = {
  "stats-reaction": {
    name: "Reacting to Stats Visualization",
    description: "Amused/entertained by seeing dating data visualized",
    prompt: `Create a short testimonial video script for SwipeStats.

GOAL: Get people to request their GDPR data to see their stats visualized.

SCENARIO: Someone just uploaded their Tinder data to SwipeStats and is looking at the visualizations - graphs, charts, percentiles. They're entertained and finding it genuinely interesting. It's like seeing your Spotify Wrapped but for dating.

KEY MESSAGE:
- SwipeStats turns your raw data into cool visualizations
- You can see patterns you never noticed
- It's actually pretty interesting/funny to see it all laid out
- Request your data from Tinder, then upload to SwipeStats

TONE: Amused, entertained, self-aware. Like showing a friend something mildly interesting. "Huh, that's actually kinda cool" energy, not shocked or amazed.

AVOID: Overhype, shock value, privacy concerns, making it sound too serious

EXAMPLES OF GOOD ANGLES:
- "SwipeStats turned my Tinder data into these graphs and honestly it's kinda satisfying to look at"
- "Seeing three years of swiping visualized is weirdly entertaining"
- "SwipeStats shows you patterns you'd never notice just using the app"

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}

Make it feel authentic - someone casually sharing something interesting they found.`,
  },

  "match-rate-reveal": {
    name: "Match Rate Discovery",
    description: "Finding out your actual match rate with SwipeStats",
    prompt: `Create a short testimonial video script for SwipeStats.

GOAL: Get people curious about their own match rate stats.

SCENARIO: Someone is looking at their SwipeStats dashboard and seeing their actual match rate for the first time, visualized with charts and percentile comparisons. They're finding it interesting/funny, not embarrassed.

KEY NUMBERS TO REFERENCE (realistic):
- Typical male match rate: ~1-5%
- Typical female match rate: ~40-60%
- SwipeStats shows percentiles (top 10%, median, etc.)

TONE: Casually interested, self-aware humor okay. Like reading interesting facts about yourself. Not self-deprecating or bragging.

AVOID: Making anyone feel bad, gender war content, overly serious

EXAMPLES OF GOOD ANGLES:
- "SwipeStats shows your match rate with percentiles. Mine is actually higher than average, kinda interesting"
- "18% match rate. SwipeStats says that's like top 40% for my city. Honestly thought it'd be worse"
- "Seeing your match rate visualized over time is weirdly satisfying"

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "swipe-patterns": {
    name: "Swipe Patterns Visualization",
    description: "Seeing your swiping behavior visualized over time",
    prompt: `Create a short testimonial video script for SwipeStats.

GOAL: Get people curious about their swiping patterns.

SCENARIO: Someone is looking at their SwipeStats charts showing swipe activity over time - weekly patterns, total counts, right vs left ratio. They're finding it interesting to see their behavior quantified and visualized.

TYPICAL INSIGHTS:
- Most active swiping days/times
- Total swipes (often thousands)
- Right swipe % (how selective you are)
- Activity spikes (weekends, after breakups, etc.)

TONE: Genuinely curious, finding it interesting. Like looking at your year in review stats. Self-aware but not judgmental.

AVOID: Shame, addiction framing, making it sound like a problem

EXAMPLES OF GOOD ANGLES:
- "SwipeStats shows when you're most active swiping. Mine peaks every Sunday night, kinda interesting"
- "Seeing your swiping patterns as actual graphs is weirdly satisfying"
- "I swipe way more selectively than I thought. My right swipe rate is like 15%"

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "gdpr-how-to": {
    name: "How to Request Your Data",
    description: "Simple explainer on requesting GDPR data",
    prompt: `Create a short testimonial video script for SwipeStats.

GOAL: Get people to actually request their Tinder/Hinge data RIGHT NOW.

SCENARIO: Someone explaining how easy it is to request your dating app data. Trying to get viewers to pause the video and do it immediately because it's quick (takes 2 minutes) but you'll forget if you don't do it now.

KEY POINTS:
- It's free (GDPR right)
- Takes 2 minutes to request
- They email you in 1-3 days
- Then you can see EVERYTHING at SwipeStats.io

TONE: Helpful, urgent but not pushy. "Do this now before you forget"

AVOID: Technical jargon, making it sound complicated, long instructions

EXAMPLES OF GOOD ANGLES:
- "It takes 2 minutes to request your Tinder data. Do it right now, I'll wait."
- "Go to Tinder settings > Download my data. That's it. You'll get it in 2 days."
- "Before you scroll to the next video, go request your Tinder data real quick"

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "message-history": {
    name: "Complete Message History",
    description: "Realizing you can see every message you've ever sent",
    prompt: `Create a short testimonial video script for SwipeStats.

GOAL: Get people curious about their message history to request data.

SCENARIO: Someone discovered they can see EVERY message they've sent on Tinder/Hinge ever - even from years ago, even from deleted conversations. Some are cringe, some are funny, all are interesting.

ANGLE: The "digital archaeology" of your dating life. It's like reading your old diary but way more embarrassing.

TONE: Amused, slightly cringing at past self, but ultimately curious and entertained

AVOID: Actual cringe content, oversharing, making it sound embarrassing (should be intriguing)

EXAMPLES OF GOOD ANGLES:
- "Your Tinder data has every message you've sent. Even the ones from 2018. Yes, even those."
- "Downloaded my Tinder data and found my opening message from 4 years ago. Yikes."
- "Tinder keeps all your messages forever. Even the conversations you deleted."

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "comparison-teaser": {
    name: "Compare Yourself to Others",
    description: "The ability to benchmark your stats against others",
    prompt: `Create a short testimonial video script for SwipeStats.

GOAL: Use social comparison as motivation to request data.

SCENARIO: Someone is looking at SwipeStats directory and comparing their stats to others in their city/age/gender. They're either pleasantly surprised or motivated to improve. Either way, they're curious about where they stand.

KEY FEATURES:
- Compare match rate, response time, swipe ratio
- Filter by gender, age, location
- See percentiles (top 10%, bottom 25%, etc.)

TONE: Competitive but lighthearted. Gaming/leaderboard energy, not toxic comparison

AVOID: Gender war content, toxic comparison, making anyone feel bad

EXAMPLES OF GOOD ANGLES:
- "SwipeStats shows I'm in the bottom 30% for match rate in my city. Time to fix my profile."
- "My match rate is 18%. Thought that was bad until I saw I'm actually above average."
- "Finally get to see how my dating profile compares to others in NYC"

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "dating-coach": {
    name: "Dating Coach Uses SwipeStats",
    description:
      "Professional dating coach explains how she uses SwipeStats to track client progress",
    prompt: `Create a short video script for a dating coach talking about SwipeStats.

GOAL: Position SwipeStats as a professional tool used by dating coaches.

SCENARIO: A female dating coach (late 20s-early 30s) is speaking directly to camera, explaining her data-driven approach. She makes all her clients upload their Tinder/Hinge data to SwipeStats before starting coaching, and then tracks progress after. Professional but approachable.

COACH PROFILE:
- Confident, knowledgeable, credible
- Takes dating seriously but not too seriously
- Uses data to help clients improve
- Professional coach, not just an influencer giving advice

TONE: Professional but conversational. Expert sharing her method. Confident without being arrogant.

AVOID: Being preachy, overselling, sounding like an ad, generic dating advice

EXAMPLES OF GOOD ANGLES:
- "First thing I make all my clients do is upload their SwipeStats. You can't improve what you don't measure."
- "I track every client's before and after on SwipeStats. The match rate improvements are wild."
- "SwipeStats shows exactly what's working and what's not. Makes my job way easier."

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}

Make it sound like an expert who uses this tool professionally, not someone discovering it.`,
  },
};

// ============================================
// IMAGE PROMPTS FOR DIFFERENT ANGLES
// ============================================

const IMAGE_PROMPTS: Record<string, string> = {
  "dating-coach": `An attractive female dating coach in her late 20s to early 30s, speaking directly to camera. She's wearing a visible clip-on/lapel microphone. Professional but approachable look - nice casual blouse or sweater, minimal jewelry, natural makeup that looks polished. She has a confident, knowledgeable expression - mid-sentence explaining something. Background: modern office/coaching space with bookshelf or plants, good natural lighting. She's gesturing naturally while speaking, engaged with the camera. The aesthetic is professional content creator/expert, not influencer. Realistic and credible, someone you'd trust for advice. Camera angle: straight-on, slightly above eye level. High quality but authentic, not overly staged. NO laptops or screens visible.`,

  default: `An attractive guy in his mid-20s filming a selfie-style video, speaking directly to camera. He has an amused, slightly entertained expression - genuine smile, mid-sentence. Casual setting (bedroom/living room), good natural lighting. He's well-groomed, wearing a simple t-shirt or hoodie. Clean background with maybe a plant or bookshelf visible. The vibe is casual and authentic - like talking to a friend. Authentic selfie video aesthetic, camera at slight upward angle. Real and relatable, not staged or overly polished. NO laptops, phones, or computer screens visible in frame - just the person talking.`,
};

// ============================================
// API CONFIGURATION
// ============================================

const FAL_KEY = process.env.FAL_KEY;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ Missing ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

if (!FAL_KEY) {
  console.error("❌ Missing FAL_KEY environment variable");
  process.exit(1);
}

const OUTPUT_DIR = path.join(process.cwd(), "generated-videos");

// ============================================
// SCHEMAS & TYPES
// ============================================

const generatedContentSchema = z.object({
  spoken: z
    .string()
    .describe("The exact words to be spoken (8 seconds max, ~20-30 words)"),
  title: z.string().max(100).describe("Short TikTok/Instagram title"),
  hook: z.string().describe("First 2-3 words that grab attention"),
});

type GeneratedContent = z.infer<typeof generatedContentSchema>;

type FalImageResponse = {
  request_id: string;
  status_url: string;
  response_url?: string;
  status?: string;
  images?: Array<{ url: string }>;
};

type FalVideoResponse = {
  request_id: string;
  status_url: string;
  response_url?: string;
  status?: string;
  video?: { url: string };
};

// ============================================
// MAIN FUNCTIONS
// ============================================

async function generateContent(angle: ContentAngle): Promise<GeneratedContent> {
  console.log(`\n📝 Generating content for: ${angle.name}`);
  console.log(`   ${angle.description}\n`);

  const result = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    output: Output.object({ schema: generatedContentSchema }),
    prompt: angle.prompt,
    temperature: 1.0,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "swipestats-video-content-generation",
    },
  });

  const generated = result.output;

  console.log(`✅ Content generated:`);
  console.log(`   Title: ${generated.title}`);
  console.log(`   Hook: ${generated.hook}`);
  console.log(`   Spoken: ${generated.spoken}`);

  return generated;
}

async function generateImage(prompt: string): Promise<string> {
  console.log("\n🎨 Generating image...");

  // FAL.ai Queue API has 3 steps:
  // 1. POST to queue → get status_url and response_url
  // 2. Poll status_url until status: "COMPLETED"
  // 3. GET response_url to retrieve the actual result with images
  const response = await fetch("https://queue.fal.run/fal-ai/gpt-image-1.5", {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "1024x1536",
      num_images: 1,
      output_format: "png",
      quality: "medium",
    }),
  });

  const data = (await response.json()) as FalImageResponse;
  console.log(`   Request ID: ${data.request_id}`);

  // Poll for completion - images typically take 20-60 seconds
  let completed = false;
  let attempts = 0;
  const maxAttempts = 60; // 60 attempts × 3s = 3 minutes max
  const pollInterval = 3000; // Check every 3 seconds

  while (!completed && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    attempts++;

    const statusResponse = await fetch(data.status_url, {
      headers: {
        Authorization: `Key ${FAL_KEY}`,
      },
    });

    const statusData = (await statusResponse.json()) as FalImageResponse;

    if (statusData.status === "COMPLETED") {
      completed = true;
    }

    const elapsed = Math.floor((attempts * pollInterval) / 1000);
    process.stdout.write(
      `\r   Polling... ${elapsed}s elapsed (${attempts}/${maxAttempts})`,
    );
  }

  if (!completed) {
    throw new Error("Image generation timed out after 3 minutes");
  }

  // Fetch the actual result from response_url
  console.log(`\n   Fetching result...`);
  const resultResponse = await fetch(data.response_url!, {
    headers: {
      Authorization: `Key ${FAL_KEY}`,
    },
  });

  const resultData = (await resultResponse.json()) as FalImageResponse;

  if (!resultData.images || resultData.images.length === 0) {
    throw new Error("No images in completed result");
  }

  const imageUrl = resultData.images?.[0]?.url;
  console.log(`✅ Image generated: ${imageUrl}`);
  return imageUrl ?? "";
}

async function generateVideo(
  imageUrl: string,
  spokenText: string,
): Promise<string> {
  console.log("\n🎬 Generating video...");

  const response = await fetch(
    "https://queue.fal.run/fal-ai/veo3.1/fast/image-to-video",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: `LANGUAGE: English. ACCENT: American. DIALOGUE: "${spokenText}" — Person speaking to camera, relaxed, natural delivery and pace. Casual and authentic.`,
        aspect_ratio: "9:16",
        duration: "8s",
        resolution: "1080p",
        generate_audio: true,
      }),
    },
  );

  const data = (await response.json()) as FalVideoResponse;
  console.log(`   Request ID: ${data.request_id}`);

  // Poll for completion - videos can take 5-10 minutes
  let completed = false;
  let attempts = 0;
  const maxAttempts = 120; // 120 attempts × 5s = 10 minutes max
  const pollInterval = 5000; // Check every 5 seconds

  while (!completed && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    attempts++;

    const statusResponse = await fetch(data.status_url, {
      headers: {
        Authorization: `Key ${FAL_KEY}`,
      },
    });

    const statusData = (await statusResponse.json()) as FalVideoResponse;

    if (statusData.status === "COMPLETED") {
      completed = true;
    }

    const elapsed = Math.floor((attempts * pollInterval) / 1000);
    process.stdout.write(
      `\r   Polling... ${elapsed}s elapsed (${attempts}/${maxAttempts})`,
    );
  }

  if (!completed) {
    throw new Error("Video generation timed out after 10 minutes");
  }

  // Fetch the actual result from response_url
  console.log(`\n   Fetching result...`);
  const resultResponse = await fetch(data.response_url!, {
    headers: {
      Authorization: `Key ${FAL_KEY}`,
    },
  });

  const resultData = (await resultResponse.json()) as FalVideoResponse;

  if (!resultData.video?.url) {
    throw new Error("No video in completed result");
  }

  const videoUrl = resultData.video.url;
  console.log(`✅ Video generated: ${videoUrl}`);
  return videoUrl;
}

async function downloadFile(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  await fs.writeFile(filepath, Buffer.from(buffer));
}

async function saveOutputs(
  angleKey: string,
  content: GeneratedContent,
  imageUrl: string,
  videoUrl: string,
): Promise<string> {
  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionDir = path.join(OUTPUT_DIR, `${angleKey}_${timestamp}`);
  await fs.mkdir(sessionDir, { recursive: true });

  // Save metadata
  const metadata = {
    angle: angleKey,
    timestamp,
    content,
    imageUrl,
    videoUrl,
  };

  await fs.writeFile(
    path.join(sessionDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
  );

  // Download and save image
  console.log("\n💾 Downloading image...");
  const imagePath = path.join(sessionDir, "image.png");
  await downloadFile(imageUrl, imagePath);
  console.log(`✅ Saved: ${imagePath}`);

  // Download and save video
  console.log("\n💾 Downloading video...");
  const videoPath = path.join(sessionDir, "video.mp4");
  await downloadFile(videoUrl, videoPath);
  console.log(`✅ Saved: ${videoPath}`);

  return sessionDir;
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
  const angleArg = process.argv[2];

  if (angleArg === "--list") {
    console.log("\n📋 Available content angles:\n");
    Object.entries(CONTENT_ANGLES).forEach(([key, angle]) => {
      console.log(`  ${key.padEnd(15)} - ${angle.description}`);
    });
    console.log(
      `\nUsage: bun run src/scripts/generate-social-video.ts [angle-key]\n`,
    );
    return;
  }

  const angleKey = angleArg || "stats-reaction";
  const angle = CONTENT_ANGLES[angleKey];

  if (!angle) {
    console.error(`\n❌ Unknown angle: ${angleKey}`);
    console.log("\nAvailable angles:");
    Object.keys(CONTENT_ANGLES).forEach((key) => console.log(`  - ${key}`));
    console.log(`\nOr use --list to see all angles with descriptions\n`);
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════════╗");
  console.log("║   SwipeStats Video Generation Pipeline        ║");
  console.log("╚════════════════════════════════════════════════╝");

  try {
    // Step 1: Generate content
    const content = await generateContent(angle);

    // Step 2: Generate image with appropriate prompt for this angle
    const imagePrompt = IMAGE_PROMPTS[angleKey] || IMAGE_PROMPTS.default;
    const imageUrl = await generateImage(imagePrompt ?? "");

    // Step 3: Generate video
    const videoUrl = await generateVideo(imageUrl, content.spoken);

    // Step 4: Save everything
    const outputDir = await saveOutputs(angleKey, content, imageUrl, videoUrl);

    console.log("\n╔════════════════════════════════════════════════╗");
    console.log("║              ✅ COMPLETE!                      ║");
    console.log("╚════════════════════════════════════════════════╝");
    console.log(`\n📁 Output saved to: ${outputDir}`);
    console.log(`\n🎬 Video title: ${content.title}`);
    console.log(`🗣️  Script: ${content.spoken}\n`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

void main();
