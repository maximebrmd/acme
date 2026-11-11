import { assert, describe, it } from "@effect/vitest";
import { Context, DateTime, Effect, Exit, Layer, Option, Ref } from "effect";
import type { Scope } from "effect";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { Queues } from "#publishing/application/queues.ts";
import type { Post } from "#publishing/domain/post.ts";
import type { Queue, QueueSlot } from "#publishing/domain/queue.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import type { Weekday } from "#shared/domain/wall-clock.ts";
import {
  FakeApprovalGate,
  GateLog,
} from "#test/publishing/fakes/fake-approval-gate.ts";
import {
  eventually,
  executionOf,
  isFinished,
  isSuspended,
  jobResult,
  scheduleIn,
  setTime,
  settle,
  storedPost,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  attachableMedia,
  postAllowance,
  actorIn,
  contentOf,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Reshuffling a queue: its waiting posts are moved onto its slots as they
// now are, first to first, each as a hand move would move it.

const timeout = 90_000;

// A Monday, 09:00 in Paris.
const start = "2026-06-15T07:00:00Z";

const paris = TimeZoneIdSchema.make("Europe/Paris");

const freshWorkspace = newId(WorkspaceIdSchema);

const everyDay: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const slot = (day: Weekday, hour: number, minute = 0): QueueSlot => ({
  day,
  time: { hour, minute },
});

const daily = (...times: readonly (readonly [number, number])[]) =>
  everyDay.flatMap((day) =>
    times.map(([hour, minute]) => slot(day, hour, minute))
  );

// PostEvents that keeps the posts told as scheduled.
class Heard extends Context.Service<
  Heard,
  { readonly scheduled: Effect.Effect<readonly PostId[]> }
>()("test/publishing/reshuffle/Heard") {}

const Hearing = Layer.effectContext(
  Effect.gen(function* Hearing() {
    const scheduled = yield* Ref.make<readonly PostId[]>([]);

    return Context.make(
      PostEvents,
      PostEvents.of({
        cancelled: () => Effect.void,
        confirmed: () => Effect.void,
        scheduled: (post) => Ref.update(scheduled, (ids) => [...ids, post.id]),
        unscheduled: () => Effect.void,
      })
    ).pipe(Context.add(Heard, Heard.of({ scheduled: Ref.get(scheduled) })));
  })
);

const OpenServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  postAllowance(),
  Hearing
);

const GatedServer = postsServerBehind(
  FakeApprovalGate,
  attachableMedia(),
  postAllowance(),
  PostEvents.none
);

// The plan allows two posts a month.
const TwoAMonthServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.none(), connected: 0 }),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () => Effect.succeed(Option.some(2)),
    })
  ),
  PostEvents.none
);

const onServer = <A, E, R>(
  at: string,
  server: Layer.Layer<R, unknown>,
  test: Effect.Effect<A, E, R | Scope.Scope>
) => setTime(at).pipe(Effect.andThen(test.pipe(Effect.provide(server))));

const queueIn = (workspaceId: WorkspaceId, slots: readonly QueueSlot[]) =>
  Queues.use((queues) =>
    queues.create(actorIn(workspaceId), {
      channelIds: [],
      channelSetId: Option.none(),
      isDefault: false,
      name: "Evergreen",
      slots,
      timeZone: paris,
    })
  ).pipe(Effect.map(({ queue }) => queue));

const retimed = (queue: Queue, slots: readonly QueueSlot[]) =>
  Queues.use((queues) =>
    queues.update(actorIn(queue.workspaceId), queue.id, {
      channelIds: queue.channelIds,
      channelSetId: queue.channelSetId,
      isDefault: queue.isDefault,
      name: queue.name,
      slots,
      timeZone: queue.timeZone,
    })
  );

const queued = (
  channel: ChannelId,
  text: string,
  queue: Queue
): SendPostRequest => ({
  channelIds: [channel],
  content: contentOf(text),
  idempotency: Option.none(),
  placement: { _tag: "queue", queueId: Option.some(queue.id) },
  timeZone: TimeZoneIdSchema.make("UTC"),
});

// The instant a post is scheduled at, as ISO text.
const timeOf = ({ status }: Post): string | undefined =>
  status._tag === "scheduled" || status._tag === "awaitingApproval"
    ? DateTime.formatIso(status.schedule.at)
    : undefined;

const nowStored = (postId: PostId) =>
  storedPost(postId).pipe(Effect.map(({ post }) => post));

const timesOf = (postIds: readonly PostId[]) =>
  Effect.all(
    postIds.map((postId) => nowStored(postId).pipe(Effect.map(timeOf)))
  );

