import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import {
  answers,
  beginSending,
  confirmReply,
  forgetAuthor,
  settleReply,
  wasAttempted,
  withdrawReply,
  writeReply,
} from "#engagement/domain/reply.ts";
import type { SendOutcome } from "#engagement/domain/reply.ts";
import {
  comment,
  memberId,
  publishedAt,
  replyId,
} from "#test/engagement/support.ts";

const now = DateTime.addDuration(publishedAt, "1 hour");
const later = DateTime.addDuration(now, "1 minute");

const reply = writeReply(
  replyId(1),
  comment(1),
  Option.some(memberId),
  "Thank you!",
  now
);

const sent: SendOutcome = {
  _tag: "sent",
  permalink: Option.some("https://social.example/@studio/3001"),
  platformCommentId: "3001",
};

const settled = (outcome: SendOutcome) =>
  Result.getOrThrow(settleReply(reply, outcome, later));

describe("a reply", () => {
  it("is on its way once written, under its comment and its author", () => {
    expect(reply.status).toStrictEqual({
      _tag: "sending",
      attemptedAt: Option.none(),
    });
    expect(wasAttempted(reply)).toBeFalsy();
    expect(reply.commentId).toBe(comment(1).id);
    expect(reply.threadId).toBe(comment(1).threadId);
    expect(reply.authorId).toStrictEqual(Option.some(memberId));
  });

  it("records that a run set out to send it, once, before the call", () => {
    const begun = Result.getOrThrow(beginSending(reply, later));

    const again = Result.getOrThrow(
      beginSending(begun, DateTime.addDuration(later, "1 hour"))
    );

    expect(wasAttempted(begun)).toBeTruthy();
    expect(again.status).toStrictEqual({
      _tag: "sending",
      attemptedAt: Option.some(later),
    });
    expect(Result.isFailure(beginSending(settled(sent), later))).toBeTruthy();
  });

  it("is sent with the id the platform gave it", () => {
    expect(settled(sent).status).toStrictEqual({
      _tag: "sent",
      at: later,
      permalink: sent.permalink,
      platformCommentId: Option.some("3001"),
    });
  });

  it("fails with the reason nothing went out", () => {
    expect(
      settled({ _tag: "failed", reason: "rateLimited" }).status
    ).toStrictEqual({ _tag: "failed", at: later, reason: "rateLimited" });
  });

  it("is unconfirmed when nobody can tell whether it went out", () => {
    expect(
      settled({ _tag: "unconfirmed", reason: "noResponse" }).status
    ).toStrictEqual({ _tag: "unconfirmed", at: later, reason: "noResponse" });
  });

  it("ends once: a settled reply is never settled again", () => {
    for (const outcome of [
      sent,
      { _tag: "failed", reason: "refused" },
      { _tag: "unconfirmed", reason: "interrupted" },
    ] satisfies SendOutcome[]) {
      const again = settleReply(settled(outcome), sent, later);

      expect(Result.isFailure(again)).toBeTruthy();
    }
  });

  it("answers its comment unless it failed or was taken back", () => {
    expect(answers(reply)).toBeTruthy();
    expect(answers(settled(sent))).toBeTruthy();
    expect(
      answers(settled({ _tag: "unconfirmed", reason: "noResponse" }))
    ).toBeTruthy();
    expect(answers(settled({ _tag: "failed", reason: "refused" }))).toBeFalsy();
  });

  it("is settled by what a member found, when unconfirmed only", () => {
    const unconfirmed = settled({ _tag: "unconfirmed", reason: "noResponse" });

    expect(
      Result.getOrThrow(confirmReply(unconfirmed, true, later)).status
    ).toStrictEqual({
      _tag: "sent",
      at: later,
      permalink: Option.none(),
      platformCommentId: Option.none(),
    });
    expect(
      Result.getOrThrow(confirmReply(unconfirmed, false, later)).status
    ).toStrictEqual({ _tag: "failed", at: later, reason: "notSent" });
    expect(
      Result.isFailure(confirmReply(settled(sent), true, later))
    ).toBeTruthy();
  });

  it("is taken back only when Peal knows where it is", () => {
    expect(
      Result.getOrThrow(withdrawReply(settled(sent), later)).status
    ).toStrictEqual({ _tag: "withdrawn", at: later });
    expect(Result.isFailure(withdrawReply(reply, later))).toBeTruthy();

    const byHand = Result.getOrThrow(
      confirmReply(
        settled({ _tag: "unconfirmed", reason: "noResponse" }),
        true,
        later
      )
    );

    expect(Result.isFailure(withdrawReply(byHand, later))).toBeTruthy();
  });

  it("loses its author when their account closes, and nothing else", () => {
    const forgotten = forgetAuthor(settled(sent));

    expect(forgotten.authorId).toStrictEqual(Option.none());
    expect(forgotten.text).toBe("Thank you!");
    expect(forgotten.status).toStrictEqual(settled(sent).status);
  });
});
