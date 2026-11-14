import { describe, expect, it } from "@effect/vitest";
import { DateTime, Duration, Option } from "effect";

import {
  changedSince,
  conversationsKeptFor,
  isConversationKept,
  isUnread,
  markConversationRead,
  refreshConversation,
} from "#engagement/domain/conversation.ts";
import {
  nextBoxRead,
  postponeBoxRead,
  recordBoxRead,
} from "#engagement/domain/message-box.ts";
import { replyWindowOf } from "#engagement/domain/reply-window.ts";
import {
  conversation,
  conversationReading,
  directMessage,
  messageBox,
  messagedAt,
  participant,
} from "#test/engagement/support.ts";

const later = DateTime.addDuration(messagedAt, "1 minute");

describe("a conversation", () => {
  it("keeps one line of each participant, bounded, and drops one without an id", () => {
    const kept = conversation(1, {
      participants: [
        {
          displayName: Option.some("Reader\u0000 ‮one\nnamed"),
          handle: "reader1@social.example",
          platformId: "7001",
        },
        { displayName: Option.none(), handle: "nobody", platformId: "\u0000" },
        {
          displayName: Option.some("\u0000\u0007"),
          handle: "x".repeat(300),
          platformId: "7003",
        },
      ],
    });

    expect(kept.participants.map(({ platformId }) => platformId)).toStrictEqual(
      ["7001", "7003"]
    );
    expect(kept.participants[0]?.displayName).toStrictEqual(
      Option.some("Reader one named")
    );
    expect(kept.participants[1]?.displayName).toStrictEqual(Option.none());
    expect(kept.participants[1]?.handle).toHaveLength(200);
  });

  it("is unread once someone wrote after a member read it", () => {
    const fresh = refreshConversation(conversation(1), conversationReading(1), [
      directMessage(1),
    ]);

    expect(isUnread(fresh)).toBeTruthy();

    const read = markConversationRead(fresh, true, later);

    expect(isUnread(read)).toBeFalsy();
    expect(isUnread(markConversationRead(read, false, later))).toBeTruthy();
  });

  it("is not unread for the account's own messages", () => {
    const own = refreshConversation(conversation(1), conversationReading(1), [
      directMessage(1, { fromAccount: true, senderPlatformId: Option.none() }),
    ]);

    expect(isUnread(own)).toBeFalsy();
    expect(Option.isNone(own.lastIncomingAt)).toBeTruthy();
  });

  it("takes its latest message from what it keeps and what the platform says", () => {
    const sentAt = DateTime.subtractDuration(messagedAt, "1 minute");

    const refreshed = refreshConversation(
      conversation(1),
      conversationReading(1, {
        lastMessageAt: DateTime.subtractDuration(messagedAt, "1 hour"),
        participants: [participant(2)],
        request: true,
        revision: "r2",
      }),
      [directMessage(1, { sentAt })]
    );

    expect(refreshed.lastMessageAt).toStrictEqual(sentAt);
    expect(refreshed.participants).toStrictEqual([participant(2)]);
    expect(refreshed.request).toBeTruthy();
    expect(
      changedSince(refreshed, conversationReading(1, { revision: "r2" }))
    ).toBeFalsy();
    expect(
      changedSince(refreshed, conversationReading(1, { revision: "r3" }))
    ).toBeTruthy();
  });

  it("is kept for 30 days after its last message", () => {
    expect(Duration.toDays(conversationsKeptFor)).toBe(30);
    expect(
      isConversationKept(
        messagedAt,
        DateTime.addDuration(messagedAt, "30 days")
      )
    ).toBeTruthy();
    expect(
      isConversationKept(
        messagedAt,
        DateTime.addDuration(
          messagedAt,
          Duration.sum(Duration.days(30), Duration.seconds(1))
        )
      )
    ).toBeFalsy();
  });

  it("stays open to answers on Mastodon and Bluesky", () => {
    for (const platform of ["mastodon", "bluesky"] as const) {
      expect(
        replyWindowOf(
          platform,
          Option.some(messagedAt),
          DateTime.addDuration(messagedAt, "90 days")
        )
      ).toStrictEqual({ closesAt: Option.none(), open: true });
    }
  });
});

describe("a channel's messages", () => {
  it("are read every run while a message came in the last day, hourly after", () => {
    const recent = Option.some(DateTime.subtractDuration(messagedAt, "1 hour"));
    const old = Option.some(DateTime.subtractDuration(messagedAt, "2 days"));

    expect(nextBoxRead(recent, messagedAt)).toStrictEqual(
      DateTime.addDuration(messagedAt, "10 minutes")
    );
    expect(nextBoxRead(old, messagedAt)).toStrictEqual(
      DateTime.addDuration(messagedAt, "1 hour")
    );
    expect(nextBoxRead(Option.none(), messagedAt)).toStrictEqual(
      DateTime.addDuration(messagedAt, "1 hour")
    );
  });

  it("keep when they were read, and wait when they could not be", () => {
    const recent = Option.some(DateTime.subtractDuration(messagedAt, "1 hour"));
    const read = recordBoxRead(messageBox(), recent, later, messagedAt);

    expect(read.lastReadAt).toStrictEqual(Option.some(later));
    expect(
      postponeBoxRead(read, messagedAt, Duration.hours(6)).nextReadAt
    ).toStrictEqual(DateTime.addDuration(messagedAt, "6 hours"));
    expect(
      postponeBoxRead(read, messagedAt, Duration.hours(6)).lastReadAt
    ).toStrictEqual(Option.some(later));
  });
});
