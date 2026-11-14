import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import {
  isReviewAnswered,
  markReviewAnswered,
  maxReviewerNameLength,
  maxReviewLength,
  reconcileReviews,
  reviewsKeptFor,
} from "#engagement/domain/review.ts";
import {
  review,
  reviewedAt,
  reviewId,
  reviewReading,
} from "#test/engagement/support.ts";

const ownerReply = {
  moderation: Option.some("approved" as const),
  text: "Thank you!",
  updatedAt: reviewedAt,
};

describe("a review", () => {
  it("waits for an answer until the location replies or a member says it needs none", () => {
    expect(isReviewAnswered(review(1))).toBeFalsy();
    expect(
      isReviewAnswered(review(1, { reply: Option.some(ownerReply) }))
    ).toBeTruthy();

    const marked = markReviewAnswered(review(1), true, reviewedAt);

    expect(isReviewAnswered(marked)).toBeTruthy();
    expect(
      isReviewAnswered(markReviewAnswered(marked, false, reviewedAt))
    ).toBeFalsy();
  });

  it("waits for an answer still when Google rejected the location's reply, which shows nothing", () => {
    const rejected = review(1, {
      reply: Option.some({
        ...ownerReply,
        moderation: Option.some("rejected"),
      }),
    });

    expect(isReviewAnswered(rejected)).toBeFalsy();
    expect(
      isReviewAnswered(markReviewAnswered(rejected, true, reviewedAt))
    ).toBeTruthy();
  });

  it("keeps nothing a database refuses or a screen acts on, whatever Google gives", () => {
    const nul = String.fromCodePoint(0);
    const lone = String.fromCodePoint(0xd8_00);
    const escape = String.fromCodePoint(0x1b);
    const override = String.fromCodePoint(0x20_2e);
    const replaced = String.fromCodePoint(0xff_fd);

    const hostile = review(1, {
      photoCount: -3,
      reply: Option.some({ ...ownerReply, text: `Thanks${nul}${lone}` }),
      reviewerName: Option.some(`Ada${nul}\n${override}Lovelace${lone}`),
      text: `Great${nul}\r\nplace${lone}${escape}[2J`,
    });

    expect(hostile.text).toBe(`Great\nplace${replaced}[2J`);
    expect(hostile.reviewerName).toStrictEqual(
      Option.some(`Ada Lovelace${replaced}`)
    );
    expect(hostile.reply.pipe(Option.map(({ text }) => text))).toStrictEqual(
      Option.some(`Thanks${replaced}`)
    );
    expect(hostile.photoCount).toBe(0);
  });

  it("bounds its text and its author's name, and keeps no name left blank", () => {
    const long = review(1, {
      reviewerName: Option.some("n".repeat(maxReviewerNameLength + 10)),
      text: "t".repeat(maxReviewLength + 10),
    });

    expect(long.text).toHaveLength(maxReviewLength);
    expect(Option.getOrThrow(long.reviewerName)).toHaveLength(
      maxReviewerNameLength
    );
    expect(
      review(1, { reviewerName: Option.some(" \n ") }).reviewerName
    ).toStrictEqual(Option.none());
  });
});

describe("reconciling what a read found", () => {
  it("takes the reviews it had not seen, and refreshes the others", () => {
    const kept = review(1);

    const reconciled = reconcileReviews(
      [kept],
      [
        reviewReading(1, { rating: 2, text: "Changed my mind" }),
        reviewReading(2),
      ],
      true,
      reviewedAt
    );

    expect(
      reconciled.fresh.map((found) => found.platformReviewId)
    ).toStrictEqual(["accounts/101/locations/202/reviews/r2"]);
    expect(
      reconciled.refreshed.map(({ rating, text }) => ({ rating, text }))
    ).toStrictEqual([{ rating: 2, text: "Changed my mind" }]);
    expect(reconciled.refreshed[0]?.id).toBe(kept.id);
    expect(reconciled.gone).toStrictEqual([]);
  });

  it("takes a review a complete read did not find for gone, and an incomplete one for nothing", () => {
    const kept = review(1);

    expect(reconcileReviews([kept], [], true, reviewedAt).gone).toStrictEqual([
      reviewId(1),
    ]);
    expect(reconcileReviews([kept], [], false, reviewedAt).gone).toStrictEqual(
      []
    );
  });

  it("neither takes nor keeps a review last changed longer ago than Google lets Peal keep it", () => {
    const past = DateTime.subtractDuration(
      DateTime.subtractDuration(reviewedAt, reviewsKeptFor),
      "1 minute"
    );

    const aged = review(1, { updatedAt: past, writtenAt: past });

    const reconciled = reconcileReviews(
      [aged],
      [
        reviewReading(1, { updatedAt: past, writtenAt: past }),
        reviewReading(2, { updatedAt: past, writtenAt: past }),
      ],
      false,
      reviewedAt
    );

    expect(reconciled.fresh).toStrictEqual([]);
    expect(reconciled.refreshed).toStrictEqual([]);
    expect(reconciled.gone).toStrictEqual([reviewId(1)]);
  });

  it("keeps a review again from the time its author changed it", () => {
    const past = DateTime.subtractDuration(reviewedAt, "40 days");

    const reconciled = reconcileReviews(
      [],
      [reviewReading(1, { updatedAt: reviewedAt, writtenAt: past })],
      true,
      reviewedAt
    );

    expect(reconciled.fresh).toHaveLength(1);
  });
});
