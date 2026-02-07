import { Resend } from "resend";
import { env } from "@/env";
import { type TopicKey } from "./resend.constants";

// Re-export TopicKey for convenience
export type { TopicKey };

// =====================================================
// INTERNAL MAPPING
// =====================================================

/**
 * Internal mapping of topic keys to Resend topic IDs
 *
 * IMPORTANT: These IDs are tied to your Resend account.
 * If you recreate topics, update these IDs.
 */
const TOPIC_ID_MAP: Record<TopicKey, string> = {
  "newsletter-general": "fd905a15-f22d-41f2-99dc-7d1befb14fab",
  "newsletter-dating-tips": "76c25611-40e5-4178-9c1d-e8e4b40e5b1f",
  "newsletter-product-updates": "490f7b31-60c2-4cbc-83a1-286e485cd24d",
  "newsletter-research": "90f97717-1e6f-4aed-8966-037e11ee533b",
  "waitlist-profile-compare": "66b842db-f5b1-4b84-923a-5ad8a17fee1f",
  "waitlist-bumble": "3dcbca3d-2141-409f-b792-fa55865b1c36",
  "waitlist-message-analysis": "8c9f81a4-a078-4c2a-b138-d4aa7d90307b",
  "waitlist-directory-profiles": "4ac8edc1-33ac-4008-b873-e76bdbd4e0da",
} as const;

/**
 * Reverse mapping: Resend topic ID -> Topic key
 */
const TOPIC_KEY_MAP: Record<string, TopicKey> = Object.fromEntries(
  Object.entries(TOPIC_ID_MAP).map(([key, id]) => [id, key as TopicKey]),
);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/** Convert topic key to Resend ID */
function getTopicId(key: TopicKey): string {
  return TOPIC_ID_MAP[key];
}

/** Convert Resend ID to topic key */
function getTopicKey(id: string): TopicKey | undefined {
  return TOPIC_KEY_MAP[id];
}

/** Convert array of topic keys to IDs */
function getTopicIds(keys: TopicKey[]): string[] {
  return keys.map(getTopicId);
}

/** Convert array of topic IDs to keys */
function getTopicKeys(ids: string[]): TopicKey[] {
  return ids.map(getTopicKey).filter((k): k is TopicKey => k !== undefined);
}

// =====================================================
// CLIENT
// =====================================================

/**
 * Resend client instance
 * Initialized directly on module load for consistency with other service clients
 */
export const resend = new Resend(env.RESEND_API_KEY);

/**
 * Create or update a contact in Resend
 * Idempotent - safe to call multiple times with same email
 */
