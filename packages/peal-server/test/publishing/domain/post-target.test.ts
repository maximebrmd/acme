import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import {
  cancelTarget,
  confirmNotPublished,
  confirmPublished,
  createTarget,
  isCancelRequested,
  isRepostable,
  isSettled,
  missTarget,
  PostTarget,
  repostTarget,
  settleTarget,
  startTarget,
} from "#publishing/domain/post-target.ts";
import type { TargetSettlement } from "#publishing/domain/target-settlement.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

const targetId = PostTargetIdSchema.make(
  "00000000-0000-7000-8000-000000000001"
);

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000002");

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-000000000003");

const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const startedAt = utc("2026-06-15T08:00:00Z");

const now = utc("2026-06-15T08:00:05Z");

const platformPostId = PlatformPostIdSchema.make("1790000000000000001");

const targetIn = (status: PostTargetStatus): PostTarget =>
  new PostTarget({
    channelId,
    id: targetId,
    liveParts: [],
    options: Option.none(),
    postId,
    round: 1,
    status,
  });

const statuses = {
  cancelled: targetIn({ _tag: "cancelled", cancelledAt: startedAt }),
  failed: targetIn({
    _tag: "failed",
    code: Option.none(),
    failedAt: now,
    reason: "unavailable",
  }),
  pending: targetIn({ _tag: "pending" }),
  published: targetIn({
    _tag: "published",
    permalink: Option.none(),
    platformPostId: Option.some(platformPostId),
    publishedAt: now,
  }),
  publishing: targetIn({
    _tag: "publishing",
    cancelRequested: false,
    startedAt,
  }),
  unconfirmed: targetIn({
    _tag: "unconfirmed",
    attemptedAt: startedAt,
    reason: "noResponse",
  }),
};

const failureOf = <E>(result: Result.Result<PostTarget, E>): E | undefined =>
  Option.getOrUndefined(Result.getFailure(result));

const statusOf = <E>(
  result: Result.Result<PostTarget, E>
): PostTargetStatus | undefined =>
  Option.getOrUndefined(Result.getSuccess(result))?.status;

describe(createTarget, () => {
  it("starts pending, in round 1", () => {
    const target = createTarget(targetId, postId, channelId);

    expect(target.status).toStrictEqual({ _tag: "pending" });
    expect(target.round).toBe(1);
    expect(isSettled(target)).toBeFalsy();
  });
});

describe(startTarget, () => {
  it("starts a pending target", () => {
    expect(statusOf(startTarget(statuses.pending, startedAt))).toStrictEqual({
      _tag: "publishing",
      cancelRequested: false,
      startedAt,
    });
  });

  it.each([
    { from: statuses.publishing },
    { from: statuses.published },
    { from: statuses.failed },
    { from: statuses.unconfirmed },
    { from: statuses.cancelled },
  ])("refuses a target that is $from.status._tag", ({ from }) => {
    expect(failureOf(startTarget(from, startedAt))).toMatchObject({
      _tag: "InvalidTargetTransition",
      action: "start",
      from: from.status._tag,
      targetId,
    });
  });
});

describe(settleTarget, () => {
  it.each<{ expected: PostTargetStatus; settlement: TargetSettlement }>([
    {
      expected: {
        _tag: "published",
        permalink: Option.some("https://social.example/@peal/1"),
        platformPostId: Option.some(platformPostId),
        publishedAt: now,
      },
      settlement: {
        _tag: "published",
        permalink: "https://social.example/@peal/1",
        platformPostId,
      },
    },
    {
      expected: {
        _tag: "unconfirmed",
        attemptedAt: utc("2026-06-15T08:00:03Z"),
        reason: "noResponse",
      },
      settlement: {
        _tag: "unconfirmed",
        attemptedAt: utc("2026-06-15T08:00:03Z"),
        reason: "noResponse",
      },
    },
    {
      // Stored before settlements said when the attempt was made.
      expected: {
        _tag: "unconfirmed",
        attemptedAt: startedAt,
        reason: "interrupted",
      },
      settlement: { _tag: "unconfirmed", reason: "interrupted" },
    },
    {
      expected: {
        _tag: "failed",
        code: Option.some("duplicate"),
        failedAt: now,
        reason: "contentRejected",
      },
      settlement: {
        _tag: "failed",
        code: "duplicate",
        reason: "contentRejected",
      },
    },
    {
      expected: { _tag: "cancelled", cancelledAt: now },
      settlement: { _tag: "cancelled" },
    },
  ])("records $settlement._tag", ({ expected, settlement }) => {
    const settled = settleTarget(statuses.publishing, settlement, now);

    expect(statusOf(settled)).toStrictEqual(expected);
    expect(settled.pipe(Result.map(isSettled))).toStrictEqual(
      Result.succeed(true)
    );
  });

  it.each([
    { from: statuses.pending },
    { from: statuses.published },
    { from: statuses.failed },
    { from: statuses.unconfirmed },
    { from: statuses.cancelled },
  ])("comes only after starting, not from $from.status._tag", ({ from }) => {
    expect(
      failureOf(
        settleTarget(from, { _tag: "unconfirmed", reason: "noResponse" }, now)
      )
    ).toMatchObject({ action: "settle", from: from.status._tag });
  });
});

