import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import type { LivePart } from "#publishing/domain/live-part.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import {
  cancelTarget,
  confirmNotPublished,
  confirmPublished,
  isRepostable,
  livePartsOf,
  nextPartOf,
  PostTarget,
  recordLivePart,
  repostTarget,
  settleTarget,
} from "#publishing/domain/post-target.ts";
import { outcomeOf } from "#publishing/domain/post.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";

const startedAt = DateTime.makeUnsafe("2026-06-15T08:00:00Z");
const later = DateTime.makeUnsafe("2026-06-15T08:10:00Z");

const live = (index: number, id = `post-${String(index)}`): LivePart => ({
  index,
  permalink: Option.some(`https://social.example/@peal/${id}`),
  platformPostId: Option.some(PlatformPostIdSchema.make(id)),
  publishedAt: startedAt,
  round: 1,
});

const sending: PostTargetStatus = {
  _tag: "publishing",
  cancelRequested: false,
  startedAt,
};

const target = (
  status: PostTargetStatus,
  liveParts: readonly LivePart[] = [],
  suffix = "1"
) =>
  new PostTarget({
    channelId: ChannelIdSchema.make(
      `00000000-0000-7000-8000-00000000000${suffix}`
    ),
    id: PostTargetIdSchema.make(`00000000-0000-7000-8000-0000000000b${suffix}`),
    liveParts,
    options: Option.none(),
    postId: PostIdSchema.make("00000000-0000-7000-8000-0000000000a1"),
    round: 1,
    status,
  });

const unconfirmed: PostTargetStatus = {
  _tag: "unconfirmed",
  attemptedAt: startedAt,
  reason: "noResponse",
};

const failed: PostTargetStatus = {
  _tag: "failed",
  code: Option.none(),
  failedAt: later,
  reason: "contentRejected",
};

describe("the parts of a post that are live on a channel", () => {
  it("are recorded in order, each once, while the target is sending", () => {
    const first = Result.getOrThrow(recordLivePart(target(sending), live(0)));
    const second = Result.getOrThrow(recordLivePart(first, live(1)));

    expect(second.liveParts).toStrictEqual([live(0), live(1)]);
    expect(nextPartOf(second)).toBe(2);

    // A step run again records nothing more.
    expect(Result.getOrThrow(recordLivePart(second, live(1)))).toBe(second);

    // A part cannot be live before the one that precedes it.
    expect(Result.isFailure(recordLivePart(first, live(3)))).toBeTruthy();
    expect(
      Result.isFailure(recordLivePart(target(failed), live(0)))
    ).toBeTruthy();
  });

  it("publish the target as its first part once all are live", () => {
    const settled = Result.getOrThrow(
      settleTarget(
        target(sending, [live(0), live(1)]),
        {
          _tag: "published",
          platformPostId: PlatformPostIdSchema.make("post-1"),
        },
        later
      )
    );

    expect(settled.status).toStrictEqual({
      _tag: "published",
      permalink: Option.some("https://social.example/@peal/post-0"),
      platformPostId: Option.some("post-0"),
      publishedAt: later,
    });
  });

  it("stay with a target that failed or was cancelled after them", () => {
    const stopped = Result.getOrThrow(
      settleTarget(
        target(sending, [live(0)]),
        { _tag: "failed", reason: "contentRejected" },
        later
      )
    );

    expect(stopped.liveParts).toStrictEqual([live(0)]);

    const cancelled = Result.getOrThrow(
      settleTarget(target(sending, [live(0)]), { _tag: "cancelled" }, later)
    );

    expect(cancelled.status._tag).toBe("cancelled");
    expect(cancelled.liveParts).toStrictEqual([live(0)]);

    // A cancel asked for while it sends keeps them too.
    expect(
      Result.getOrThrow(cancelTarget(target(sending, [live(0)]), later))
        .liveParts
    ).toStrictEqual([live(0)]);
  });

  it("are kept by a repost, which sends the part after them", () => {
    const again = Result.getOrThrow(
      repostTarget(target(failed, [live(0), live(1)]))
    );

    expect(again.round).toBe(2);
    expect(again.status).toStrictEqual({ _tag: "pending" });
    expect(nextPartOf(again)).toBe(2);
  });

  it("are the one part of a target published before parts were kept", () => {
    const published: PostTargetStatus = {
      _tag: "published",
      permalink: Option.none(),
      platformPostId: Option.some(PlatformPostIdSchema.make("older")),
      publishedAt: startedAt,
    };

    expect(livePartsOf(target(published))).toStrictEqual([
      {
        index: 0,
        permalink: Option.none(),
        platformPostId: Option.some("older"),
        publishedAt: startedAt,
        round: 1,
      },
    ]);
    expect(livePartsOf(target(failed))).toStrictEqual([]);
  });
});

