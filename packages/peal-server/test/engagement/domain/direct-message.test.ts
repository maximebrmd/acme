import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  receiveMessage,
  reconcileMessages,
} from "#engagement/domain/direct-message.ts";
import {
  conversation,
  directMessage,
  directMessageId,
  messageReading,
  messagedAt,
} from "#test/engagement/support.ts";

const since = DateTime.subtractDuration(messagedAt, "1 day");

describe("a direct message", () => {
  it("is kept well formed: no NUL, no lone surrogate (replaced), no control character", () => {
    const message = receiveMessage(
      directMessageId(1),
      conversation(1),
      messageReading(1, {
        attachments: -2,
        senderPlatformId: Option.some("70\u000001"),
        text: "Hi\u0000 there \uD800\u0007!",
      }),
      messagedAt
    );

    expect(message.text).toBe("Hi there \uFFFD!");
    expect(message.senderPlatformId).toStrictEqual(Option.some("7001"));
    expect(message.attachments).toBe(0);
  });

  it("keeps no sender of the account's own", () => {
    const message = directMessage(1, {
      fromAccount: true,
      senderPlatformId: Option.some("1"),
    });

    expect(message.senderPlatformId).toStrictEqual(Option.none());
  });
});

describe("a read of a conversation", () => {
  it("adds what is new and refreshes what its author edited", () => {
    const kept = [directMessage(1), directMessage(2)];

    const changes = reconcileMessages(
      kept,
      [
        messageReading(1),
        messageReading(2, { text: "Edited" }),
        messageReading(3),
      ],
      [],
      false,
      since
    );

    expect(
      changes.fresh.map(({ platformMessageId }) => platformMessageId)
    ).toStrictEqual(["m3"]);
    expect(changes.refreshed.map(({ text }) => text)).toStrictEqual(["Edited"]);
    expect(changes.gone).toStrictEqual([]);
  });

  it("deletes at once what the platform says was deleted", () => {
    const changes = reconcileMessages(
      [directMessage(1), directMessage(2)],
      [messageReading(1), messageReading(2)],
      ["m2", "m9"],
      false,
      since
    );

    expect(changes.gone).toStrictEqual([directMessageId(2)]);
    expect(changes.fresh).toStrictEqual([]);
  });

  it("takes a message it did not see for deleted only when complete, and only since it began", () => {
    const old = directMessage(2, {
      sentAt: DateTime.subtractDuration(since, "1 hour"),
    });

    const kept = [directMessage(1), old];

    expect(reconcileMessages(kept, [], [], false, since).gone).toStrictEqual(
      []
    );
    expect(reconcileMessages(kept, [], [], true, since).gone).toStrictEqual([
      directMessageId(1),
    ]);
  });

  it("passes over a message without an id", () => {
    expect(
      reconcileMessages(
        [],
        [messageReading(1, { platformMessageId: "\u0000" })],
        [],
        true,
        since
      ).fresh
    ).toStrictEqual([]);
  });
});
