import { describe, expect, test } from "bun:test";
import {
  applyTextReplacements,
  applyQuotedReplacements,
  socialNetworkFromUrl,
  redactTextProfile,
  type TextProfile,
} from "./text-redaction";

// Protect against altered research text, raw fallback on model failure, and
// silently accepting edits against the wrong message. Existing export tests
// do not exercise model decisions or replacement spans.
const conversation = {
  id: "conversation-1",
  messages: [
    {
      id: "message-1",
      content: "Hi Sarah, email me at test@example.com!",
      order: 0,
      sentDate: "2026-01-01",
      messageType: "TEXT",
    },
  ],
};
const profile: TextProfile = {
  profileId: "research-1",
  provider: "TINDER",
  conversations: [conversation],
};

describe("research text processing", () => {
  test("negative Jev decision preserves text and skips redaction for both providers", async () => {
    for (const provider of ["TINDER", "HINGE"] as const) {
      let calls = 0;
      const result = await redactTextProfile(
        { ...profile, provider },
        {
          screen: async () => 0.01,
          redact: async () => {
            calls++;
            throw new Error("Unexpected redaction");
          },
        },
      );
      expect(result.conversations).toEqual(profile.conversations);
      expect(result.processing.flaggedGroups).toBe(0);
      expect(calls).toBe(0);
    }
  });

  test("replaces exact spans and preserves ordinary names and punctuation", () => {
    const original = "test@example.com";
    const start = conversation.messages[0]!.content.indexOf(original);
    const result = applyTextReplacements(conversation, [
      {
        messageId: "message-1",
        start,
        end: start + original.length,
        original,
        category: "EMAIL",
      },
    ]);
    expect(result.messages[0]!.content).toBe("Hi Sarah, email me at [EMAIL]!");
    expect(conversation.messages[0]!.content).toContain(original);
  });

  test("rejects nonexistent messages and spans that do not match the source", () => {
    const edit = {
      messageId: "missing",
      start: 0,
      end: 2,
      original: "Hi",
      category: "FULL_NAME" as const,
    };
    expect(() => applyTextReplacements(conversation, [edit])).toThrow();
    expect(() =>
      applyTextReplacements(conversation, [
        { ...edit, messageId: "message-1", original: "No" },
      ]),
    ).toThrow();
  });

  test("repairs inaccurate offsets only for an unambiguous exact quote", () => {
    const edit = {
      messageId: "message-1",
      start: 0,
      end: 1,
      original: "test@example.com",
      category: "EMAIL" as const,
    };
    expect(
      applyTextReplacements(conversation, [edit]).messages[0]!.content,
    ).toBe("Hi Sarah, email me at [EMAIL]!");
    const repeated = {
      ...conversation,
      messages: [
        {
          ...conversation.messages[0]!,
          content: "test@example.com and test@example.com",
        },
      ],
    };
    expect(() => applyTextReplacements(repeated, [edit])).toThrow();
  });

  test("screening or redaction failure never returns raw text as a successful result", async () => {
    expect(
      redactTextProfile(profile, {
        screen: async () => {
          throw new Error("Unavailable");
        },
        redact: async (value) => value,
      }),
    ).rejects.toThrow();
    expect(
      redactTextProfile(profile, {
        screen: async () => 0.38,
        redact: async () => {
          throw new Error("Unavailable");
        },
      }),
    ).rejects.toThrow();
  });

  test("oversized profiles fall back to conversation scans", async () => {
    const second = { ...conversation, id: "conversation-2" };
    let screens = 0;
    const result = await redactTextProfile(
      { ...profile, conversations: [conversation, second] },
      {
        screen: async (group) => {
          screens++;
          expect(group).toHaveLength(1);
          return 0;
        },
        redact: async (value) => value,
      },
      { maxCharacters: 180 },
    );
    expect(screens).toBe(2);
    expect(result.conversations).toHaveLength(2);
  });
});

// Model offsets failed on real messages, and first-name removal violated policy.
test("exact quotes handle emoji, repeated contacts and duplicate model edits", () => {
  const c = {
    ...conversation,
    messages: [
      {
        ...conversation.messages[0]!,
        content: "😀 test@example.com, again test@example.com",
      },
    ],
  };
  const edit = {
    messageId: "message-1",
    original: "test@example.com",
    occurrence: 0,
    category: "EMAIL" as const,
  };
  const result = applyQuotedReplacements(c, [
    edit,
    edit,
    { ...edit, occurrence: 1 },
  ]);
  expect(result.messages[0]!.content).toBe("😀 [EMAIL], again [EMAIL]");
  expect(() =>
    applyQuotedReplacements(c, [{ ...edit, occurrence: 2 }]),
  ).toThrow();
  expect(() =>
    applyQuotedReplacements(c, [{ ...edit, messageId: "wrong" }]),
  ).toThrow();
});

