import { assert, describe, it } from "@effect/vitest";
import { DateTime, Deferred, Effect, Fiber, Layer, Option, Ref } from "effect";
import type { Scope } from "effect";
import { SqlClient } from "effect/sql";

import { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { ChannelSets } from "#publishing/application/channel-sets.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostBatches } from "#publishing/application/post-batches.ts";
import { PostChecks } from "#publishing/application/post-checks.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { QueueStore } from "#publishing/application/queue-store.ts";
import { Queues } from "#publishing/application/queues.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import type { QueueSlot } from "#publishing/domain/queue.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { Weekday } from "#shared/domain/wall-clock.ts";
import {
  FakeApprovalGate,
  GateLog,
} from "#test/publishing/fakes/fake-approval-gate.ts";
import {
  eventually,
  isFinished,
  isSuspended,
  scheduleIn,
  setTime,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  connect,
  onPostsServerAt,
  postsServerBehind,
  postsServerWith,
} from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  mediaFile,
  postAllowance,
} from "#test/publishing/support.ts";

// Adding a post to a queue: it takes the queue's first free slot after the
// request came, decided under the queue's lock in the transaction that
// saves it, and is an ordinary scheduled post from then on.

const timeout = 90_000;

// A Monday, 09:00 in Paris.
const start = "2026-06-15T07:00:00Z";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const freshWorkspace = newId(WorkspaceIdSchema);

const slot = (day: Weekday, hour: number, minute = 0): QueueSlot => ({
  day,
  time: { hour, minute },
});

