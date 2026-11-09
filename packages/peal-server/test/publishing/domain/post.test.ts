import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import { emptyContent } from "#publishing/domain/post-content.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import {
  authorOf,
  cancelPost,
  createDraft,
  discardDraft,
  editDraft,
  finishPost,
  isAuthor,
  mayDiscard,
  moveToDraft,
  outcomeOf,
  Post,
  reopenPost,
  reviseOutcome,
  schedulePost,
  startPublishing,
} from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { actorAs, apiKeyIn, contentOf } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

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
  new Post({
    authorId: Option.none(),
    content: emptyContent,
    id: postId,
    scheduleRevision,
    status,
    workspaceId,
  });

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
    options: Option.none(),
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
    const post = createDraft(postId, workspaceId, emptyContent, Option.none());

    expect(post.status).toStrictEqual({ _tag: "draft" });
    expect(post.scheduleRevision).toBe(0);
    expect(post.workspaceId).toBe(workspaceId);
    expect(post.content).toStrictEqual(emptyContent);
  });
});

describe(editDraft, () => {
  const written = contentOf("Launch day, at last.");

  it("gives a draft new content, keeping its revision", () => {
    const edited = successOf(editDraft(statuses.draft, written));

    expect(edited?.content).toStrictEqual(written);
    expect(edited?.status).toStrictEqual({ _tag: "draft" });
    expect(edited?.scheduleRevision).toBe(statuses.draft.scheduleRevision);
  });

  it.each([
    statuses.scheduled,
    statuses.publishing,
    statuses.finished,
    statuses.cancelled,
  ])("refuses to change a post once $status._tag", (post) => {
    expect(failureOf(editDraft(post, written))).toStrictEqual(
      new InvalidPostTransition({
        action: "edit",
        from: post.status._tag,
        postId,
      })
    );
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

  it.each(["2026-06-15T06:59:59.950Z", "2026-06-15T06:59:00Z"])(
    "takes %s, a moment before now, as now",
    (at) => {
      const moment = new Schedule({ at: utc(at), timeZone: inAnHour.timeZone });

      expect(
        successOf(schedulePost(statuses.draft, moment, now))?.status
      ).toStrictEqual({
        _tag: "scheduled",
        schedule: new Schedule({ at: now, timeZone: inAnHour.timeZone }),
      });
    }
  );

  it("refuses an instant that has passed", () => {
    const earlier = new Schedule({
      at: utc("2026-06-15T06:58:59.999Z"),
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

describe("a post's author", () => {
  const userId = UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f");

  const other = UserIdSchema.make("0e9d8c7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b");

  const contributor = permissionsFor("contributor");

  const draft = createDraft(
    postId,
    workspaceId,
    emptyContent,
    authorOf(actorAs(userId, workspaceId, contributor))
  );

  it("is the member who created the post, and none for an API key", () => {
    expect(draft.authorId).toStrictEqual(Option.some(userId));
    expect(authorOf(apiKeyIn(workspaceId))).toStrictEqual(Option.none());
    expect(isAuthor(draft, actorAs(userId, workspaceId))).toBeTruthy();
    expect(isAuthor(draft, actorAs(other, workspaceId))).toBeFalsy();
    expect(isAuthor(statuses.draft, apiKeyIn(workspaceId))).toBeFalsy();
  });

  it("may discard their draft as a contributor; others need post:delete", () => {
    const mine = actorAs(userId, workspaceId, contributor);
    const theirs = actorAs(other, workspaceId, contributor);

    const viewer = actorAs(userId, workspaceId, permissionsFor("viewer"));

    expect(mayDiscard(mine, draft)).toBeTruthy();
    expect(mayDiscard(theirs, draft)).toBeFalsy();
    expect(mayDiscard(viewer, draft)).toBeFalsy();
    expect(mayDiscard(actorAs(other, workspaceId), draft)).toBeTruthy();
    expect(mayDiscard(apiKeyIn(workspaceId, contributor), draft)).toBeFalsy();
  });
});

describe(discardDraft, () => {
  it("discards a draft", () => {
    expect(successOf(discardDraft(statuses.draft))).toBe(statuses.draft);
  });

  it.each([
    { from: statuses.scheduled },
    { from: statuses.publishing },
    { from: statuses.finished },
    { from: statuses.cancelled },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(discardDraft(from))).toMatchObject({
      action: "discard",
      from: from.status._tag,
    });
  });
});

describe(reopenPost, () => {
  it("makes a finished post publishing again, from its time", () => {
    expect(successOf(reopenPost(statuses.finished, now))?.status).toStrictEqual(
      {
        _tag: "publishing",
        schedule: inAnHour,
        startedAt: now,
      }
    );
  });

  it("leaves a post still publishing as it is", () => {
    expect(successOf(reopenPost(statuses.publishing, now))).toBe(
      statuses.publishing
    );
  });

  it.each([
    { from: statuses.draft },
    { from: statuses.scheduled },
    { from: statuses.cancelled },
  ])("refuses a post that is $from.status._tag", ({ from }) => {
    expect(failureOf(reopenPost(from, now))).toMatchObject({
      action: "reopen",
      from: from.status._tag,
    });
  });
});

describe(reviseOutcome, () => {
  it("adds up the targets again, and keeps when the post finished", () => {
    const revised = successOf(
      reviseOutcome(statuses.finished, [published, failed])
    );

    expect(revised?.status).toMatchObject({
      _tag: "finished",
      finishedAt: utc("2026-06-15T08:00:05Z"),
      outcome: "partiallyPublished",
    });
  });

  it("refuses a post that has not finished", () => {
    expect(
      failureOf(reviseOutcome(statuses.publishing, [published]))
    ).toMatchObject({ action: "finish", from: "publishing" });
  });
});