export async function createContact(params: {
  email: string;
  unsubscribed?: boolean;
}) {
  const client = resend;

  try {
    const response = await client.contacts.create({
      email: params.email,
      unsubscribed: params.unsubscribed ?? false,
    });

    return { success: true, data: response };
  } catch (error) {
    // Resend returns 400 if contact already exists - handle gracefully
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log(`Contact ${params.email} already exists`);
      return { success: true, alreadyExists: true };
    }

    console.error("Failed to create contact:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * INTERNAL: Fetch all topics for a contact
 */
async function getContactTopics(params: { email: string }) {
  const client = resend;

  try {
    const { data, error } = await client.contacts.topics.list({
      email: params.email,
    });

    if (error) {
      console.error("❌ Failed to get contact topics:", error);
      return { success: false as const, error: error.message };
    }

    console.log(
      `📋 Retrieved ${data?.data?.length || 0} topics for ${params.email}`,
    );
    return { success: true as const, data };
  } catch (error) {
    console.error("❌ Failed to get contact topics:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * INTERNAL: Update all topics for a contact (replaces everything)
 * This is a low-level function - prefer using subscribeToTopics or unsubscribeFromTopics
 */
async function updateContactTopics(params: {
  email: string;
  topics: Array<{ id: string; subscription: "opt_in" | "opt_out" }>;
}) {
  const client = resend;

  try {
    console.log(
      `📝 Updating ${params.topics.length} topic(s) for ${params.email}:`,
      params.topics
        .map((t) => `${t.id.slice(0, 8)}...:${t.subscription}`)
        .join(", "),
    );

    const response = await client.contacts.topics.update({
      email: params.email,
      topics: params.topics,
    });

    console.log(`✅ Updated topics for ${params.email}`);
    return { success: true as const, data: response };
  } catch (error) {
    console.error("❌ Failed to update topics:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Subscribe a contact to specific topics
 *
 * This function uses Resend's MERGE behavior - it only updates the topics
 * specified without affecting other topic subscriptions. No need to fetch
 * existing topics first.
 *
 * Automatically:
 * 1. Creates the contact if needed
 * 2. Waits to respect rate limits (2 req/sec)
 * 3. Updates the specified topics to opt_in
 *
 * Note: Rate limiting waits 700ms between API calls.
 * For high-volume operations, consider implementing a queue system.
 *
 * @example
 * await subscribeToTopics({
 *   email: "user@example.com",
 *   topics: ["newsletter-general", "waitlist-bumble"]
 * });
 */
export async function subscribeToTopics(params: {
  email: string;
  topics: TopicKey[];
}) {
  try {
    // Ensure contact exists
    const _contactResult = await createContact({ email: params.email });

    // Wait to respect 2 req/sec rate limit
    // 700ms ensures we stay under the limit with buffer for API response time
    console.log("⏳ Waiting 700ms to respect rate limits...");
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Convert topic keys to IDs and create opt_in subscriptions
    const topicIds = getTopicIds(params.topics);
    const topics = topicIds.map((id) => ({
      id,
      subscription: "opt_in" as const,
    }));

    // Update topics - Resend merges these with existing subscriptions
    return await updateContactTopics({ email: params.email, topics });
  } catch (error) {
    console.error("❌ Failed to subscribe to topics:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Set exact topic subscription state for a contact.
 *
 * Unlike subscribeToTopics (which only opts in), this function also opts out
 * topics that were previously subscribed but are no longer in the list.
 * Use this when replacing the full set of user preferences (e.g., account settings page).
 */
export async function setTopicSubscriptions(params: {
  email: string;
  topics: TopicKey[];
}) {
  try {
    // Ensure contact exists
    await createContact({ email: params.email });

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Get current topic state to diff
    const currentResult = await getContactTopics({ email: params.email });

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Build update: opt_in for selected, opt_out for previously-subscribed-but-now-removed
    const selectedIds = new Set(getTopicIds(params.topics));
    const topicUpdates: Array<{
      id: string;
      subscription: "opt_in" | "opt_out";
    }> = [];

    // Opt in all selected topics
    for (const id of selectedIds) {
      topicUpdates.push({ id, subscription: "opt_in" });
    }

    // Opt out topics that were opt_in but are no longer selected
    if (currentResult.success && currentResult.data?.data) {
      for (const topic of currentResult.data.data) {
        if (topic.subscription === "opt_in" && !selectedIds.has(topic.id)) {
          topicUpdates.push({ id: topic.id, subscription: "opt_out" });
        }
      }
    }

    if (topicUpdates.length === 0) {
      return { success: true as const };
    }

    return await updateContactTopics({
      email: params.email,
      topics: topicUpdates,
    });
  } catch (error) {
    console.error("❌ Failed to set topic subscriptions:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Unsubscribe a contact from specific topics (preserves other subscriptions)
 *
 * @example
 * await unsubscribeFromTopics({
 *   email: "user@example.com",
 *   topics: ["newsletter-general"]
 * });
 */
export async function unsubscribeFromTopics(params: {
  email: string;
  topics: TopicKey[];
}) {
  try {
    // Get current topics
    const currentTopicsResult = await getContactTopics({ email: params.email });

    if (!currentTopicsResult.success) {
      return currentTopicsResult;
    }

    // Build map of all topics
    const topicsMap = new Map<string, "opt_in" | "opt_out">();

    // Start with current subscriptions
    if (currentTopicsResult.data?.data) {
      currentTopicsResult.data.data.forEach((topic) => {
        topicsMap.set(topic.id, topic.subscription);
      });
    }

    // Set specified topics to opt_out - convert keys to IDs
    const topicIds = getTopicIds(params.topics);
    topicIds.forEach((topicId) => {
      topicsMap.set(topicId, "opt_out");
    });

    // Convert to array for API
    const topics = Array.from(topicsMap.entries()).map(
      ([id, subscription]) => ({ id, subscription }),
    );

    // Update all topics
    return await updateContactTopics({ email: params.email, topics });
  } catch (error) {
    console.error("❌ Failed to unsubscribe from topics:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a contact's topic subscriptions
 *
 * Returns which topics the contact is subscribed to (opt_in) and which they're not (opt_out)
 * Returns topic keys, not UUIDs
 */
export async function getContactTopicSubscriptions(params: {
  email: string;
}): Promise<{
  success: boolean;
  topics?: TopicKey[];
  error?: string;
}> {
  const result = await getContactTopics(params);

  if (!result.success || !result.data?.data) {
    return { success: result.success, error: result.error };
  }

  // Convert IDs to keys and filter for opt_in only
  const subscribedIds = result.data.data
    .filter((topic) => topic.subscription === "opt_in")
    .map((topic) => topic.id);

  const subscribedKeys = getTopicKeys(subscribedIds);

  return { success: true, topics: subscribedKeys };
}
