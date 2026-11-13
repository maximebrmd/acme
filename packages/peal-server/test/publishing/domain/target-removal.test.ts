import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { approvalSubject } from "#publishing/domain/approval-subject.ts";
import { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import { InvalidTargetTransition } from "#publishing/domain/invalid-target-transition.ts";
import { LastTargetLeft } from "#publishing/domain/last-target-left.ts";
import { emptyContent } from "#publishing/domain/post-content.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { isDropped, PostTarget } from "#publishing/domain/post-target.ts";
import { outcomeOf, Post } from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { dropTarget } from "#publishing/domain/target-removal.ts";
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

const now = utc("2026-06-15T07:00:00Z");

const inAnHour = new Schedule({
  at: utc("2026-06-15T08:00:00Z"),
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
});

const postIn = (status: PostStatus): Post =>
  new Post({
    authorId: Option.none(),
    content: emptyContent,
    id: postId,
    scheduleRevision: 1,
    status,
    workspaceId,
  });

const scheduled = postIn({ _tag: "scheduled", schedule: inAnHour });

const targetIn = (suffix: string, status: PostTargetStatus): PostTarget =>
  new PostTarget({
    channelId: ChannelIdSchema.make(
      `00000000-0000-7000-8000-00000000000${suffix}`
    ),
    id: PostTargetIdSchema.make(`00000000-0000-7000-9000-00000000000${suffix}`),
    liveParts: [],
    options: Option.none(),
    postId,
    round: 1,
    status,
  });

const pendingA = targetIn("a", { _tag: "pending" });

const pendingB = targetIn("b", { _tag: "pending" });

const failureOf = <A, E>(result: Result.Result<A, E>): E | undefined =>
  Option.getOrUndefined(Result.getFailure(result));

describe(dropTarget, () => {
  it.each([
    { post: scheduled },
    { post: postIn({ _tag: "awaitingApproval", schedule: inAnHour }) },
  ])("cancels a pending target of a $post.status._tag post", ({ post }) => {
    const dropped = Result.getOrThrow(
      dropTarget(post, [pendingA, pendingB], pendingA, now)
    );

    expect(dropped.status).toStrictEqual({
      _tag: "cancelled",
      cancelledAt: now,
      dropped: true,
    });
    expect(isDropped(dropped)).toBeTruthy();
    expect(dropped.id).toBe(pendingA.id);
  });

  it.each([
    { post: postIn({ _tag: "draft" }) },
    {
      post: postIn({
        _tag: "publishing",
        schedule: inAnHour,
        startedAt: inAnHour.at,
      }),
    },
    {
      post: postIn({
        _tag: "cancelled",
        cancelledAt: now,
        schedule: Option.some(inAnHour),
      }),
    },
    {
      post: postIn({
        _tag: "finished",
        finishedAt: now,
        outcome: "published",
        schedule: inAnHour,
        startedAt: inAnHour.at,
      }),
    },
  ])("refuses a $post.status._tag post", ({ post }) => {
    expect(
      failureOf(dropTarget(post, [pendingA, pendingB], pendingA, now))
    ).toStrictEqual(
      new InvalidPostTransition({
        action: "dropTarget",
        from: post.status._tag,
        postId,
      })
    );
  });

  it("refuses the last target left: the post is cancelled instead", () => {
    const gone = targetIn("b", {
      _tag: "cancelled",
      cancelledAt: now,
      dropped: true,
    });

    expect(
      failureOf(dropTarget(scheduled, [pendingA, gone], pendingA, now))
    ).toStrictEqual(new LastTargetLeft({ postId, targetId: pendingA.id }));
  });

  it.each([
    {
      target: targetIn("a", {
        _tag: "publishing",
        cancelRequested: false,
        startedAt: now,
      }),
    },
    {
      target: targetIn("a", {
        _tag: "cancelled",
        cancelledAt: now,
        dropped: true,
      }),
    },
  ])("refuses a target that is $target.status._tag", ({ target }) => {
    expect(
      failureOf(dropTarget(scheduled, [target, pendingB], target, now))
    ).toStrictEqual(
      new InvalidTargetTransition({
        action: "drop",
        from: target.status._tag,
        targetId: target.id,
      })
    );
  });
});

describe("the outcome of a post with a channel removed", () => {
  const published = targetIn("a", {
    _tag: "published",
    permalink: Option.none(),
    platformPostId: Option.some(PlatformPostIdSchema.make("1")),
    publishedAt: now,
  });

  const dropped = targetIn("b", {
    _tag: "cancelled",
    cancelledAt: now,
    dropped: true,
  });

  const cancelled = targetIn("c", { _tag: "cancelled", cancelledAt: now });

  it("counts only the channels it still had", () => {
    expect(outcomeOf([published, dropped])).toBe("published");
    expect(outcomeOf([cancelled, dropped])).toBe("cancelled");
  });

  it("still counts a channel cancelled with the post", () => {
    expect(outcomeOf([published, cancelled, dropped])).toBe(
      "partiallyPublished"
    );
  });
});

describe("the approval of a post with a channel removed", () => {
  it("covers the channels it still goes to", () => {
    const dropped = Result.getOrThrow(
      dropTarget(scheduled, [pendingA, pendingB], pendingA, now)
    );

    expect(approvalSubject(emptyContent, [dropped, pendingB])).toBe(
      approvalSubject(emptyContent, [pendingB])
    );
  });
});
