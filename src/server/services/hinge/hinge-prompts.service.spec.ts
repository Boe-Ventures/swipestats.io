import { describe, expect, it } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

const { transformHingePromptsForDb } = await import("./hinge.service");

describe("Hinge prompt persistence", () => {
  it("retains an answer when the provider omits the question text", () => {
    const rows = transformHingePromptsForDb(
      [
        {
          id: 42,
          type: "text",
          text: "My answer",
          created: "2024-01-01T00:00:00.000Z",
          user_updated: "2024-01-02T00:00:00.000Z",
        },
      ],
      "hinge-profile",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      providerPromptId: 42,
      prompt: null,
      answerText: "My answer",
    });
  });

  it("normalizes timezone-less prompt timestamps as UTC", () => {
    const rows = transformHingePromptsForDb(
      [
        {
          id: 7,
          type: "text",
          text: "Answer",
          created: "2024-01-01 00:00:00.123456",
          user_updated: "2024-01-02T00:00:00.654321",
        },
      ],
      "hinge-profile",
    );

    expect(rows[0]?.createdPromptAt.toISOString()).toBe(
      "2024-01-01T00:00:00.123Z",
    );
    expect(rows[0]?.updatedPromptAt.toISOString()).toBe(
      "2024-01-02T00:00:00.654Z",
    );
  });
});