describe(missTarget, () => {
  it("fails a pending target as missed", () => {
    expect(statusOf(missTarget(statuses.pending, now))).toStrictEqual({
      _tag: "failed",
      code: Option.none(),
      failedAt: now,
      reason: "missed",
    });
  });

  it("refuses a target already sending", () => {
    expect(failureOf(missTarget(statuses.publishing, now))).toMatchObject({
      action: "miss",
    });
  });
});

describe(cancelTarget, () => {
  it("cancels a pending target at once", () => {
    expect(statusOf(cancelTarget(statuses.pending, now))).toStrictEqual({
      _tag: "cancelled",
      cancelledAt: now,
    });
  });

  it("asks a sending target to start no other attempt", () => {
    const cancelling = cancelTarget(statuses.publishing, now);

    expect(statusOf(cancelling)).toStrictEqual({
      _tag: "publishing",
      cancelRequested: true,
      startedAt,
    });
    expect(cancelling.pipe(Result.map(isCancelRequested))).toStrictEqual(
      Result.succeed(true)
    );
    expect(isCancelRequested(statuses.publishing)).toBeFalsy();
  });

  it.each([
    { from: statuses.published },
    { from: statuses.failed },
    { from: statuses.unconfirmed },
    { from: statuses.cancelled },
  ])("refuses a target that is $from.status._tag", ({ from }) => {
    expect(failureOf(cancelTarget(from, now))).toMatchObject({
      action: "cancel",
      from: from.status._tag,
    });
  });
});

describe("confirming an unconfirmed target", () => {
  const checkedAt = utc("2026-06-15T09:00:00Z");

  // What a member found for a post of one part.
  const foundAlone = (
    given: Partial<Parameters<typeof confirmPublished>[1]> = {}
  ): Parameters<typeof confirmPublished>[1] => ({
    now: checkedAt,
    parts: 1,
    permalink: Option.none(),
    platformPostId: Option.none(),
    ...given,
  });

  it("marks it published at the attempt when the user found it", () => {
    expect(
      statusOf(confirmPublished(statuses.unconfirmed, foundAlone()))
    ).toStrictEqual({
      _tag: "published",
      permalink: Option.none(),
      platformPostId: Option.none(),
      publishedAt: startedAt,
    });
  });

  it("keeps the address the user gives", () => {
    expect(
      statusOf(
        confirmPublished(
          statuses.unconfirmed,
          foundAlone({
            permalink: Option.some("https://social.example/@peal/1"),
          })
        )
      )
    ).toMatchObject({
      permalink: Option.some("https://social.example/@peal/1"),
    });
  });

  it("keeps the platform's id when the user gives it", () => {
    expect(
      statusOf(
        confirmPublished(
          statuses.unconfirmed,
          foundAlone({ platformPostId: Option.some(platformPostId) })
        )
      )
    ).toMatchObject({ platformPostId: Option.some(platformPostId) });
  });

  it("marks it failed when the user did not find it", () => {
    expect(
      statusOf(confirmNotPublished(statuses.unconfirmed, checkedAt))
    ).toStrictEqual({
      _tag: "failed",
      code: Option.none(),
      failedAt: checkedAt,
      reason: "notPublished",
    });
  });

  it.each([
    { from: statuses.pending },
    { from: statuses.publishing },
    { from: statuses.published },
    { from: statuses.failed },
    { from: statuses.cancelled },
  ])(
    "applies only to unconfirmed targets, not $from.status._tag",
    ({ from }) => {
      expect(failureOf(confirmPublished(from, foundAlone()))).toMatchObject({
        action: "confirmPublished",
      });
      expect(failureOf(confirmNotPublished(from, checkedAt))).toMatchObject({
        action: "confirmNotPublished",
      });
    }
  );
});

describe(repostTarget, () => {
  it.each([{ from: statuses.failed }, { from: statuses.unconfirmed }])(
    "sends a $from.status._tag target again, pending in the next round",
    ({ from }) => {
      const reposted = Option.getOrUndefined(
        Result.getSuccess(repostTarget(from))
      );

      expect(isRepostable(from)).toBeTruthy();
      expect(reposted?.status).toStrictEqual({ _tag: "pending" });
      expect(reposted?.round).toBe(2);
      expect(reposted?.id).toBe(from.id);
    }
  );

  it.each([
    { from: statuses.pending },
    { from: statuses.publishing },
    { from: statuses.published },
    { from: statuses.cancelled },
  ])("leaves a $from.status._tag target as it is", ({ from }) => {
    expect(isRepostable(from)).toBeFalsy();
    expect(failureOf(repostTarget(from))).toMatchObject({
      action: "repost",
      from: from.status._tag,
    });
  });
});
