/**
 * Generate social media videos for Homi.so
 * Run with: bun run src/scripts/generate-homi-video.ts [angle-key]
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
  "37-percent-rule": {
    name: "The 37% Rule for House Hunting",
    description:
      "Mathematical strategy to find your perfect home - explore 37%, then commit",
    prompt: `Create a short video script for Homi.so - a collaborative home hunting platform.

GOAL: Get viewers intrigued by the 37% rule and curious about using Homi to implement it.

SCENARIO: An attractive, confident woman in her late twenties is sharing a "life hack" she discovered for house hunting. She's the type of person who does her research and wants to share something genuinely useful. She's speaking directly to camera like she's telling a friend about something that worked for her.

THE 37% RULE EXPLAINED:
- It's a mathematically proven strategy from computer science (optimal stopping problem)
- Spend exactly 37% of your house hunting timeline exploring WITHOUT making offers
- Document everything, establish your standards and benchmarks
- Then commit immediately to the first home that exceeds those benchmarks
- This maximizes your chances of finding the best possible home

WHY IT WORKS:
- Eliminates two costly mistakes: committing too early OR searching forever
- Builds genuine confidence because you've done the research
- Creates healthy urgency to actually make a decision
- It's backed by decades of mathematical research

HOMI.SO TIE-IN (subtle, not salesy):
- Homi helps you track and compare properties during that crucial exploration phase
- You can document what you've seen, set benchmarks, and know when you've found "the one"
- Think Pinterest meets CRM for home search

TONE: Smart, helpful, like sharing insider knowledge. Confident but not preachy. "Let me tell you something that actually works" energy.

AVOID: Being salesy, sounding like an ad, being too academic, oversimplifying

EXAMPLES OF GOOD ANGLES:
- "There's a math equation for finding your perfect home. Sounds crazy but it works."
- "The 37% rule changed how I think about house hunting. Let me explain."
- "Most people either settle too fast or search forever. There's a better way."

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}

Make it feel like genuine advice from someone who's done their homework, not an advertisement.`,
  },

  "spreadsheet-chaos": {
    name: "Escape Spreadsheet Chaos",
    description:
      "Relatable pain point - scattered bookmarks and messy spreadsheets",
    prompt: `Create a short video script for Homi.so - a collaborative home hunting platform.

GOAL: Get viewers who are currently house hunting to try Homi.

SCENARIO: An attractive, confident woman in her late twenties is venting about the chaos of house hunting - the scattered Zillow bookmarks, the Google Sheets with 47 columns, the endless browser tabs. She found a better way and wants to share it.

THE PAIN POINTS:
- Bookmarks scattered across 5 different real estate sites
- Spreadsheets that started organized and became monsters
- Can't remember which apartment had the good kitchen vs the one with parking
- Partner/roommate asking "wait, which one was that again?"
- Photos mixed up, notes lost, comparisons impossible

THE SOLUTION (Homi.so):
- One place for all your listings from any site
- Auto-extracts details so you don't manually copy everything
- Real cost calculations (mortgage + HOA + utilities)
- Share with partner/roommate/agent in real-time
- "Pinterest meets CRM for home search"

TONE: Relatable frustration turning to relief. "Finally, someone gets it" energy. Casual and authentic.

AVOID: Being too negative, making it sound complicated, sounding like an infomercial

EXAMPLES OF GOOD ANGLES:
- "If your house hunting spreadsheet has more than 10 columns, you need to hear this"
- "My Zillow bookmarks were a mess. Then I found something better."
- "House hunting doesn't have to mean 47 browser tabs and a chaotic spreadsheet"

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "couples-decision": {
    name: "House Hunting as a Couple",
    description:
      "Making the biggest purchase together without losing your mind",
    prompt: `Create a short video script for Homi.so - a collaborative home hunting platform.

GOAL: Get couples who are house hunting together to try Homi.

SCENARIO: An attractive, confident woman in her late twenties is speaking about the challenge of house hunting with a partner. Different priorities, different schedules, the "which one was that?" conversations. She found a way to stay on the same page.

THE CHALLENGES:
- One person loves a place, other hasn't seen it yet
- "Wait, is this the one with the balcony or the one near the park?"
- One person tracks everything, other just wants to be told what to do
- Different priorities (commute vs space vs neighborhood)
- Trying to sync schedules for viewings

HOW HOMI HELPS:
- Both partners see the same list in real-time
- Rate and comment on properties independently
- Compare priorities side by side
- No more "I sent you that listing last week" arguments
- AI helps calculate true costs so you can agree on budget

TONE: Warm, understanding, slightly humorous about relationship dynamics. "We've all been there" energy.

AVOID: Making it about conflict, being preachy about relationships, stereotypes

EXAMPLES OF GOOD ANGLES:
- "House hunting with your partner doesn't have to mean endless 'which one was that' conversations"
- "My boyfriend and I finally stopped arguing about apartments. Here's how."
- "The secret to house hunting as a couple? Actually being on the same page. Literally."

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "true-cost": {
    name: "The True Cost Calculator",
    description:
      "Most people only look at purchase price - show the real monthly cost",
    prompt: `Create a short video script for Homi.so - a collaborative home hunting platform.

GOAL: Get viewers to realize they're not calculating home costs correctly.

SCENARIO: An attractive, confident woman in her late twenties is sharing a "wake up call" moment about home buying. She thought she could afford a place, then calculated the REAL monthly cost and was shocked. Now she uses a tool that does this automatically.

THE INSIGHT:
- Most people only look at purchase price or mortgage payment
- Real monthly cost includes: mortgage + property tax + HOA + utilities + insurance + maintenance
- That $400k home might cost 40% more monthly than you thought
- Remodel costs can add years of payments
- Rental income potential can offset (if applicable)

HOW HOMI CALCULATES:
- Automatic true monthly cost for every listing
- Factors in HOA, estimated utilities, remodel needs
- AI estimates costs you might miss
- Compare properties by actual affordability, not just price

TONE: Eye-opening, helpful, like a smart friend giving financial advice. Not scary or judgmental.

AVOID: Being preachy about money, making people feel dumb, being too technical

EXAMPLES OF GOOD ANGLES:
- "The price tag on a home is only half the story. Here's what you're actually paying."
- "I thought I could afford that apartment. Then I calculated the real monthly cost."
- "Stop looking at purchase price. Start looking at this number instead."

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },

  "first-time-buyer": {
    name: "First-Time Buyer Guide",
    description: "Overwhelmed first-time buyer finds clarity",
    prompt: `Create a short video script for Homi.so - a collaborative home hunting platform.

GOAL: Help overwhelmed first-time home buyers feel like they can do this.

SCENARIO: An attractive, confident woman in her late twenties remembers being completely overwhelmed as a first-time buyer. So much to learn, so many listings, so many decisions. She found a tool that made it manageable.

THE OVERWHELM:
- Don't know what to look for
- Can't tell good deals from bad ones
- Information scattered everywhere
- Parents/friends giving conflicting advice
- Analysis paralysis from too many options

HOW HOMI HELPS BEGINNERS:
- AI analyzes listings for you (flags issues, estimates costs)
- One organized place instead of browser chaos
- True cost calculator so you know what you can actually afford
- Collaborate with parents/agent who can guide you
- Compare properties side by side to learn what you want

TONE: Empathetic, encouraging, "I've been there" energy. Not condescending.

AVOID: Making buyers feel dumb, being too basic, sounding like an ad

EXAMPLES OF GOOD ANGLES:
- "First time buying a home? Here's the tool I wish I had."
- "House hunting felt impossible until I found a way to actually organize it all."
- "I was completely overwhelmed by home buying. Then I found this."

OUTPUT FORMAT (JSON):
{
  "spoken": "The exact words to be spoken (8 seconds max, ~20-30 words)",
  "title": "Short TikTok/Instagram title (max 100 chars)",
  "hook": "First 2-3 words that grab attention"
}`,
  },
};

// ============================================
// IMAGE PROMPTS FOR DIFFERENT ANGLES
// ============================================

const IMAGE_PROMPTS: Record<string, string> = {
  default: `An attractive woman in her late twenties speaking directly to camera. She has a confident, knowledgeable but approachable expression - mid-sentence, sharing advice. She's wearing a visible clip-on/lapel microphone. Casual but put-together look - nice sweater or blouse, minimal jewelry, natural makeup. She has warm, trustworthy energy - someone you'd listen to for life advice. Background: modern, bright apartment or co-working space with plants and natural light. Good lighting on her face. She's gesturing naturally while speaking, engaged with camera. The aesthetic is professional content creator meets relatable friend. Camera angle: straight-on, slightly above eye level. High quality but authentic, not overly staged. NO laptops, phones, or screens visible in frame - just her talking.`,
};

// ============================================
// API CONFIGURATION
// ============================================

const FAL_KEY = process.env.FAL_KEY;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

if (!FAL_KEY) {
  console.error("Missing FAL_KEY environment variable");
  process.exit(1);
}

const OUTPUT_DIR = path.join(process.cwd(), "generated-videos/homi");

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
  console.log(`\n Generating content for: ${angle.name}`);
  console.log(`   ${angle.description}\n`);

  const result = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    output: Output.object({ schema: generatedContentSchema }),
    prompt: angle.prompt,
    temperature: 1.0,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "homi-video-content-generation",
    },
  });

  const generated = result.output;

  console.log(`Content generated:`);
  console.log(`   Title: ${generated.title}`);
  console.log(`   Hook: ${generated.hook}`);
  console.log(`   Spoken: ${generated.spoken}`);

  return generated;
}

async function generateImage(prompt: string): Promise<string> {
  console.log("\n Generating image...");

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
  const maxAttempts = 60;
  const pollInterval = 3000;

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
  console.log(`Image generated: ${imageUrl}`);
  return imageUrl ?? "";
}

async function generateVideo(
  imageUrl: string,
  spokenText: string,
): Promise<string> {
  console.log("\n Generating video...");

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
        prompt: `LANGUAGE: English. ACCENT: American. DIALOGUE: "${spokenText}" — Woman speaking to camera, confident and knowledgeable, warm delivery. Like giving advice to a friend.`,
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
  const maxAttempts = 120;
  const pollInterval = 5000;

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
  console.log(`Video generated: ${videoUrl}`);
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
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sessionDir = path.join(OUTPUT_DIR, `${angleKey}_${timestamp}`);
  await fs.mkdir(sessionDir, { recursive: true });

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

  console.log("\n Downloading image...");
  const imagePath = path.join(sessionDir, "image.png");
  await downloadFile(imageUrl, imagePath);
  console.log(`Saved: ${imagePath}`);

  console.log("\n Downloading video...");
  const videoPath = path.join(sessionDir, "video.mp4");
  await downloadFile(videoUrl, videoPath);
  console.log(`Saved: ${videoPath}`);

  return sessionDir;
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
  const angleArg = process.argv[2];

  if (angleArg === "--list") {
    console.log("\n Available content angles for Homi.so:\n");
    Object.entries(CONTENT_ANGLES).forEach(([key, angle]) => {
      console.log(`  ${key.padEnd(20)} - ${angle.description}`);
    });
    console.log(
      `\nUsage: bun run src/scripts/generate-homi-video.ts [angle-key]\n`,
    );
    return;
  }

  const angleKey = angleArg || "37-percent-rule";
  const angle = CONTENT_ANGLES[angleKey];

  if (!angle) {
    console.error(`\n Unknown angle: ${angleKey}`);
    console.log("\nAvailable angles:");
    Object.keys(CONTENT_ANGLES).forEach((key) => console.log(`  - ${key}`));
    console.log(`\nOr use --list to see all angles with descriptions\n`);
    process.exit(1);
  }

  console.log("========================================");
  console.log("   Homi.so Video Generation Pipeline   ");
  console.log("========================================");

  try {
    // Step 1: Generate content
    const content = await generateContent(angle);

    // Step 2: Generate image
    const imagePrompt = IMAGE_PROMPTS[angleKey] || IMAGE_PROMPTS.default;
    const imageUrl = await generateImage(imagePrompt ?? "");

    // Step 3: Generate video
    const videoUrl = await generateVideo(imageUrl, content.spoken);

    // Step 4: Save everything
    const outputDir = await saveOutputs(angleKey, content, imageUrl, videoUrl);

    console.log("\n========================================");
    console.log("            COMPLETE!                   ");
    console.log("========================================");
    console.log(`\n Output saved to: ${outputDir}`);
    console.log(`\n Video title: ${content.title}`);
    console.log(` Script: ${content.spoken}\n`);
  } catch (error) {
    console.error("\n Error:", error);
    process.exit(1);
  }
}

void main();
