import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { PlatformPostIdSchema } from "#publishing/domain/post-status.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import {
  confirmNotPublished,
  confirmPublished,
  createDraft,
  markFailed,
  markPublished,
  markUnconfirmed,
  moveToDraft,
  Post,
  schedulePost,
  startPublishing,
} from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const workspaceId = WorkspaceIdSchema.make(
  "00000000-0000-7000-8000-000000000002"
);

const channelId = ChannelIdSchema.make("00000000-0000-7000-8000-000000000003");

const utc = (iso: string): DateTime.Utc => DateTime.makeUnsafe(iso);

const now = utc("2026-06-15T07:00:00Z");

const inAnHour = new Schedule({
  at: utc("2026-06-15T08:00:00Z"),
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
});

const platformPostId = PlatformPostIdSchema.make("1790000000000000001");

const postIn = (status: PostStatus): Post =>
  new Post({ channelId, id: postId, status, workspaceId });

const statuses = {
  draft: postIn({ _tag: "draft" }),
  failed: postIn({
    _tag: "failed",
    failedAt: now,
    reason: "mediaRejected",
  }),
  published: postIn({
    _tag: "published",
    platformPostId: Option.some(platformPostId),
    publishedAt: now,
  }),
  publishing: postIn({
    _tag: "publishing",
    schedule: inAnHour,
    startedAt: utc("2026-06-15T08:00:00Z"),
  }),
  scheduled: postIn({ _tag: "scheduled", schedule: inAnHour }),
  unconfirmed: postIn({
    _tag: "unconfirmed",
    attemptedAt: utc("2026-06-15T08:00:00Z"),
  }),
};

const failureOf = <E>(result: Result.Result<Post, E>): E | undefined =>
  Option.getOrUndefined(Result.getFailure(result));

const statusOf = <E>(result: Result.Result<Post, E>): PostStatus | undefined =>
  Option.getOrUndefined(Result.getSuccess(result))?.status;

describe(createDraft, () => {
  it("starts a post as a draft for its channel", () => {
    const post = createDraft(postId, workspaceId, channelId);

    expect(post.status).toStrictEqual({ _tag: "draft" });
    expect(post.channelId).toBe(channelId);
    expect(post.workspaceId).toBe(workspaceId);
  });
});

describe(schedulePost, () => {
  it.each([
    { from: statuses.draft, label: "a draft" },
    { from: statuses.scheduled, label: "a scheduled post, moving it" },
    { from: statuses.failed, label: "a failed post, to try again" },
  ])("schedules $label", ({ from }) => {
    expect(statusOf(schedulePost(from, inAnHour, now))).toStrictEqual({
      _tag: "scheduled",
      schedule: inAnHour,
    });
  });

  it("accepts the current instant", () => {
    const rightNow = new Schedule({ at: now, timeZone: inAnHour.timeZone });

    expect(
      Result.isSuccess(schedulePost(statuses.draft, rightNow, now))
    ).toBeTruthy();
  });

  it("refuses an instant that has passed", () => {
    const earlier = new Schedule({
      at: utc("2026-06-15T06:59:59Z"),
      timeZone: inAnHour.timeZone,
    });

    expect(failureOf(schedulePost(statuses.draft, earlier, now))).toMatchObject(
      {
        _tag: "ScheduleInPast",
        postId,
      }
    );
  });

  it.each([
    { from: statuses.publishing },
    { from: statuses.published },
    // It may be live already: the user confirms it before anything else.
    { from: statuses.unconfirmed },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(schedulePost(from, inAnHour, now))).toMatchObject({
      _tag: "InvalidPostTransition",
      action: "schedule",
      from: from.status._tag,
      postId,
    });
  });
});

describe(moveToDraft, () => {
  it.each([{ from: statuses.scheduled }, { from: statuses.failed }])(
    "takes a $from.status._tag post back to draft",
    ({ from }) => {
      expect(statusOf(moveToDraft(from))).toStrictEqual({ _tag: "draft" });
    }
  );

  it.each([
    { from: statuses.draft },
    { from: statuses.publishing },
    { from: statuses.published },
    { from: statuses.unconfirmed },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(moveToDraft(from))).toMatchObject({
      _tag: "InvalidPostTransition",
      action: "moveToDraft",
      from: from.status._tag,
    });
  });
});

