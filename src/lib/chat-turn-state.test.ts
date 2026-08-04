import { describe, expect, test } from "bun:test";

import {
  shouldShowMidTurnShimmer,
  shouldShowPendingTurn,
  turnHasVisibleContent,
} from "./chat-turn-state";

const user = (text: string) => ({
  role: "user",
  parts: [{ type: "text", text }],
});

describe("shouldShowPendingTurn", () => {
  test("stays hidden when the chat is idle", () => {
    expect(
      shouldShowPendingTurn({ status: "ready", messages: [user("hi")] }),
    ).toBe(false);
  });

  test("shows once the request is in flight", () => {
    expect(
      shouldShowPendingTurn({ status: "submitted", messages: [user("hi")] }),
    ).toBe(true);
  });

  test("stays visible when the stream opens an empty assistant shell", () => {
    // The regression this module exists for: the SDK creates the assistant
    // message on the stream's first chunk, long before any token arrives.
    expect(
      shouldShowPendingTurn({
        status: "streaming",
        messages: [
          user("hi"),
          { role: "assistant", parts: [{ type: "step-start" }] },
        ],
      }),
    ).toBe(true);
  });

  test("yields to streaming prose", () => {
    expect(
      shouldShowPendingTurn({
        status: "streaming",
        messages: [
          user("hi"),
          { role: "assistant", parts: [{ type: "text", text: "Your top" }] },
        ],
      }),
    ).toBe(false);
  });

  test("yields to a tool card running under its own label", () => {
    expect(
      shouldShowPendingTurn({
        status: "streaming",
        messages: [
          user("hi"),
          {
            role: "assistant",
            parts: [{ type: "tool-matchStats", state: "input-available" }],
          },
        ],
      }),
    ).toBe(false);
  });

  test("does not nag while a tool waits on the user's approval", () => {
    expect(
      shouldShowPendingTurn({
        status: "streaming",
        messages: [
          user("hi"),
          {
            role: "assistant",
            parts: [{ type: "tool-deleteData", state: "approval-requested" }],
          },
        ],
      }),
    ).toBe(false);
  });
});

describe("shouldShowMidTurnShimmer", () => {
  test("shows between steps once a tool card has settled", () => {
    expect(
      shouldShowMidTurnShimmer({
        status: "streaming",
        messages: [
          user("hi"),
          {
            role: "assistant",
            parts: [
              { type: "text", text: "Pulling your matches." },
              { type: "tool-matchStats", state: "output-available" },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  test("stays hidden before the reply has drawn anything", () => {
    // That phase belongs to the pending turn, which carries an avatar.
    expect(
      shouldShowMidTurnShimmer({
        status: "streaming",
        messages: [
          user("hi"),
          { role: "assistant", parts: [{ type: "step-start" }] },
        ],
      }),
    ).toBe(false);
  });

  test("is mutually exclusive with the pending turn", () => {
    const cases = [
      { status: "submitted", messages: [user("hi")] },
      {
        status: "streaming",
        messages: [
          user("hi"),
          { role: "assistant", parts: [{ type: "step-start" }] },
        ],
      },
      {
        status: "streaming",
        messages: [
          user("hi"),
          {
            role: "assistant",
            parts: [{ type: "tool-matchStats", state: "output-available" }],
          },
        ],
      },
      {
        status: "streaming",
        messages: [
          user("hi"),
          { role: "assistant", parts: [{ type: "text", text: "Here" }] },
        ],
      },
    ];
    for (const input of cases) {
      expect(
        shouldShowPendingTurn(input) && shouldShowMidTurnShimmer(input),
      ).toBe(false);
    }
  });
});

describe("turnHasVisibleContent", () => {
  test("treats an empty streaming shell as having nothing to draw", () => {
    expect(
      turnHasVisibleContent({
        role: "assistant",
        parts: [{ type: "step-start" }],
      }),
    ).toBe(false);
  });

  test("treats whitespace-only prose as having nothing to draw", () => {
    expect(
      turnHasVisibleContent({
        role: "assistant",
        parts: [{ type: "text", text: "  \n " }],
      }),
    ).toBe(false);
  });

  test("counts a tool card in any state", () => {
    expect(
      turnHasVisibleContent({
        role: "assistant",
        parts: [{ type: "tool-matchStats", state: "input-streaming" }],
      }),
    ).toBe(true);
  });
});