// Every day of the week at 09:30 and 10:30 in Paris.
const twiceADay: readonly QueueSlot[] = (
  [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const
).flatMap((day) => [slot(day, 9, 30), slot(day, 10, 30)]);

const queueIn = (
  workspaceId: WorkspaceId,
  {
    channelIds = [],
    name = "Evergreen",
    slots = twiceADay,
  }: {
    readonly channelIds?: readonly ChannelId[];
    readonly name?: string;
    readonly slots?: readonly QueueSlot[];
  } = {}
) =>
  Queues.use((queues) =>
    queues.create(actorIn(workspaceId), {
      channelIds,
      channelSetId: Option.none(),
      isDefault: false,
      name,
      slots,
      timeZone: paris,
    })
  ).pipe(Effect.map(({ queue }) => queue));

const queued = (
  channels: readonly ChannelId[],
  text: string,
  queueId: Option.Option<QueueId>,
  more: Partial<SendPostRequest> = {}
): SendPostRequest => ({
  channelIds: channels,
  content: contentOf(text),
  idempotency: Option.none(),
  placement: { _tag: "queue", queueId },
  timeZone: TimeZoneIdSchema.make("UTC"),
  ...more,
});

// The instant a post is scheduled at, as ISO text.
const timeOf = ({ status }: Post): string | undefined =>
  status._tag === "scheduled" || status._tag === "awaitingApproval"
    ? DateTime.formatIso(status.schedule.at)
    : undefined;

const postsIn = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        count: number;
      }>`SELECT count(*)::int AS count FROM publishing.posts WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.map((rows) => rows[0]?.count ?? 0));

const queueOfPost = (postId: PostId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        queueId: string | null;
      }>`SELECT queue_id AS "queueId" FROM publishing.posts WHERE id = ${postId}`
  ).pipe(Effect.map((rows) => rows[0]?.queueId ?? null));

describe("adding a post to a queue", () => {
  it.effect(
    "takes the first free slot after the request, in the queue's zone, one after the other",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* consecutive() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);

          const first = yield* scheduling.send(
            editor,
            queued([channel], "A first evergreen post.", Option.some(queue.id))
          );

          const second = yield* scheduling.send(
            editor,
            queued([channel], "A second evergreen post.", Option.some(queue.id))
          );

          // 09:30 and 10:30 in Paris, on UTC+2 in June.
          assert.strictEqual(timeOf(first.post), "2026-06-15T07:30:00.000Z");
          assert.strictEqual(timeOf(second.post), "2026-06-15T08:30:00.000Z");
          assert.deepStrictEqual(first.post.queueId, Option.some(queue.id));
          assert.strictEqual(
            first.post.status._tag === "scheduled"
              ? first.post.status.schedule.timeZone
              : undefined,
            paris
          );
          assert.strictEqual(yield* queueOfPost(first.post.id), queue.id);

          // The preview says the same.
          const preview = yield* Queues.use((queues) =>
            queues.preview(editor, queue.id, 3)
          );

          assert.deepStrictEqual(
            preview.slots.map(({ postId }) => Option.getOrNull(postId)),
            [first.post.id, second.post.id, null]
          );
        })
      ),
    timeout
  );

  it.effect(
    "gives twenty posts sent together twenty different slots",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* together() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);

          const sent = yield* Effect.all(
            Array.from({ length: 20 }, (_, place) =>
              scheduling.send(
                editor,
                queued(
                  [channel],
                  `Evergreen post number ${String(place)}.`,
                  Option.some(queue.id)
                )
              )
            ),
            { concurrency: "unbounded" }
          );

          const times = sent
            .flatMap(({ post }) =>
              Option.toArray(Option.fromUndefinedOr(timeOf(post)))
            )
            .toSorted((left, right) => left.localeCompare(right));

          assert.strictEqual(new Set(times).size, 20);
          // The first twenty slots, none skipped.
          assert.strictEqual(times[0], "2026-06-15T07:30:00.000Z");
          assert.strictEqual(times[19], "2026-06-24T08:30:00.000Z");
        })
      ),
    timeout
  );

  it.effect(
    "frees a slot when its post is cancelled or unscheduled, and takes one a post was moved onto by hand",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* frees() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);
          const into = Option.some(queue.id);

          const add = (text: string) =>
            scheduling.send(editor, queued([channel], text, into));

          const cancelled = yield* add("A post cancelled.");

          yield* scheduling.cancel(editor, cancelled.post.id);

          const unscheduled = yield* add("A post taken back to draft.");

          assert.strictEqual(
            timeOf(unscheduled.post),
            "2026-06-15T07:30:00.000Z"
          );

          yield* scheduling.unschedule(editor, unscheduled.post.id);

          // A post of the queue moved by hand onto the second slot holds it.
          const moved = yield* add("A post moved by hand.");

          assert.strictEqual(timeOf(moved.post), "2026-06-15T07:30:00.000Z");

          yield* scheduling.reschedule(
            editor,
            moved.post.id,
            scheduleIn("2026-06-15T08:30:00Z")
          );

          const next = yield* add("A post on the first free slot.");
          const after = yield* add("A post on the slot after.");

          assert.strictEqual(timeOf(next.post), "2026-06-15T07:30:00.000Z");
          assert.strictEqual(timeOf(after.post), "2026-06-16T07:30:00.000Z");
          // A post moved by hand keeps its queue, as one taken back does.
          assert.strictEqual(yield* queueOfPost(moved.post.id), queue.id);
          assert.strictEqual(yield* queueOfPost(unscheduled.post.id), queue.id);
        })
      ),
    timeout
  );

  it.effect(
    "answers a request sent again with its key from the post it made, taking no second slot",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* replays() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);

          const keyed = queued(
            [channel],
            "A post sent twice.",
            Option.some(queue.id),
            {
              idempotency: Option.some({
                fingerprint: "a synthetic request",
                key: "synthetic-key",
              }),
            }
          );

          const first = yield* scheduling.send(editor, keyed);
          const again = yield* scheduling.send(editor, keyed);

          assert.isTrue(again.replayed);
          assert.strictEqual(again.post.id, first.post.id);
          assert.strictEqual(yield* postsIn(workspaceId), 1);

          const next = yield* scheduling.send(
            editor,
            queued([channel], "Another post.", Option.some(queue.id))
          );

          assert.strictEqual(timeOf(next.post), "2026-06-15T08:30:00.000Z");
        })
      ),
    timeout
  );

  it.effect(
    "goes to the queue's channels when it names none, to the default queue when it names no queue, and refuses what has no room",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* defaults() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const none = yield* scheduling
            .send(editor, queued([channel], "No queue yet.", Option.none()))
            .pipe(Effect.flip);

          assert.strictEqual(none._tag, "QueueNotFound");

          // The first queue is the workspace's default.
          const queue = yield* queueIn(workspaceId, { channelIds: [channel] });

          const sent = yield* scheduling.send(
            editor,
            queued([], "A post for the queue's channels.", Option.none())
          );

          assert.deepStrictEqual(
            sent.targets.map(({ channelId }) => channelId),
            [channel]
          );
          assert.deepStrictEqual(sent.post.queueId, Option.some(queue.id));

          const empty = yield* queueIn(workspaceId, {
            name: "Empty",
            slots: [],
          });

          const noSlots = yield* scheduling
            .send(
              editor,
              queued([channel], "Nowhere to go.", Option.some(empty.id))
            )
            .pipe(Effect.flip);

          assert.strictEqual(noSlots._tag, "QueueHasNoRoom");
          assert.strictEqual(
            noSlots._tag === "QueueHasNoRoom" ? noSlots.reason : undefined,
            "noSlots"
          );
          assert.strictEqual(yield* postsIn(workspaceId), 1);
        })
      ),
    timeout
  );

  it.effect(
    "still refuses the same content on a channel near its time",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* duplicates() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);

          const same = queued(
            [channel],
            "The same post.",
            Option.some(queue.id)
          );

          yield* scheduling.send(editor, same);

          const twice = yield* scheduling.send(editor, same).pipe(Effect.flip);

          assert.strictEqual(twice._tag, "DuplicateContent");

          // Nothing was made, so the next post takes the slot after.
          const next = yield* scheduling.send(
            editor,
            queued([channel], "Something else.", Option.some(queue.id))
          );

          assert.strictEqual(timeOf(next.post), "2026-06-15T08:30:00.000Z");
        })
      ),
    timeout
  );

  it.effect(
    "takes three slots in order for three posts of one request",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* inBulk() {
          const batches = yield* PostBatches;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);

          const outcomes = yield* batches.send(
            actorIn(workspaceId),
            ["One", "Two", "Three"].map((text) =>
              queued([channel], `Post ${text}.`, Option.some(queue.id))
            )
          );

          assert.deepStrictEqual(
            outcomes.map((outcome) =>
              outcome._tag === "Success"
                ? timeOf(outcome.success.post)
                : outcome._tag
            ),
            [
              "2026-06-15T07:30:00.000Z",
              "2026-06-15T08:30:00.000Z",
              "2026-06-16T07:30:00.000Z",
            ]
          );
        })
      ),
    timeout
  );

  it.effect(
    "checks a post at the slot it would take, holding nothing",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* checks() {
          const checking = yield* PostChecks;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId, { channelIds: [channel] });

          const check = yield* checking.check(actorIn(workspaceId), {
            channelIds: [],
            content: contentOf("A post checked for the queue."),
            when: Option.some({
              _tag: "queue",
              queueId: Option.some(queue.id),
            }),
          });

          assert.deepStrictEqual(check.filled.channelIds, [channel]);
          assert.deepStrictEqual(
            check.queueSlot.pipe(
              Option.map(({ slot: found }) =>
                found._tag === "Success"
                  ? DateTime.formatIso(found.success)
                  : found.failure
              )
            ),
            Option.some("2026-06-15T07:30:00.000Z")
          );
          assert.deepStrictEqual(check.schedule, Option.some("ok"));
          assert.strictEqual(yield* postsIn(workspaceId), 0);
        })
      ),
    timeout
  );

  it.effect(
    "puts a draft, or a scheduled post, on the next free slot",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* enqueues() {
          const scheduling = yield* PostScheduling;
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const bluesky = yield* connect(workspaceId, "bluesky");
          const editor = actorIn(workspaceId);
          const queue = yield* queueIn(workspaceId, { channelIds: [bluesky] });

          // A draft for no channel yet takes the queue's.
          const draft = yield* drafts.create(editor, {
            channelIds: [],
            content: contentOf("A draft for the queue."),
          });

          const placed = yield* scheduling.enqueue(editor, draft.post.id, {
            channelIds: Option.none(),
            queueId: Option.none(),
          });

          assert.strictEqual(placed.post.status._tag, "scheduled");
          assert.strictEqual(timeOf(placed.post), "2026-06-15T07:30:00.000Z");
          assert.deepStrictEqual(
            placed.targets.map(({ channelId }) => channelId),
            [bluesky]
          );
          assert.deepStrictEqual(placed.post.queueId, Option.some(queue.id));

          // A post scheduled by hand moves onto the next free slot.
          const byHand = yield* scheduling.send(editor, {
            channelIds: [channel],
            content: contentOf("A post with a time of its own."),
            idempotency: Option.none(),
            placement: { _tag: "at", at: utc("2026-07-01T10:00:00Z") },
            timeZone: paris,
          });

          const moved = yield* scheduling.enqueue(editor, byHand.post.id, {
            channelIds: Option.none(),
            queueId: Option.some(queue.id),
          });

          assert.strictEqual(timeOf(moved.post), "2026-06-15T08:30:00.000Z");
          assert.deepStrictEqual(moved.post.queueId, Option.some(queue.id));

          // Added again to the queue it is on, a post stays on its slot.
          const again = yield* scheduling.enqueue(editor, byHand.post.id, {
            channelIds: Option.none(),
            queueId: Option.some(queue.id),
          });

          assert.strictEqual(timeOf(again.post), "2026-06-15T08:30:00.000Z");
        })
      ),
    timeout
  );

  it.effect(
    "publishes a queued post at its slot, and leaves no job behind",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* publishes() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");

          const queue = yield* queueIn(workspaceId, {
            slots: [slot("monday", 9, 1)],
          });

          const sent = yield* scheduling.send(
            actorIn(workspaceId),
            queued([channel], "Out at its slot.", Option.some(queue.id))
          );

          assert.strictEqual(timeOf(sent.post), "2026-06-15T07:01:00.000Z");

          yield* eventually("the job waits", isSuspended(sent.post.id));
          yield* setTime("2026-06-15T07:02:00Z");
          yield* eventually("the post finished", isFinished(sent.post.id));
        })
      ),
    timeout
  );

  it.effect(
    "takes the queue off its posts when it is deleted, which stay scheduled",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* deleted() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);

          const sent = yield* scheduling.send(
            editor,
            queued(
              [channel],
              "A post that outlives its queue.",
              Option.some(queue.id)
            )
          );

          yield* Queues.use((queues) => queues.remove(editor, queue.id));

          assert.isNull(yield* queueOfPost(sent.post.id));

          const left = yield* scheduling
            .reschedule(
              editor,
              sent.post.id,
              scheduleIn("2026-06-20T10:00:00Z")
            )
            .pipe(Effect.map(({ post }) => post.status._tag));

          assert.strictEqual(left, "scheduled");
        })
      ),
    timeout
  );
});

// The plan allows two posts a month.
const TwoAMonthServer = postsServerWith(
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.none(), connected: 0 }),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () => Effect.succeed(Option.some(2)),
    })
  )
);

const onServer = <A, E, R>(
  server: Layer.Layer<R, unknown>,
  test: Effect.Effect<A, E, R | Scope.Scope>
) => setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(server))));

describe("adding a post to a queue on a plan", () => {
  it.effect(
    "refuses a slot in a month without room, never skipping to a later one",
    () =>
      onServer(
        TwoAMonthServer,
        Effect.gen(function* full() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);
          const into = Option.some(queue.id);

          yield* scheduling.send(editor, queued([channel], "One.", into));
          yield* scheduling.send(editor, queued([channel], "Two.", into));

          const third = yield* scheduling
            .send(editor, queued([channel], "Three.", into))
            .pipe(Effect.flip);

          assert.strictEqual(third._tag, "PlanLimitReached");
          assert.strictEqual(yield* postsIn(workspaceId), 2);
        })
      ),
    timeout
  );
});

const GatedServer = postsServerBehind(
  FakeApprovalGate,
  attachableMedia(),
  postAllowance(),
  PostEvents.none
);

describe("adding a post to a queue behind an approval gate", () => {
  it.effect(
    "keeps a held post's slot while it waits",
    () =>
      onServer(
        GatedServer,
        Effect.gen(function* held() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId);
          const editor = actorIn(workspaceId);
          const into = Option.some(queue.id);

          const waiting = yield* scheduling.send(
            editor,
            queued([channel], "A post that waits.", into)
          );

          assert.strictEqual(waiting.post.status._tag, "awaitingApproval");
          assert.lengthOf(yield* GateLog.use((log) => log.held), 1);

          const next = yield* scheduling.send(
            editor,
            queued([channel], "The next one.", into)
          );

          assert.strictEqual(timeOf(waiting.post), "2026-06-15T07:30:00.000Z");
          assert.strictEqual(timeOf(next.post), "2026-06-15T08:30:00.000Z");
        })
      ),
    timeout
  );
});

// Media whose lookup deletes the workspace's queue named Doomed: a queue
// deleted while a post's content is checked, before its slot is taken.
const DeletingMedia = Layer.effect(
  AttachableMedia,
  Effect.gen(function* deletingMedia() {
    const sql = yield* SqlClient.SqlClient;
    const file = mediaFile(attachableImage);

    return AttachableMedia.of({
      lookUp: (actor) =>
        sql`DELETE FROM publishing.queues WHERE workspace_id = ${actor.workspaceId} AND name = 'Doomed'`.pipe(
          Effect.orDie,
          Effect.as([file])
        ),
    });
  })
);

const DeletingServer = postsServerWith(DeletingMedia);

describe("adding a post to a queue deleted meanwhile", () => {
  it.effect(
    "is QueueNotFound, and makes nothing",
    () =>
      onServer(
        DeletingServer,
        Effect.gen(function* gone() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId, { name: "Doomed" });

          const refused = yield* scheduling
            .send(
              actorIn(workspaceId),
              queued(
                [channel],
                "A post with an image.",
                Option.some(queue.id),
                {
                  content: contentOf("A post with an image.", {
                    media: [attachableImage],
                  }),
                }
              )
            )
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "QueueNotFound");
          assert.strictEqual(yield* postsIn(workspaceId), 0);
        })
      ),
    timeout
  );
});

describe("making another queue the default while a channel set goes", () => {
  it.effect(
    "leaves the former default without the set, as its deletion left it",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* race() {
          const store = yield* QueueStore;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const { set } = yield* ChannelSets.use((sets) =>
            sets.create(editor, {
              channelIds: [channel],
              name: "Doomed",
              options: [],
            })
          );

          // The first queue is the default, and names the set.
          const former = yield* Queues.use((queues) =>
            queues.create(editor, {
              channelIds: [],
              channelSetId: Option.some(set.id),
              isDefault: false,
              name: "Former",
              slots: twiceADay,
              timeZone: paris,
            })
          ).pipe(Effect.map(({ queue }) => queue));

          const next = yield* queueIn(workspaceId, { name: "Next" });

          // The save reads the queues, then waits while the set is deleted.
          const listed = yield* Deferred.make<true>();
          const resume = yield* Deferred.make<true>();
          const paused = yield* Ref.make(false);

          const waiting = QueueStore.of({
            ...store,
            list: (id) =>
              store
                .list(id)
                .pipe(
                  Effect.tap(() =>
                    Ref.getAndSet(paused, true).pipe(
                      Effect.flatMap((already) =>
                        already
                          ? Effect.void
                          : Deferred.succeed(listed, true).pipe(
                              Effect.andThen(Deferred.await(resume))
                            )
                      )
                    )
                  )
                ),
          });

          const saving = yield* Queues.use((queues) =>
            queues.update(editor, next.id, {
              channelIds: [],
              channelSetId: Option.none(),
              isDefault: true,
              name: "Next",
              slots: twiceADay,
              timeZone: paris,
            })
          ).pipe(
            Effect.provide(
              Layer.fresh(Queues.layer).pipe(
                Layer.provide(Layer.succeed(QueueStore, waiting))
              )
            ),
            Effect.forkChild
          );

          yield* Deferred.await(listed);
          yield* ChannelSets.use((sets) => sets.remove(editor, set.id));
          yield* Deferred.succeed(resume, true);
          yield* Fiber.join(saving);

          const after = yield* store.byId(workspaceId, former.id);

          assert.deepStrictEqual(
            after.pipe(
              Option.map(({ channelSetId, isDefault }) => ({
                channelSetId,
                isDefault,
              }))
            ),
            Option.some({ channelSetId: Option.none(), isDefault: false })
          );
        })
      ),
    timeout
  );
});

describe("adding a post to a queue without room", () => {
  it.effect(
    "says first what is wrong with the post",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusals() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);
          const full = yield* queueIn(workspaceId, { name: "Full", slots: [] });

          const onFull = (postId: PostId) =>
            scheduling
              .enqueue(editor, postId, {
                channelIds: Option.none(),
                queueId: Option.some(full.id),
              })
              .pipe(
                Effect.flip,
                Effect.map(({ _tag }) => _tag)
              );

          // A post the workspace does not have.
          assert.strictEqual(
            yield* onFull(yield* newId(PostIdSchema)),
            "PostNotFound"
          );

          // A post that can no longer be scheduled.
          const sent = yield* scheduling.send(editor, {
            channelIds: [channel],
            content: contentOf("A post cancelled since."),
            idempotency: Option.none(),
            placement: { _tag: "at", at: utc("2026-07-01T10:00:00Z") },
            timeZone: paris,
          });

          yield* scheduling.cancel(editor, sent.post.id);

          assert.strictEqual(
            yield* onFull(sent.post.id),
            "InvalidPostTransition"
          );

          // A post it may be added to: the queue's lack of room.
          const draft = yield* PostDrafts.use((drafts) =>
            drafts.create(editor, {
              channelIds: [channel],
              content: contentOf("A draft for a full queue."),
            })
          );

          assert.strictEqual(yield* onFull(draft.post.id), "QueueHasNoRoom");
        })
      ),
    timeout
  );
});
