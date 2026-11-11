import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  ChannelSetNotFound,
  Forbidden,
  InvalidTimeZone,
  maxQueuesPerWorkspace,
  QueueHasNoRoom,
  QueueNameTaken,
  QueueNotFound,
  TooManyQueues,
  UnknownChannels,
} from "peal-contract";
import type { Member, QueueSlot } from "peal-contract";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ChannelSetsHandlers } from "#publishing/api/channel-sets.ts";
import { PostsHandlers } from "#publishing/api/posts.ts";
import { QueuesHandlers } from "#publishing/api/queues.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A workspace's queues: weekly timetables of slots, kept like the other
// items a workspace saves to write its posts.

const timeout = 60_000;

// A Monday morning, 09:00 in Paris.
const start = "2026-06-15T07:00:00Z";

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["posts", "channelSets", "queues"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.mergeAll(PostsHandlers, ChannelSetsHandlers, QueuesHandlers).pipe(
          Layer.provideMerge(securityTest(member))
        ),
        HttpServer.layerServices
      )
    )
  );

const studio = Effect.gen(function* studio() {
  const workspaceId = yield* newId(WorkspaceIdSchema);
  const mastodon = yield* connect(workspaceId, "mastodon");
  const bluesky = yield* connect(workspaceId, "bluesky");

  const editor = yield* clientAs(
    memberOf(workspaceId, permissionsFor("editor"))
  );

  const viewer = yield* clientAs(
    memberOf(workspaceId, permissionsFor("viewer"))
  );

  return {
    bluesky,
    editor,
    mastodon,
    params: { workspaceId },
    viewer,
    workspaceId,
  };
});

const weekdays: readonly QueueSlot[] = [
  { day: "monday", time: "09:30" },
  { day: "tuesday", time: "09:30" },
];