describe("confirming an unconfirmed part of a post of several", () => {
  const found = {
    now: later,
    parts: 3,
    permalink: Option.none(),
    platformPostId: Option.none(),
  };

  it("fails the target as partsNotSent when parts were left to send", () => {
    const next = Result.getOrThrow(
      confirmPublished(target(unconfirmed, [live(0)]), found)
    );

    expect(next.status).toStrictEqual({
      _tag: "failed",
      code: Option.none(),
      failedAt: later,
      reason: "partsNotSent",
    });

    // The part found is live since its attempt, without an id.
    expect(next.liveParts).toStrictEqual([
      live(0),
      {
        index: 1,
        permalink: Option.none(),
        platformPostId: Option.none(),
        publishedAt: startedAt,
        round: 1,
      },
    ]);
  });

  it("offers no repost of a thread whose last live part Peal has no id for", () => {
    const stopped = Result.getOrThrow(
      confirmPublished(target(unconfirmed, [live(0)]), found)
    );

    // The next part would have nothing to reply to, in every round.
    expect(isRepostable(stopped)).toBeFalsy();
    expect(Result.isFailure(repostTarget(stopped))).toBeTruthy();

    // Nor one whose platform refuses this app replies.
    expect(
      isRepostable(
        target(
          {
            _tag: "failed",
            code: Option.some("repliesNotAllowed"),
            failedAt: later,
            reason: "repliesNotAllowed",
          },
          [live(0)]
        )
      )
    ).toBeFalsy();

    // A thread that stopped at a part the platform refused goes on from it.
    expect(isRepostable(target(failed, [live(0)]))).toBeTruthy();
    expect(isRepostable(target(unconfirmed, [live(0)]))).toBeTruthy();
  });

  it("publishes the target, as its first part, when it was the last", () => {
    const next = Result.getOrThrow(
      confirmPublished(target(unconfirmed, [live(0), live(1)]), found)
    );

    expect(next.status).toStrictEqual({
      _tag: "published",
      permalink: Option.some("https://social.example/@peal/post-0"),
      platformPostId: Option.some("post-0"),
      publishedAt: startedAt,
    });
    expect(next.liveParts).toHaveLength(3);
  });

  it("keeps the parts that are live when the part was not found", () => {
    const next = Result.getOrThrow(
      confirmNotPublished(target(unconfirmed, [live(0)]), later)
    );

    expect(next.status).toMatchObject({ reason: "notPublished" });
    expect(nextPartOf(next)).toBe(1);
  });
});

describe("a post's outcome when a channel has some of its parts", () => {
  it("is partial, as something is live", () => {
    expect(outcomeOf([target(failed, [live(0)])])).toBe("partiallyPublished");
    expect(
      outcomeOf([target({ _tag: "cancelled", cancelledAt: later }, [live(0)])])
    ).toBe("partiallyPublished");
  });

  it("is failed when nothing is live anywhere", () => {
    expect(outcomeOf([target(failed)])).toBe("failed");
  });

  it("stays unconfirmed while a part may be live", () => {
    expect(
      outcomeOf([target(unconfirmed, [live(0)]), target(failed, [], "2")])
    ).toBe("unconfirmed");
  });
});
