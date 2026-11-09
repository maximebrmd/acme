import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import {
  eventually,
  isSuspended,
  scheduleIn,
  storedPost,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  connect,
  onPostsServerAt,
} from "#test/publishing/posts-server.ts";
import { actorIn, contentOf } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

const unknownChannel = ChannelIdSchema.make(
  "00000000-0000-7000-8000-0000000c0de0"
);

describe(PostDrafts, () => {
  it.effect(
    "creates a draft for the workspace's channels, and edits it",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* createsAndEdits() {
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const bluesky = yield* connect(workspaceId, "bluesky");
          const x = yield* connect(workspaceId, "x");

          // Longer than X takes: a draft is only checked once scheduled.
          const created = yield* drafts.create(actor, {
            channelIds: [bluesky, x, bluesky],
            content: contentOf("a".repeat(400), {
              media: [attachableImage],
              overrides: [[bluesky, "Short for Bluesky"]],
            }),
          });

          assert.strictEqual(created.post.status._tag, "draft");
          assert.strictEqual(created.post.workspaceId, workspaceId);
          assert.deepStrictEqual(
            created.targets.map(({ channelId }) => channelId),
            [bluesky, x]
          );

          const stored = yield* storedPost(created.post.id);

          assert.deepStrictEqual(stored.post.content, created.post.content);
          assert.isTrue(Option.isNone(stored.execution));

          const mastodon = yield* connect(workspaceId, "mastodon");

          const edited = yield* drafts.update(actor, created.post.id, {
            channelIds: [x, mastodon],
            content: contentOf("Edited"),
          });

          assert.strictEqual(edited.post.content.text, "Edited");
          assert.deepStrictEqual(edited.post.content.media, []);

          // The target on X stays the one it was; Bluesky's is gone.
          const onX = created.targets.find(({ channelId }) => channelId === x);

          assert.deepStrictEqual(
            edited.targets.map(({ channelId, id }) => [channelId, id]),
            [
              [x, onX?.id],
              [mastodon, edited.targets[1]?.id],
            ]
          );

          const read = yield* PostQueries.use((queries) =>
            queries.get(actor, created.post.id)
          );

          assert.deepStrictEqual(read.post.content.text, "Edited");
          assert.deepStrictEqual(
            read.targets.map(({ channelId }) => channelId).toSorted(),
            [x, mastodon].toSorted()
          );
        })
      ),
    timeout
  );

  it.effect(
    "refuses channels, media and overrides the draft may not have",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refuses() {
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const other = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const mine = yield* connect(workspaceId, "mastodon");
          const theirs = yield* connect(other, "mastodon");

          const foreign = yield* drafts
            .create(actor, {
              channelIds: [mine, theirs, unknownChannel],
              content: contentOf("Hi"),
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(foreign._tag, "UnknownChannels");
          assert.deepStrictEqual(
            foreign._tag === "UnknownChannels" ? foreign.channelIds : [],
            [theirs, unknownChannel]
          );

          const unknownImage = MediaAssetIdSchema.make(
            "00000000-0000-7000-8000-00000000a002"
          );

          const media = yield* drafts
            .create(actor, {
              channelIds: [mine],
              content: contentOf("Hi", {
                media: [attachableImage, unknownImage],
              }),
            })
            .pipe(Effect.flip);

          assert.strictEqual(media._tag, "UnknownMedia");

          const override = yield* drafts
            .create(actor, {
              channelIds: [],
              content: contentOf("Hi", { overrides: [[mine, "Hi there"]] }),
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            override,
            new PostContentRejected({
              violations: [{ _tag: "overrideWithoutChannel", channelId: mine }],
            })
          );
        })
      ),
    timeout
  );

  it.effect(
    "lets a member edit only their workspace's drafts, as their role allows",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* permissions() {
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const viewer = actorIn(workspaceId, permissionsFor("viewer"));

          const contributor = actorIn(
            workspaceId,
            permissionsFor("contributor")
          );

          const request = { channelIds: [], content: contentOf("Hi") };

          assert.deepStrictEqual(
            yield* drafts.create(viewer, request).pipe(Effect.flip),
            new MissingPermission({ permission: "post:create" })
          );

          const created = yield* drafts.create(contributor, request);

          assert.deepStrictEqual(
            yield* drafts
              .update(viewer, created.post.id, request)
              .pipe(Effect.flip),
            new MissingPermission({ permission: "post:update" })
          );

          const outsider = actorIn(yield* freshWorkspace);

          assert.strictEqual(
            (yield* drafts
              .update(outsider, created.post.id, request)
              .pipe(Effect.flip))._tag,
            "PostNotFound"
          );

          // A contributor drafts, and cannot schedule.
          assert.deepStrictEqual(
            yield* PostScheduling.use((scheduling) =>
              scheduling.reschedule(
                contributor,
                created.post.id,
                scheduleIn("2026-06-15T08:00:00Z")
              )
            ).pipe(Effect.flip),
            new MissingPermission({ permission: "post:schedule" })
          );
        })
      ),
    timeout
  );
});