describe("queues", () => {
  it.effect(
    "are kept by name, whatever its case, for members who edit posts",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keeps() {
          const { editor, mastodon, params, viewer } = yield* studio;

          const made = yield* editor.queues.create({
            params,
            payload: {
              channelIds: [mastodon],
              name: "Weekdays",
              slots: weekdays,
              timeZone: "Europe/Paris",
            },
          });

          // The first queue of a workspace is its default.
          assert.isTrue(made.isDefault);
          assert.deepStrictEqual(made.slots, weekdays);
          assert.deepStrictEqual(made.channelIds, [mastodon]);
          assert.isNull(made.channelSetId);
          assert.strictEqual(made.timeZone, "Europe/Paris");

          const taken = yield* editor.queues
            .create({
              params,
              payload: { name: "WEEKDAYS", slots: [], timeZone: "UTC" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(taken, QueueNameTaken);

          const byViewer = yield* viewer.queues
            .create({
              params,
              payload: { name: "Mine", slots: [], timeZone: "UTC" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(byViewer, Forbidden);

          // A reader reads them, and their coming slots.
          const [listed] = yield* viewer.queues.list({ params });

          assert.strictEqual(listed?.id, made.id);

          const got = yield* viewer.queues.get({
            params: { ...params, queueId: made.id },
          });

          assert.deepStrictEqual(got, made);

          const preview = yield* viewer.queues.slots({
            params: { ...params, queueId: made.id },
            query: { count: 3 },
          });

          assert.deepStrictEqual(
            preview.slots.map(({ at, postId }) => [
              DateTime.formatIso(at),
              postId,
            ]),
            [
              ["2026-06-15T07:30:00.000Z", null],
              ["2026-06-16T07:30:00.000Z", null],
              ["2026-06-22T07:30:00.000Z", null],
            ]
          );
          assert.strictEqual(
            preview.nextFree === null
              ? null
              : DateTime.formatIso(preview.nextFree),
            "2026-06-15T07:30:00.000Z"
          );
          assert.isNull(preview.noRoom);

          const renamed = yield* editor.queues.update({
            params: { ...params, queueId: made.id },
            payload: {
              isDefault: true,
              name: "Mornings",
              slots: [{ day: "friday", time: "08:00" }],
              timeZone: "America/New_York",
            },
          });

          assert.strictEqual(renamed.name, "Mornings");
          assert.deepStrictEqual(renamed.channelIds, []);
          assert.strictEqual(
            DateTime.formatIso(renamed.createdAt),
            DateTime.formatIso(made.createdAt)
          );

          yield* editor.queues.delete({
            params: { ...params, queueId: made.id },
          });

          const gone = yield* editor.queues
            .get({ params: { ...params, queueId: made.id } })
            .pipe(Effect.flip);

          assert.instanceOf(gone, QueueNotFound);
          assert.deepStrictEqual(yield* editor.queues.list({ params }), []);
        })
      ),
    timeout
  );

  it.effect(
    "have one default at most, the default first, then by name",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* defaults() {
          const { editor, params } = yield* studio;

          const queue = (name: string, isDefault = false) =>
            editor.queues.create({
              params,
              payload: { isDefault, name, slots: [], timeZone: "UTC" },
            });

          const first = yield* queue("Zeta");
          const second = yield* queue("alpha");
          const third = yield* queue("Beta", true);

          const order = (yield* editor.queues.list({ params })).map(
            ({ id, isDefault }) => [id, isDefault]
          );

          assert.deepStrictEqual(order, [
            [third.id, true],
            [second.id, false],
            [first.id, false],
          ]);

          // Deleting the default leaves none until another is made one.
          yield* editor.queues.delete({
            params: { ...params, queueId: third.id },
          });

          const left = yield* editor.queues.list({ params });

          assert.isTrue(left.every(({ isDefault }) => !isDefault));
        })
      ),
    timeout
  );

  it.effect(
    `are ${String(maxQueuesPerWorkspace)} a workspace at most`,
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* limited() {
          const { editor, params } = yield* studio;

          yield* Effect.forEach(
            Array.from({ length: maxQueuesPerWorkspace }, (_, place) => place),
            (place) =>
              editor.queues.create({
                params,
                payload: {
                  name: `Queue ${String(place)}`,
                  slots: [],
                  timeZone: "UTC",
                },
              }),
            { discard: true }
          );

          const refused = yield* editor.queues
            .create({
              params,
              payload: { name: "One more", slots: [], timeZone: "UTC" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(refused, TooManyQueues);
          assert.strictEqual(
            refused instanceof TooManyQueues ? refused.allowed : 0,
            maxQueuesPerWorkspace
          );
        })
      ),
    timeout
  );

  it.effect(
    "take connected channels, an existing set and an IANA zone, and list a channel disconnected since",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* checks() {
          const { bluesky, editor, mastodon, params, workspaceId } =
            yield* studio;

          const other = yield* studio;

          const elsewhere = yield* editor.queues
            .create({
              params,
              payload: {
                channelIds: [other.mastodon],
                name: "Theirs",
                slots: [],
                timeZone: "UTC",
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(elsewhere, UnknownChannels);

          const offset = yield* editor.queues
            .create({
              params,
              payload: { name: "Offset", slots: [], timeZone: "+01:00" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(offset, InvalidTimeZone);

          const noSet = yield* editor.queues
            .create({
              params,
              payload: {
                channelSetId: "00000000-0000-7000-8000-0000000000ff",
                name: "No set",
                slots: [],
                timeZone: "UTC",
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(noSet, ChannelSetNotFound);

          const set = yield* editor.channelSets.create({
            params,
            payload: { channelIds: [bluesky], name: "Launch" },
          });

          const queue = yield* editor.queues.create({
            params,
            payload: {
              channelIds: [mastodon, bluesky],
              channelSetId: set.id,
              name: "Both",
              slots: weekdays,
              timeZone: "Europe/Paris",
            },
          });

          assert.strictEqual(queue.channelSetId, set.id);

          yield* ChannelRepository.use((channels) =>
            channels.remove(workspaceId, mastodon)
          );

          const [listed] = yield* editor.queues.list({ params });

          assert.deepStrictEqual(listed?.channelIds, [mastodon, bluesky]);
          assert.deepStrictEqual(listed?.unavailableChannelIds, [mastodon]);

          // Saved again, it takes connected channels only.
          const stale = yield* editor.queues
            .update({
              params: { ...params, queueId: queue.id },
              payload: {
                channelIds: [mastodon, bluesky],
                name: "Both",
                slots: weekdays,
                timeZone: "Europe/Paris",
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(stale, UnknownChannels);

          // A set deleted is taken off the queues that name it.
          yield* editor.channelSets.delete({
            params: { ...params, channelSetId: set.id },
          });

          const after = yield* editor.queues.get({
            params: { ...params, queueId: queue.id },
          });

          assert.isNull(after.channelSetId);
        })
      ),
    timeout
  );

  it.effect(
    "say when a queue has no slot to give",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* empty() {
          const { editor, params } = yield* studio;

          const queue = yield* editor.queues.create({
            params,
            payload: { name: "Empty", slots: [], timeZone: "UTC" },
          });

          const preview = yield* editor.queues.slots({
            params: { ...params, queueId: queue.id },
            query: {},
          });

          assert.deepStrictEqual(preview, {
            nextFree: null,
            noRoom: "noSlots",
            slots: [],
          });

          const unknown = yield* editor.queues
            .slots({ params: { ...params, queueId: "not-a-queue" }, query: {} })
            .pipe(Effect.flip);

          assert.instanceOf(unknown, QueueNotFound);
        })
      ),
    timeout
  );
});

describe("posts added to a queue", () => {
  it.effect(
    "are sent onto its next free slot, checked at it, and moved onto it",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* placed() {
          const { bluesky, editor, mastodon, params, workspaceId } =
            yield* studio;

          const queue = yield* editor.queues.create({
            params,
            payload: {
              channelIds: [mastodon, bluesky],
              name: "Weekdays",
              slots: weekdays,
              timeZone: "Europe/Paris",
            },
          });

          const content = { media: [], overrides: [], text: "Evergreen." };

          // Checked first: the slot it would take, and nothing held.
          const check = yield* editor.posts.validate({
            params,
            payload: { channelIds: [], content, when: { _tag: "queue" } },
          });

          assert.isTrue(check.valid);
          assert.strictEqual(
            check.queueSlot === undefined
              ? undefined
              : DateTime.formatIso(check.queueSlot),
            "2026-06-15T07:30:00.000Z"
          );

          // A channel of the queue disconnected since is left out, and said.
          yield* ChannelRepository.use((channels) =>
            channels.remove(workspaceId, bluesky)
          );

          const sent = yield* editor.posts.send({
            headers: {},
            params,
            payload: { channelIds: [], content, when: { _tag: "queue" } },
            query: {},
          });

          assert.strictEqual(sent.queueId, queue.id);
          assert.deepStrictEqual(
            sent.targets.map(({ channelId }) => channelId),
            [mastodon]
          );
          assert.deepStrictEqual(sent.warnings, [
            {
              _tag: "queueChannelsDropped",
              channelIds: [bluesky],
              queueId: queue.id,
              queueName: "Weekdays",
            },
          ]);
          assert.strictEqual(sent.schedule?.timeZone, "Europe/Paris");
          assert.strictEqual(
            sent.schedule === null
              ? undefined
              : DateTime.formatIso(sent.schedule.at),
            "2026-06-15T07:30:00.000Z"
          );

          const found = yield* editor.posts.search({
            params,
            query: { queueId: queue.id },
          });

          assert.deepStrictEqual(
            found.items.map(({ id }) => id),
            [sent.id]
          );

          // A draft put on the queue takes the slot after.
          const draft = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [mastodon],
              content: { ...content, text: "A draft for the queue." },
            },
          });

          const enqueued = yield* editor.posts.enqueue({
            params: { ...params, postId: draft.id },
            payload: { queueId: queue.id },
          });

          assert.strictEqual(enqueued.status, "scheduled");
          assert.strictEqual(
            enqueued.schedule === null
              ? undefined
              : DateTime.formatIso(enqueued.schedule.at),
            "2026-06-16T07:30:00.000Z"
          );

          // A queue without slots has no room, and the check says why.
          const empty = yield* editor.queues.create({
            params,
            payload: { name: "Empty", slots: [], timeZone: "UTC" },
          });

          const noRoom = yield* editor.posts
            .send({
              headers: {},
              params,
              payload: {
                channelIds: [mastodon],
                content: { ...content, text: "Nowhere." },
                when: { _tag: "queue", queueId: empty.id },
              },
              query: {},
            })
            .pipe(Effect.flip);

          assert.instanceOf(noRoom, QueueHasNoRoom);
          assert.strictEqual(
            noRoom instanceof QueueHasNoRoom ? noRoom.reason : undefined,
            "noSlots"
          );

          const unchecked = yield* editor.posts.validate({
            params,
            payload: {
              channelIds: [mastodon],
              content,
              when: { _tag: "queue", queueId: empty.id },
            },
          });

          assert.isFalse(unchecked.valid);
          assert.strictEqual(unchecked.queueNoRoom, "noSlots");

          const unknown = yield* editor.posts
            .enqueue({
              params: { ...params, postId: draft.id },
              payload: { queueId: "not-a-queue" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(unknown, QueueNotFound);
        })
      ),
    timeout
  );
});