describe("reshuffling a queue", () => {
  it.effect(
    "moves its waiting posts onto its slots in order, two on one instant and one moved by hand included, and leaves a post on its slot untouched",
    () =>
      onServer(
        start,
        OpenServer,
        Effect.gen(function* inOrder() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId, daily([9, 30], [10, 30]));
          const editor = actorIn(workspaceId);

          const send = (text: string) =>
            scheduling
              .send(editor, queued(channel, text, queue))
              .pipe(Effect.map(({ post }) => post));

          // 09:30 and 10:30 in Paris on Monday, 09:30 on Tuesday.
          const first = yield* send("The first post.");
          const second = yield* send("The second post.");
          const third = yield* send("The third post.");

          // Moved by hand onto the first post's instant, then one moved
          // by hand off the timetable.
          const sharing = yield* send("A post on the first's instant.");

          yield* scheduling.reschedule(
            editor,
            sharing.id,
            scheduleIn("2026-06-15T07:30:00Z")
          );

          const off = yield* send("A post off the timetable.");

          yield* scheduling.reschedule(
            editor,
            off.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );

          // The queue now goes out at 09:30 only.
          yield* retimed(queue, daily([9, 30]));

          const heardBefore = (yield* Heard.use((heard) => heard.scheduled))
            .length;

          // Of the two on one instant, the smaller id stays.
          const [stays, moves] =
            first.id < sharing.id ? [first, sharing] : [sharing, first];

          const revisionBefore = (yield* nowStored(stays.id)).scheduleRevision;

          const result = yield* scheduling.reshuffle(editor, queue.id);

          assert.deepStrictEqual(result, {
            moved: 4,
            remaining: 0,
            stoppedBy: Option.none(),
            unchanged: 1,
          });

          assert.deepStrictEqual(
            yield* timesOf([stays.id, moves.id, second.id, off.id, third.id]),
            [
              "2026-06-15T07:30:00.000Z",
              "2026-06-16T07:30:00.000Z",
              "2026-06-17T07:30:00.000Z",
              "2026-06-18T07:30:00.000Z",
              "2026-06-19T07:30:00.000Z",
            ]
          );

          // The post on its slot was not written, nor told.
          assert.strictEqual(
            (yield* nowStored(stays.id)).scheduleRevision,
            revisionBefore
          );

          const told = (yield* Heard.use((heard) => heard.scheduled)).slice(
            heardBefore
          );

          assert.sameMembers(
            [...told],
            [moves.id, second.id, off.id, third.id]
          );
          // Each moved post stays the queue's.
          assert.deepStrictEqual(
            (yield* nowStored(off.id)).queueId,
            Option.some(queue.id)
          );

          // Called again, it moves nothing.
          const again = yield* scheduling.reshuffle(editor, queue.id);

          assert.deepStrictEqual(again, {
            moved: 0,
            remaining: 0,
            stoppedBy: Option.none(),
            unchanged: 5,
          });
        })
      ),
    timeout
  );

  it.effect(
    "ends with each post on a slot of its own when two calls run together",
    () =>
      onServer(
        start,
        OpenServer,
        Effect.gen(function* together() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId, daily([9, 30], [10, 30]));
          const editor = actorIn(workspaceId);

          const sent = yield* Effect.forEach(
            Array.from({ length: 12 }, (_, place) => place),
            (place) =>
              scheduling
                .send(
                  editor,
                  queued(channel, `Post number ${String(place)}.`, queue)
                )
                .pipe(Effect.map(({ post }) => post))
          );

          yield* retimed(queue, daily([11, 0]));

          const [one, two] = yield* Effect.all(
            [
              scheduling.reshuffle(editor, queue.id),
              scheduling.reshuffle(editor, queue.id),
            ],
            { concurrency: "unbounded" }
          );

          // Each post was moved once, by one of the two; the other left it.
          assert.strictEqual(one.moved + two.moved, 12);
          assert.strictEqual(one.unchanged + two.unchanged, 12);

          const after = yield* Effect.all(sent.map(({ id }) => nowStored(id)));

          assert.deepStrictEqual(
            after.map(({ scheduleRevision }) => scheduleRevision),
            sent.map(({ scheduleRevision }) => scheduleRevision + 1)
          );

          // The first twelve 11:00 slots, in the order the posts had.
          assert.deepStrictEqual(
            after.map(timeOf),
            Array.from({ length: 12 }, (_, day) =>
              DateTime.formatIso(
                DateTime.add(DateTime.makeUnsafe("2026-06-15T09:00:00Z"), {
                  days: day,
                })
              )
            )
          );
        })
      ),
    timeout
  );

  it.effect(
    "publishes a moved post at its new time, and stops the job for the old one",
    () =>
      onServer(
        start,
        OpenServer,
        Effect.gen(function* publishes() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId, [slot("monday", 9, 1)]);
          const editor = actorIn(workspaceId);

          const { post } = yield* scheduling.send(
            editor,
            queued(channel, "Out at its new slot.", queue)
          );

          assert.strictEqual(timeOf(post), "2026-06-15T07:01:00.000Z");

          yield* eventually("the job waits", isSuspended(post.id));

          const oldJob = yield* executionOf(post.id);

          yield* retimed(queue, [slot("monday", 9, 5)]);
          yield* scheduling.reshuffle(editor, queue.id);

          yield* eventually(
            "the old job stops",
            jobResult(oldJob).pipe(Effect.map(Option.isSome))
          );

          const stopped = yield* jobResult(oldJob);

          assert.isTrue(
            Option.isSome(stopped) && Exit.hasInterrupts(stopped.value)
          );

          yield* eventually("the new job waits", isSuspended(post.id));
          yield* setTime("2026-06-15T07:02:00Z");
          yield* settle();

          assert.isFalse(yield* isFinished(post.id));

          yield* setTime("2026-06-15T07:06:00Z");
          yield* eventually("the post finished", isFinished(post.id));
        })
      ),
    timeout
  );

  it.effect(
    "refuses a queue without slots, and one that is not the workspace's",
    () =>
      onServer(
        start,
        OpenServer,
        Effect.gen(function* refuses() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const queue = yield* queueIn(workspaceId, []);

          const noSlots = yield* scheduling
            .reshuffle(actorIn(workspaceId), queue.id)
            .pipe(Effect.flip);

          assert.strictEqual(
            noSlots._tag === "QueueHasNoRoom" ? noSlots.reason : noSlots._tag,
            "noSlots"
          );

          const elsewhere = yield* scheduling
            .reshuffle(actorIn(yield* freshWorkspace), queue.id)
            .pipe(Effect.flip);

          assert.strictEqual(elsewhere._tag, "QueueNotFound");

          const viewer = yield* scheduling
            .reshuffle(actorIn(workspaceId, permissionsFor("viewer")), queue.id)
            .pipe(Effect.flip);

          assert.strictEqual(viewer._tag, "MissingPermission");
        })
      ),
    timeout
  );
});