test("preserves standalone names but still redacts a full name", () => {
  const c = {
    ...conversation,
    messages: [
      { ...conversation.messages[0]!, content: "Hi Priya, I am Priya Sharma" },
    ],
  };
  const result = applyQuotedReplacements(c, [
    {
      messageId: "message-1",
      original: "Priya",
      occurrence: 0,
      category: "FULL_NAME",
    },
    {
      messageId: "message-1",
      original: "Priya Sharma",
      occurrence: 0,
      category: "FULL_NAME",
    },
  ]);
  expect(result.messages[0]!.content).toBe("Hi Priya, I am [FULL_NAME]");
});

test("keeps currency amounts mistakenly labeled as account IDs", () => {
  const c = {
    ...conversation,
    messages: [
      {
        ...conversation.messages[0]!,
        content: "My salary is $55,620 before super",
      },
    ],
  };
  expect(
    applyQuotedReplacements(c, [
      {
        messageId: "message-1",
        original: "$55,620",
        occurrence: 0,
        category: "ACCOUNT_ID",
      },
    ]),
  ).toEqual(c);
});

// Protect useful geography and consistent contact markers at the application boundary.
test("unifies contact markers and preserves public location scopes", () => {
  const c = {
    ...conversation,
    messages: [
      {
        ...conversation.messages[0]!,
        content:
          "My insta is sample_user, https://instagram.com/sample_user. I live in Bristol, on Oak Street.",
      },
    ],
  };
  const result = applyQuotedReplacements(c, [
    {
      messageId: "message-1",
      original: "sample_user",
      occurrence: 0,
      category: "SOCIAL_HANDLE",
    },
    {
      messageId: "message-1",
      original: "https://instagram.com/sample_user",
      occurrence: 0,
      category: "SOCIAL_CONTACT",
    },
    {
      messageId: "message-1",
      original: "Bristol",
      occurrence: 0,
      category: "PRIVATE_LOCATION",
      locationScope: "city_or_town",
    },
    {
      messageId: "message-1",
      original: "Oak Street",
      occurrence: 0,
      category: "PRIVATE_LOCATION",
      locationScope: "residential_street",
    },
  ]);
  expect(result.messages[0]!.content).toBe(
    "My insta is [SOCIAL_HANDLE], [INSTAGRAM_HANDLE]. I live in Bristol, on [PRIVATE_LOCATION].",
  );
  for (const locationScope of ["public_place", "shared_listing"] as const) {
    expect(
      applyQuotedReplacements(c, [
        {
          messageId: "message-1",
          original: "Oak Street",
          occurrence: 0,
          category: "ADDRESS",
          locationScope,
        },
      ]),
    ).toEqual(c);
  }
});

// Preserve platform meaning without guessing from handle spelling or deceptive hosts.
test("uses domain first, explicit network context second, generic marker otherwise", () => {
  const c = {
    ...conversation,
    messages: [
      {
        ...conversation.messages[0]!,
        content: "https://m.me/sample sample_snap mystery",
      },
    ],
  };
  const result = applyQuotedReplacements(c, [
    {
      messageId: "message-1",
      original: "https://m.me/sample",
      occurrence: 0,
      category: "SOCIAL_CONTACT",
      network: "INSTAGRAM",
    },
    {
      messageId: "message-1",
      original: "sample_snap",
      occurrence: 0,
      category: "SOCIAL_CONTACT",
      network: "SNAPCHAT",
    },
    {
      messageId: "message-1",
      original: "mystery",
      occurrence: 0,
      category: "SOCIAL_CONTACT",
      network: null,
    },
  ]);
  expect(result.messages[0]!.content).toBe(
    "[MESSENGER_HANDLE] [SNAPCHAT_HANDLE] [SOCIAL_HANDLE]",
  );
  expect(
    socialNetworkFromUrl("https://instagram.com.evil.example/user"),
  ).toBeNull();
  expect(
    socialNetworkFromUrl("https://instagram.com@evil.example/user"),
  ).toBeNull();
  expect(socialNetworkFromUrl("https://www.instagram.com/user")).toBe(
    "INSTAGRAM",
  );
});

test("preserves the platform label when the model mistakes it for a handle", () => {
  const c = {
    ...conversation,
    messages: [
      { ...conversation.messages[0]!, content: "Ou Jane Smith sur fb" },
    ],
  };
  const result = applyQuotedReplacements(c, [
    {
      messageId: "message-1",
      original: "Jane Smith",
      occurrence: 0,
      category: "SOCIAL_CONTACT",
      network: "FACEBOOK",
    },
    {
      messageId: "message-1",
      original: "fb",
      occurrence: 0,
      category: "SOCIAL_CONTACT",
      network: "FACEBOOK",
    },
  ]);
  expect(result.messages[0]!.content).toBe("Ou [FACEBOOK_HANDLE] sur fb");
});