describe(startPublishing, () => {
  const due = inAnHour.at;

  it("starts once the scheduled instant has come", () => {
    expect(statusOf(startPublishing(statuses.scheduled, due))).toStrictEqual({
      _tag: "publishing",
      schedule: inAnHour,
      startedAt: due,
    });
  });

  it("refuses to start early, as when the post was moved later", () => {
    expect(failureOf(startPublishing(statuses.scheduled, now))).toMatchObject({
      _tag: "PostNotDue",
      postId,
    });
  });

  it.each([
    { from: statuses.draft },
    { from: statuses.publishing },
    { from: statuses.failed },
    { from: statuses.unconfirmed },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(startPublishing(from, due))).toMatchObject({
      _tag: "InvalidPostTransition",
      action: "startPublishing",
      from: from.status._tag,
    });
  });
});

describe("the outcome of publishing", () => {
  const later = utc("2026-06-15T08:00:05Z");

  it("records the platform's id for a published post", () => {
    expect(
      statusOf(markPublished(statuses.publishing, platformPostId, later))
    ).toStrictEqual({
      _tag: "published",
      platformPostId: Option.some(platformPostId),
      publishedAt: later,
    });
  });

  it("records why a post failed", () => {
    expect(
      statusOf(markFailed(statuses.publishing, "tokenExpired", later))
    ).toStrictEqual({
      _tag: "failed",
      failedAt: later,
      reason: "tokenExpired",
    });
  });

  it("keeps when the attempt started for an unconfirmed post", () => {
    expect(statusOf(markUnconfirmed(statuses.publishing))).toStrictEqual({
      _tag: "unconfirmed",
      attemptedAt: utc("2026-06-15T08:00:00Z"),
    });
  });

  it.each([
    { from: statuses.draft },
    { from: statuses.scheduled },
    { from: statuses.published },
    { from: statuses.failed },
    { from: statuses.unconfirmed },
  ])("comes only after publishing, not from $from.status._tag", ({ from }) => {
    expect(failureOf(markPublished(from, platformPostId, later))).toMatchObject(
      {
        action: "markPublished",
      }
    );
    expect(failureOf(markFailed(from, "rateLimited", later))).toMatchObject({
      action: "markFailed",
    });
    expect(failureOf(markUnconfirmed(from))).toMatchObject({
      action: "markUnconfirmed",
    });
  });
});

describe("confirming an unconfirmed post", () => {
  const checkedAt = utc("2026-06-15T09:00:00Z");

  it("marks it published at the attempt when the user found it", () => {
    expect(
      statusOf(confirmPublished(statuses.unconfirmed, Option.none()))
    ).toStrictEqual({
      _tag: "published",
      platformPostId: Option.none(),
      publishedAt: utc("2026-06-15T08:00:00Z"),
    });
  });

  it("keeps the platform's id when the user gives it", () => {
    expect(
      statusOf(
        confirmPublished(statuses.unconfirmed, Option.some(platformPostId))
      )
    ).toMatchObject({ platformPostId: Option.some(platformPostId) });
  });

  it("marks it failed when the user did not, so it can be scheduled again", () => {
    const missing = confirmNotPublished(statuses.unconfirmed, checkedAt);

    const tenOClock = new Schedule({
      at: utc("2026-06-15T10:00:00Z"),
      timeZone: inAnHour.timeZone,
    });

    const again = missing.pipe(
      Result.flatMap((post) => schedulePost(post, tenOClock, checkedAt))
    );

    expect(statusOf(missing)).toStrictEqual({
      _tag: "failed",
      failedAt: checkedAt,
      reason: "notPublished",
    });
    expect(statusOf(again)?._tag).toBe("scheduled");
  });

  it.each([
    { from: statuses.draft },
    { from: statuses.scheduled },
    { from: statuses.publishing },
    { from: statuses.published },
    { from: statuses.failed },
  ])("applies only to unconfirmed posts, not $from.status._tag", ({ from }) => {
    expect(failureOf(confirmPublished(from, Option.none()))).toMatchObject({
      action: "confirmPublished",
    });
    expect(failureOf(confirmNotPublished(from, checkedAt))).toMatchObject({
      action: "confirmNotPublished",
    });
  });
});