describe("scheduling a draft", () => {
  it.effect(
    "checks the content against each channel's platform first",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* checksContent() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const x = yield* connect(workspaceId, "x");
          const linkedin = yield* connect(workspaceId, "linkedin");

          const { post } = yield* drafts.create(actor, {
            channelIds: [],
            content: contentOf("a".repeat(300)),
          });

          const refused = yield* scheduling
            .scheduleDraft(actor, post.id, {
              channelIds: [x, linkedin],
              schedule: scheduleIn("2026-06-15T08:00:00Z"),
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            refused,
            new PostContentRejected({
              violations: [
                {
                  _tag: "textTooLong",
                  channelId: x,
                  length: 300,
                  maximum: 280,
                  platform: "x",
                  unit: "weighted",
                },
              ],
            })
          );

          // Nothing changed: still a draft, for no channel.
          const kept = yield* PostQueries.use((queries) =>
            queries.get(actor, post.id)
          );

          assert.strictEqual(kept.post.status._tag, "draft");
          assert.deepStrictEqual(kept.targets, []);

          const scheduled = yield* scheduling.scheduleDraft(actor, post.id, {
            channelIds: [linkedin],
            schedule: scheduleIn("2026-06-15T08:00:00Z"),
          });

          assert.strictEqual(scheduled.post.status._tag, "scheduled");
          assert.deepStrictEqual(
            scheduled.targets.map(({ channelId }) => channelId),
            [linkedin]
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const again = yield* scheduling
            .scheduleDraft(actor, post.id, {
              channelIds: [x],
              schedule: scheduleIn("2026-06-15T09:00:00Z"),
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            again,
            new InvalidPostTransition({
              action: "schedule",
              from: "scheduled",
              postId: post.id,
            })
          );
        })
      ),
    timeout
  );

  it.effect(
    "refuses a time that has passed, and a draft for no channel",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusesTimes() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const mastodon = yield* connect(workspaceId, "mastodon");

          const { post } = yield* drafts.create(actor, {
            channelIds: [mastodon],
            content: contentOf("Hi"),
          });

          const past = yield* scheduling
            .scheduleDraft(actor, post.id, {
              channelIds: [mastodon],
              schedule: scheduleIn("2026-06-15T06:00:00Z"),
            })
            .pipe(Effect.flip);

          assert.strictEqual(past._tag, "ScheduleInPast");

          const empty = yield* drafts.create(actor, {
            channelIds: [],
            content: contentOf("Hi"),
          });

          const none = yield* scheduling
            .reschedule(
              actor,
              empty.post.id,
              scheduleIn("2026-06-15T08:00:00Z")
            )
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            none,
            new PostContentRejected({ violations: [{ _tag: "noChannels" }] })
          );

          // A draft with its channels is scheduled where it stands.
          const moved = yield* scheduling.reschedule(
            actor,
            post.id,
            scheduleIn("2026-06-15T08:00:00Z")
          );

          assert.strictEqual(moved.post.status._tag, "scheduled");
          assert.deepStrictEqual(
            moved.targets.map(({ channelId }) => channelId),
            [mastodon]
          );

          // Editing a scheduled post is a conflict.
          const edit = yield* drafts
            .update(actor, post.id, {
              channelIds: [mastodon],
              content: contentOf("Late"),
            })
            .pipe(Effect.flip);

          assert.strictEqual(edit._tag, "InvalidPostTransition");

          const cancelled = yield* scheduling.cancel(actor, post.id);

          assert.strictEqual(cancelled.post.status._tag, "cancelled");
          assert.deepStrictEqual(
            cancelled.targets.map(({ status }) => status._tag),
            ["cancelled"]
          );
        })
      ),
    timeout
  );
});

