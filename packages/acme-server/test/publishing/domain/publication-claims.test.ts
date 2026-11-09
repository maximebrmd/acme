import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { emptyContent } from "#publishing/domain/post-content.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { Post } from "#publishing/domain/post.ts";
import {
  claimPost,
  claimTarget,
} from "#publishing/domain/publication-claims.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const workspaceId = WorkspaceIdSchema.make(
  "00000000-0000-7000-8000-000000000002"
);

const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const at = utc("2026-06-15T08:00:00Z");

const schedule = new Schedule({
  at,
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
});

const postIn = (status: PostStatus, scheduleRevision = 2): Post =>
  new Post({
    authorId: Option.none(),
    content: emptyContent,
    id: postId,
    scheduleRevision,
    status,
    workspaceId,
  });

const decisionOf = <A, E>(result: Result.Result<A, E>): A | undefined =>
  Option.getOrUndefined(Result.getSuccess(result));

const targetIn = (status: PostTargetStatus, round = 1) =>
  new PostTarget({
    channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000003"),
    id: PostTargetIdSchema.make("00000000-0000-7000-8000-000000000004"),
    postId,
    round,
    status,
  });

describe(claimPost, () => {
  const scheduled = postIn({ _tag: "scheduled", schedule });

  it("starts the post its job was started for, at its time", () => {
    const decision = decisionOf(claimPost(scheduled, 2, at));

    expect(decision?._tag).toBe("start");
    expect(decision?._tag === "start" && decision.post.status).toStrictEqual({
      _tag: "publishing",
      schedule,
      startedAt: at,
    });
  });

  it("still starts a post up to an hour late", () => {
    expect(
      decisionOf(claimPost(scheduled, 2, utc("2026-06-15T09:00:00Z")))?._tag
    ).toBe("start");
  });

  it("misses a post more than an hour late", () => {
    const decision = decisionOf(
      claimPost(scheduled, 2, utc("2026-06-15T09:00:01Z"))
    );

    expect(decision?._tag).toBe("miss");
    expect(decision?._tag === "miss" && decision.post.status._tag).toBe(
      "publishing"
    );
  });

  it.each([1, 3])(
    "leaves a post whose revision is now %i to that revision's job",
    (revision) => {
      expect(decisionOf(claimPost(scheduled, revision, at))?._tag).toBe(
        "superseded"
      );
    }
  );

  it("leaves a post moved back to draft", () => {
    expect(decisionOf(claimPost(postIn({ _tag: "draft" }), 2, at))?._tag).toBe(
      "superseded"
    );
  });

  it("stops for a cancelled post, whatever the revision", () => {
    const cancelled = postIn({
      _tag: "cancelled",
      cancelledAt: at,
      schedule: Option.some(schedule),
    });

    expect(decisionOf(claimPost(cancelled, 2, at))?._tag).toBe("cancelled");
    expect(decisionOf(claimPost(cancelled, 1, at))?._tag).toBe("cancelled");
  });

  it.each<{ status: PostStatus }>([
    { status: { _tag: "publishing", schedule, startedAt: at } },
    {
      status: {
        _tag: "finished",
        finishedAt: at,
        outcome: "published",
        schedule,
        startedAt: at,
      },
    },
  ])(
    "resumes a post its own job already claimed ($status._tag)",
    ({ status }) => {
      expect(decisionOf(claimPost(postIn(status), 2, at))?._tag).toBe("resume");
    }
  );

  it("refuses to start before the time, which a job never does", () => {
    expect(
      Result.isFailure(claimPost(scheduled, 2, utc("2026-06-15T07:59:59Z")))
    ).toBeTruthy();
  });
});

describe(claimTarget, () => {
  it("starts a pending target in its round", () => {
    const decision = decisionOf(
      claimTarget(targetIn({ _tag: "pending" }), 1, at)
    );

    expect(decision?._tag).toBe("start");
    expect(decision?._tag === "start" && decision.target.status._tag).toBe(
      "publishing"
    );
  });

  it("leaves a target sent again in a later round", () => {
    expect(
      decisionOf(claimTarget(targetIn({ _tag: "pending" }, 2), 1, at))?._tag
    ).toBe("superseded");
  });

  it("resumes a target its round already claimed", () => {
    expect(
      decisionOf(
        claimTarget(
          targetIn({
            _tag: "publishing",
            cancelRequested: false,
            startedAt: at,
          }),
          1,
          at
        )
      )?._tag
    ).toBe("resume");
  });

  it("stops for a cancelled target", () => {
    expect(
      decisionOf(
        claimTarget(targetIn({ _tag: "cancelled", cancelledAt: at }), 1, at)
      )?._tag
    ).toBe("cancelled");
  });

  it.each<{ status: PostTargetStatus }>([
    {
      status: {
        _tag: "published",
        permalink: Option.none(),
        platformPostId: Option.some(PlatformPostIdSchema.make("1")),
        publishedAt: at,
      },
    },
    {
      status: {
        _tag: "failed",
        code: Option.none(),
        failedAt: at,
        reason: "mediaRejected",
      },
    },
    { status: { _tag: "unconfirmed", attemptedAt: at, reason: "noResponse" } },
  ])("returns how a settled target ended ($status._tag)", ({ status }) => {
    expect(decisionOf(claimTarget(targetIn(status), 1, at))).toStrictEqual({
      _tag: "settled",
      outcome: status._tag,
    });
  });
});
