import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import type { InboxComment, InboxReply } from "peal-contract";

import {
  anySending,
  nestComments,
  pendingReplyTo,
  withSentReplies,
} from "#inbox/thread-tree.ts";

const at = DateTime.makeUnsafe("2026-11-10T09:00:00Z");

const comment = (id: string, parentId: string | null): InboxComment => ({
  author: { displayName: null, handle: "ada.example", platformId: id },
  id,
  liked: false,
  parentId,
  permalink: null,
  receivedAt: at,
  state: "new",
  text: id,
  threadId: "thread",
  writtenAt: at,
});

const reply = (
  id: string,
  commentId: string,
  status: InboxReply["status"]
): InboxReply => ({
  authorId: null,
  commentId,
  createdAt: at,
  id,
  permalink: null,
  reason: null,
  settledAt: null,
  status,
  text: id,
  threadId: "thread",
});

const nested = (comments: readonly InboxComment[]) =>
  nestComments(comments).map(({ answers, comment: { id } }) => [
    id,
    answers.map((answer) => answer.id),
  ]);

describe(nestComments, () => {
  it("puts each comment under the one it answers, oldest first", () => {
    expect(
      nested([
        comment("a", null),
        comment("b", null),
        comment("a1", "a"),
        comment("b1", "b"),
        comment("a2", "a"),
      ])
    ).toStrictEqual([
      ["a", ["a1", "a2"]],
      ["b", ["b1"]],
    ]);
  });

  it("keeps an answer to an answer under the same comment, one level deep", () => {
    expect(
      nested([comment("a", null), comment("a1", "a"), comment("a1x", "a1")])
    ).toStrictEqual([["a", ["a1", "a1x"]]]);
  });

  it("leaves a comment whose parent the thread lacks on its own", () => {
    expect(nested([comment("a", "gone"), comment("a1", "a")])).toStrictEqual([
      ["a", ["a1"]],
    ]);
  });

  it("loses no comment to parents that lead back to it", () => {
    expect(
      nested([comment("a", "b"), comment("b", "a"), comment("c", "c")])
    ).toStrictEqual([
      ["a", []],
      ["b", []],
      ["c", []],
    ]);
  });
});

describe(withSentReplies, () => {
  it("shows a reply just sent until the thread lists it, then the thread's", () => {
    const sent = reply("r1", "a", "sending");

    expect(withSentReplies([], [sent])).toStrictEqual([sent]);

    const settled = reply("r1", "a", "sent");

    expect(withSentReplies([settled], [sent])).toStrictEqual([settled]);
  });
});

describe(pendingReplyTo, () => {
  it("finds the reply to settle before another to the same comment", () => {
    const replies = [
      reply("r1", "a", "failed"),
      reply("r2", "a", "unconfirmed"),
      reply("r3", "b", "sent"),
    ];

    expect(
      pendingReplyTo(replies, "a").pipe(Option.map(({ id }) => id))
    ).toStrictEqual(Option.some("r2"));
    expect(pendingReplyTo(replies, "b")).toStrictEqual(Option.none());
  });
});

describe(anySending, () => {
  it("asks again only while a reply is on its way", () => {
    expect(anySending([reply("r1", "a", "unconfirmed")])).toBeFalsy();
    expect(
      anySending([reply("r1", "a", "sent"), reply("r2", "b", "sending")])
    ).toBeTruthy();
  });
});
