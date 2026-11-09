import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import type { PostStatus } from "#publishing/domain/post-status.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import {
  cancelPost,
  createDraft,
  finishPost,
  moveToDraft,
  outcomeOf,
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

const postIn = (status: PostStatus, scheduleRevision = 1): Post =>
  new Post({ id: postId, scheduleRevision, status, workspaceId });

const statuses = {
  cancelled: postIn({
    _tag: "cancelled",
    cancelledAt: now,
    schedule: Option.some(inAnHour),
  }),
  draft: postIn({ _tag: "draft" }, 0),
  finished: postIn({
    _tag: "finished",
    finishedAt: utc("2026-06-15T08:00:05Z"),
    outcome: "published",
    schedule: inAnHour,
    startedAt: inAnHour.at,
  }),
  publishing: postIn({
    _tag: "publishing",
    schedule: inAnHour,
    startedAt: inAnHour.at,
  }),
  scheduled: postIn({ _tag: "scheduled", schedule: inAnHour }),
};

const failureOf = <E>(result: Result.Result<Post, E>): E | undefined =>
  Option.getOrUndefined(Result.getFailure(result));

const successOf = <E>(result: Result.Result<Post, E>): Post | undefined =>
  Option.getOrUndefined(Result.getSuccess(result));

const targetIn = (suffix: string, status: PostTargetStatus): PostTarget =>
  new PostTarget({
    channelId: ChannelIdSchema.make(
      `00000000-0000-7000-8000-00000000000${suffix}`
    ),
    id: PostTargetIdSchema.make(`00000000-0000-7000-9000-00000000000${suffix}`),
    postId,
    round: 1,
    status,
  });

const published = targetIn("a", {
  _tag: "published",
  permalink: Option.none(),
  platformPostId: Option.some(PlatformPostIdSchema.make("1")),
  publishedAt: inAnHour.at,
});

const failed = targetIn("b", {
  _tag: "failed",
  code: Option.none(),
  failedAt: inAnHour.at,
  reason: "unavailable",
});

const unconfirmed = targetIn("c", {
  _tag: "unconfirmed",
  attemptedAt: inAnHour.at,
  reason: "noResponse",
});

const cancelled = targetIn("d", { _tag: "cancelled", cancelledAt: now });

describe(createDraft, () => {
  it("starts a post as a draft at revision 0", () => {
    const post = createDraft(postId, workspaceId);

    expect(post.status).toStrictEqual({ _tag: "draft" });
    expect(post.scheduleRevision).toBe(0);
    expect(post.workspaceId).toBe(workspaceId);
  });
});

describe(schedulePost, () => {
  it.each([
    { from: statuses.draft, label: "a draft" },
    { from: statuses.scheduled, label: "a scheduled post, moving it" },
  ])("schedules $label, with a new revision", ({ from }) => {
    const scheduled = successOf(schedulePost(from, inAnHour, now));

    expect(scheduled?.status).toStrictEqual({
      _tag: "scheduled",
      schedule: inAnHour,
    });
    expect(scheduled?.scheduleRevision).toBe(from.scheduleRevision + 1);
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
      { _tag: "ScheduleInPast", postId }
    );
  });

  it.each([
    { from: statuses.publishing },
    { from: statuses.finished },
    { from: statuses.cancelled },
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
  it("takes a scheduled post back to draft, with a new revision", () => {
    const draft = successOf(moveToDraft(statuses.scheduled));

    expect(draft?.status).toStrictEqual({ _tag: "draft" });
    expect(draft?.scheduleRevision).toBe(2);
  });

  it.each([
    { from: statuses.draft },
    { from: statuses.publishing },
    { from: statuses.finished },
    { from: statuses.cancelled },
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

  it("starts once the scheduled instant has come, keeping the revision", () => {
    const started = successOf(startPublishing(statuses.scheduled, due));

    expect(started?.status).toStrictEqual({
      _tag: "publishing",
      schedule: inAnHour,
      startedAt: due,
    });
    expect(started?.scheduleRevision).toBe(1);
  });

  it("refuses to start early", () => {
    expect(failureOf(startPublishing(statuses.scheduled, now))).toMatchObject({
      _tag: "PostNotDue",
      postId,
    });
  });

  it.each([
    { from: statuses.draft },
    { from: statuses.publishing },
    { from: statuses.finished },
    { from: statuses.cancelled },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(startPublishing(from, due))).toMatchObject({
      _tag: "InvalidPostTransition",
      action: "startPublishing",
      from: from.status._tag,
    });
  });
});

describe(outcomeOf, () => {
  it.each([
    { expected: "published", targets: [published, published] },
    { expected: "partiallyPublished", targets: [published, failed] },
    { expected: "partiallyPublished", targets: [published, cancelled] },
    { expected: "unconfirmed", targets: [published, unconfirmed] },
    { expected: "unconfirmed", targets: [failed, unconfirmed] },
    { expected: "failed", targets: [failed, failed] },
    { expected: "failed", targets: [failed, cancelled] },
    { expected: "cancelled", targets: [cancelled, cancelled] },
  ])(
    "is $expected for $targets.0.status._tag and $targets.1.status._tag",
    ({ expected, targets }) => {
      expect(outcomeOf(targets)).toBe(expected);
    }
  );
});

describe(finishPost, () => {
  const later = utc("2026-06-15T08:00:05Z");

  it("finishes a publishing post with its targets' outcome", () => {
    expect(
      successOf(finishPost(statuses.publishing, [published, failed], later))
        ?.status
    ).toStrictEqual({
      _tag: "finished",
      finishedAt: later,
      outcome: "partiallyPublished",
      schedule: inAnHour,
      startedAt: inAnHour.at,
    });
  });

  it.each([
    { from: statuses.draft },
    { from: statuses.scheduled },
    { from: statuses.finished },
    { from: statuses.cancelled },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(finishPost(from, [published], later))).toMatchObject({
      action: "finish",
      from: from.status._tag,
    });
  });
});

describe(cancelPost, () => {
  it("cancels a scheduled post, keeping its time", () => {
    expect(
      successOf(cancelPost(statuses.scheduled, now))?.status
    ).toStrictEqual({
      _tag: "cancelled",
      cancelledAt: now,
      schedule: Option.some(inAnHour),
    });
  });

  it("cancels a draft", () => {
    expect(successOf(cancelPost(statuses.draft, now))?.status).toStrictEqual({
      _tag: "cancelled",
      cancelledAt: now,
      schedule: Option.none(),
    });
  });

  it.each([
    { from: statuses.publishing },
    { from: statuses.finished },
    { from: statuses.cancelled },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(cancelPost(from, now))).toMatchObject({
      action: "cancel",
      from: from.status._tag,
    });
  });
});