describe("PostQueries.listScheduled", () => {
  it.effect(
    "lists the workspace's posts in the range, by scheduled instant",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* lists() {
          const scheduling = yield* PostScheduling;
          const queries = yield* PostQueries;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const mastodon = yield* connect(workspaceId, "mastodon");
          const bluesky = yield* connect(workspaceId, "bluesky");

          const at = (
            iso: string,
            channelIds: readonly [ChannelId, ...ChannelId[]]
          ) =>
            scheduling.schedule(actor, {
              channelIds,
              content: contentOf(`Due ${iso}`),
              schedule: scheduleIn(iso),
            });

          const late = yield* at("2026-06-17T09:00:00Z", [mastodon]);
          const early = yield* at("2026-06-16T09:00:00Z", [mastodon, bluesky]);

          yield* at("2026-06-20T09:00:00Z", [mastodon]);
          yield* PostDrafts.use((drafts) =>
            drafts.create(actor, {
              channelIds: [mastodon],
              content: contentOf("Draft"),
            })
          );

          // Another workspace's post at the same time is not listed.
          const other = yield* freshWorkspace;
          const theirs = yield* connect(other, "mastodon");

          yield* scheduling.schedule(actorIn(other), {
            channelIds: [theirs],
            content: contentOf("Theirs"),
            schedule: scheduleIn("2026-06-16T09:00:00Z"),
          });

          const listed = yield* queries.listScheduled(actor, {
            from: utc("2026-06-15T00:00:00Z"),
            to: utc("2026-06-20T09:00:00Z"),
          });

          assert.deepStrictEqual(
            listed.map(({ post }) => post.id),
            [early.post.id, late.post.id]
          );
          assert.deepStrictEqual(
            listed[0]?.targets.map(({ channelId, status }) => [
              channelId,
              status._tag,
            ]),
            early.targets.map(({ channelId }) => [channelId, "pending"])
          );

          const reader = actorIn(workspaceId, ["post:read"]);

          assert.lengthOf(
            yield* queries.listScheduled(reader, {
              from: utc("2026-06-16T09:00:00Z"),
              to: utc("2026-06-16T09:00:00.001Z"),
            }),
            1
          );
        })
      ),
    timeout
  );

  it.effect.each([
    {
      from: "2026-06-16T00:00:00Z",
      label: "an empty range",
      to: "2026-06-16T00:00:00Z",
    },
    {
      from: "2026-06-17T00:00:00Z",
      label: "a range backwards",
      to: "2026-06-16T00:00:00Z",
    },
    {
      from: "2026-06-01T00:00:00Z",
      label: "more than 62 days",
      to: "2026-08-02T00:00:01Z",
    },
  ])(
    "refuses $label",
    ({ from, to }) =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusesRange() {
          const workspaceId = yield* freshWorkspace;

          const refused = yield* PostQueries.use((queries) =>
            queries.listScheduled(actorIn(workspaceId), {
              from: utc(from),
              to: utc(to),
            })
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "InvalidTimeRange");
        })
      ),
    timeout
  );
});
