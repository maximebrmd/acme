import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import {
  beginReviewReply,
  isLocationReply,
  reviewReplyAttempted,
  reviewReplyBytes,
  settleByReading,
  settleReviewReply,
  withdrawReviewReply,
  writeReviewReply,
} from "#engagement/domain/review-reply.ts";
import type { ReviewReply } from "#engagement/domain/review-reply.ts";
import {
  memberId,
  review,
  reviewedAt,
  reviewReplyId,
} from "#test/engagement/support.ts";

const later = DateTime.addDuration(reviewedAt, "1 minute");

const written = (): ReviewReply =>
  writeReviewReply(
    reviewReplyId(1),
    review(1),
    Option.some(memberId),
    "Thank you for coming!",
    reviewedAt
  );

const ok = <A, E>(result: Result.Result<A, E>): A => Result.getOrThrow(result);

const unconfirmed = () =>
  ok(
    settleReviewReply(
      ok(beginReviewReply(written(), reviewedAt)),
      { _tag: "unconfirmed", reason: "noResponse" },
      later
    )
  );

describe("a reply to a review", () => {
  it("is on its way when written, and attempted once a run set out", () => {
    const reply = written();

    expect(reply.status._tag).toBe("sending");
    expect(reviewReplyAttempted(reply)).toBeFalsy();
    expect(
      reviewReplyAttempted(ok(beginReviewReply(reply, later)))
    ).toBeTruthy();
  });

  it("ends once, as the platform answered", () => {
    const sent = ok(
      settleReviewReply(
        written(),
        {
          _tag: "sent",
          reply: {
            moderation: Option.none(),
            text: "Thank you for coming!",
            updatedAt: later,
          },
        },
        later
      )
    );

    expect(sent.status).toStrictEqual({ _tag: "sent", at: later });
    expect(
      Result.isFailure(
        settleReviewReply(sent, { _tag: "failed", reason: "refused" }, later)
      )
    ).toBeTruthy();
  });

  it("is settled by the next read: sent when the location's reply is its text, trimmed", () => {
    const found = Option.some({
      moderation: Option.none(),
      text: " Thank you for coming!\n",
      updatedAt: later,
    });

    expect(isLocationReply(written(), found)).toBeTruthy();
    expect(ok(settleByReading(unconfirmed(), found, later)).status._tag).toBe(
      "sent"
    );
  });

  it("is settled by the next read as never sent when the location shows another reply, or none", () => {
    const other = Option.some({
      moderation: Option.none(),
      text: "Someone else's words",
      updatedAt: later,
    });

    expect(
      ok(settleByReading(unconfirmed(), other, later)).status
    ).toStrictEqual({ _tag: "failed", at: later, reason: "notSent" });
    expect(
      ok(settleByReading(unconfirmed(), Option.none(), later)).status._tag
    ).toBe("failed");
    expect(
      Result.isFailure(settleByReading(written(), other, later))
    ).toBeTruthy();
  });

  it("can be withdrawn only once sent", () => {
    expect(
      Result.isFailure(withdrawReviewReply(written(), later))
    ).toBeTruthy();
  });

  it("is counted in UTF-8 bytes, as Google counts", () => {
    expect(reviewReplyBytes("abc")).toBe(3);
    expect(reviewReplyBytes("été")).toBe(5);
  });
});