describe("reshuffling a queue on a plan", () => {
  it.effect(
    "stops at a month without room, keeps what it moved, and says how many are left",
    () =>
      onServer(
        // A Monday, 09:00 in Paris, at the end of June.
        "2026-06-29T07:00:00Z",
        TwoAMonthServer,
        Effect.gen(function* full() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId, daily([9, 30]));
          const editor = actorIn(workspaceId);

          // Two in June (29th, 30th), two in July (1st, 2nd): both full.
          const posts = yield* Effect.forEach(
            ["One.", "Two.", "Three.", "Four."],
            (text) =>
              scheduling
                .send(editor, queued(channel, text, queue))
                .pipe(Effect.map(({ post }) => post))
          );

          // Tuesdays and Wednesdays: the first goes to the 30th, still in
          // June; the second would go to July, which has no room.
          yield* retimed(queue, [
            slot("tuesday", 9, 30),
            slot("wednesday", 9, 30),
          ]);

          const result = yield* scheduling.reshuffle(editor, queue.id);

          assert.deepStrictEqual(result, {
            moved: 1,
            remaining: 3,
            stoppedBy: Option.some("planLimit"),
            unchanged: 0,
          });

          assert.deepStrictEqual(yield* timesOf(posts.map(({ id }) => id)), [
            "2026-06-30T07:30:00.000Z",
            "2026-06-30T07:30:00.000Z",
            "2026-07-01T07:30:00.000Z",
            "2026-07-02T07:30:00.000Z",
          ]);
        })
      ),
    timeout
  );
});

describe("reshuffling a queue behind an approval gate", () => {
  it.effect(
    "keeps a held post waiting at its new time, and lets someone who only asks move held posts alone",
    () =>
      onServer(
        start,
        GatedServer,
        Effect.gen(function* held() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queue = yield* queueIn(workspaceId, daily([9, 30], [10, 30]));
          const editor = actorIn(workspaceId);

          const send = (text: string) =>
            scheduling
              .send(editor, queued(channel, text, queue))
              .pipe(Effect.map(({ post }) => post));

          // Every post waits, but the second, approved and scheduled.
          const first = yield* send("The first post.");
          const second = yield* send("The second post.");
          const third = yield* send("The third post.");

          yield* GateLog.use((log) => log.approve(second.id));
          yield* scheduling.reschedule(
            editor,
            second.id,
            scheduleIn("2026-06-15T08:30:00Z")
          );

          assert.strictEqual(
            (yield* nowStored(second.id)).status._tag,
            "scheduled"
          );

          yield* retimed(queue, daily([10, 30]));

          const contributor = actorIn(
            workspaceId,
            permissionsFor("contributor")
          );

          const result = yield* scheduling.reshuffle(contributor, queue.id);

          assert.deepStrictEqual(result, {
            moved: 2,
            remaining: 0,
            stoppedBy: Option.none(),
            unchanged: 1,
          });

          const [firstNow, secondNow, thirdNow] = yield* Effect.forEach(
            [first, second, third],
            ({ id }) => nowStored(id)
          );

          assert.strictEqual(firstNow?.status._tag, "awaitingApproval");
          assert.strictEqual(
            firstNow === undefined ? undefined : timeOf(firstNow),
            "2026-06-15T08:30:00.000Z"
          );
          // The scheduled post was not theirs to move.
          assert.strictEqual(secondNow?.status._tag, "scheduled");
          assert.strictEqual(
            secondNow === undefined ? undefined : timeOf(secondNow),
            "2026-06-15T08:30:00.000Z"
          );
          assert.strictEqual(thirdNow?.status._tag, "awaitingApproval");
          assert.strictEqual(
            thirdNow === undefined ? undefined : timeOf(thirdNow),
            "2026-06-17T08:30:00.000Z"
          );
        })
      ),
    timeout
  );
});
