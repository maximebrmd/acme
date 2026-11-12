import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Fiber, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { Queues } from "#publishing/application/queues.ts";
import type { StartRequest } from "#publishing/application/recycling.ts";
import { Recycling } from "#publishing/application/recycling.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import type { RecyclingRuleId } from "#publishing/domain/recycling-rule-id.ts";
import { RecyclingVariant } from "#publishing/domain/recycling-variant.ts";
import { newId } from "#shared/application/ids.ts";
import { Actor } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  FakeRecycling,
  resetRecycling,
  startersAre,
  toldEnds,
  whileRunning,
} from "#test/publishing/fakes/fake-recycling.ts";
import {
  eventually,
  isFinished,
  isSuspended,
  setTime,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  postAllowance,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A recycling rule's occurrences, made by `makeDue` on Postgres as the
// cron makes them: one per rule and run, at the due instant or the
// queue's slot from it, as the starter is now, or the rule ends with its
// reason, told once.

const timeout = 90_000;

// A Monday, 09:00 in Paris; the source goes out a minute later.
const start = "2026-06-15T07:00:00Z";
const sourceAt = "2026-06-15T07:01:00Z";
const paris = TimeZoneIdSchema.make("Europe/Paris");

// The workspaces a test made, whose rules it deletes when it ends: other
// tests' runs would make their occurrences otherwise.
const tracked = Ref.makeUnsafe<readonly WorkspaceId[]>([]);

const freshWorkspace = newId(WorkspaceIdSchema).pipe(
  Effect.tap((workspaceId) =>
    Ref.update(tracked, (ids) => [...ids, workspaceId])
  )
);

const forgetRules = Effect.gen(function* forgetRules() {
  const sql = yield* SqlClient.SqlClient;

  for (const workspaceId of yield* Ref.getAndSet(tracked, [])) {
    yield* sql`DELETE FROM publishing.recycling_rules WHERE workspace_id = ${workspaceId}`;
  }
}).pipe(Effect.orDie);

// What was told of these rules: runs meet the rules other tests keep.
const toldOf = (ruleIds: readonly string[]) =>
  toldEnds.pipe(
    Effect.map((ends) => ends.filter(({ ruleId }) => ruleIds.includes(ruleId)))
  );

const RecyclingServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  postAllowance(),
  PostEvents.none,
  FakeRecycling
);

const onServer = <A, E>(
  test: Effect.Effect<A, E, Layer.Success<typeof RecyclingServer>>,
  server: Layer.Layer<
    Layer.Success<typeof RecyclingServer>,
    Layer.Error<typeof RecyclingServer>
  > = RecyclingServer
) =>
  setTime(start).pipe(
    Effect.andThen(resetRecycling),
    Effect.andThen(
      test.pipe(Effect.ensuring(forgetRules), Effect.provide(server))
    )
  );

const makeDue = Recycling.use((recycling) => recycling.makeDue);

// A post that went out on the channel, a minute from now.
const published = Effect.fn("test.published")(function* published(
  workspaceId: WorkspaceId,
  channel: ChannelId,
  text?: string
) {
  const now = yield* DateTime.now;
  const at = DateTime.add(now, { minutes: 1 });

  const sent = yield* PostScheduling.use((scheduling) =>
    scheduling.send(actorIn(workspaceId), {
      channelIds: [channel],
      content: contentOf(text ?? "Our opening hours, all summer."),
      idempotency: Option.none(),
      placement: { _tag: "at", at },
      timeZone: paris,
    })
  );

  yield* eventually("the source waits", isSuspended(sent.post.id));
  yield* TestClock.setTime(
    DateTime.toEpochMillis(DateTime.add(at, { minutes: 1 }))
  );
  yield* eventually("the source went out", isFinished(sent.post.id));

  return sent.post.id;
});

const weekly = (
  postId: PostId,
  more: Partial<StartRequest> = {}
): StartRequest => ({
  count: Option.none(),
  interval: { count: 1, unit: "weeks" },
  postId,
  queueId: Option.none(),
  until: Option.none(),
  variants: [],
  ...more,
});

const started = (workspaceId: WorkspaceId, request: StartRequest) =>
  Recycling.use((recycling) =>
    recycling.start(actorIn(workspaceId), request)
  ).pipe(Effect.map(({ rule }) => rule));

const ruleNow = (workspaceId: WorkspaceId, ruleId: RecyclingRuleId) =>
  Recycling.use((recycling) =>
    recycling.get(actorIn(workspaceId), ruleId)
  ).pipe(Effect.map(({ rule }) => rule));

interface OccurrenceRow {
  readonly id: PostId;
  readonly occurrence: number;
  readonly scheduledAt: Date;
  readonly status: string;
  readonly text: string;
}

const occurrencesOf = (ruleId: RecyclingRuleId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<OccurrenceRow>`SELECT id, occurrence, scheduled_at AS "scheduledAt", status, text FROM publishing.posts WHERE recycling_id = ${ruleId} ORDER BY occurrence`
  );

const atOf = (rows: readonly OccurrenceRow[]) =>
  rows.map(({ scheduledAt }) => scheduledAt.toISOString());

// Lets the occurrence go out, once its job waits, at a minute past.
const goesOut = Effect.fn("test.goesOut")(function* goesOut(
  postId: PostId,
  after: string
) {
  yield* eventually("the occurrence waits", isSuspended(postId));
  yield* setTime(after);
  yield* eventually("the occurrence went out", isFinished(postId));
});

describe("making a rule's occurrences", () => {
  it.effect(
    "makes one per run, at the next due instant, then the next once it passed",
    () =>
      onServer(
        Effect.gen(function* weeklyRun() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);

          const rule = yield* started(
            workspaceId,
            weekly(source, {
              variants: [
                new RecyclingVariant({
                  overrides: [],
                  text: "Open all summer, as before.",
                }),
              ],
            })
          );

          yield* makeDue;

          const afterOne = (yield* occurrencesOf(rule.id)).length;

          yield* makeDue;

          const [second, ...more] = yield* occurrencesOf(rule.id);

          assert.deepStrictEqual(
            [afterOne, more.length],
            [1, 0],
            "one occurrence a run"
          );
          assert.strictEqual(second?.occurrence, 2);
          assert.strictEqual(second?.text, "Open all summer, as before.");
          assert.strictEqual(
            second?.scheduledAt.toISOString(),
            "2026-06-22T07:01:00.000Z"
          );

          yield* goesOut(second?.id ?? source, "2026-06-22T07:02:00Z");
          yield* makeDue;

          const made = yield* occurrencesOf(rule.id);

          assert.deepStrictEqual(atOf(made), [
            "2026-06-22T07:01:00.000Z",
            "2026-06-29T07:01:00.000Z",
          ]);
          // The third says the source's text again.
          assert.strictEqual(made[1]?.text, "Our opening hours, all summer.");
          assert.strictEqual((yield* ruleNow(workspaceId, rule.id)).made, 3);
        })
      ),
    timeout
  );

  it.effect(
    "leaves a rule a member changed while the run went for the next run, keeping the change",
    () =>
      onServer(
        Effect.gen(function* changedMeanwhile() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);

          const rule = yield* started(
            workspaceId,
            weekly(source, {
              variants: [
                new RecyclingVariant({ overrides: [], text: "Teh sale." }),
              ],
            })
          );

          const corrected = [
            new RecyclingVariant({ overrides: [], text: "The sale." }),
          ];

          const context = yield* Effect.context<Recycling>();

          yield* whileRunning(
            Recycling.use((recycling) =>
              recycling.change(actorIn(workspaceId), rule.id, {
                count: Option.some(5),
                variants: corrected,
              })
            ).pipe(Effect.asVoid, Effect.orDie, Effect.provideContext(context))
          );

          yield* makeDue;

          const kept = yield* ruleNow(workspaceId, rule.id);

          assert.deepStrictEqual(kept.count, Option.some(5));
          assert.strictEqual(kept.variants[0]?.text, "The sale.");

          yield* makeDue;

          const [second] = yield* occurrencesOf(rule.id);

          assert.strictEqual(second?.text, "The sale.");
          assert.deepStrictEqual(
            (yield* ruleNow(workspaceId, rule.id)).count,
            Option.some(5)
          );
        })
      ),
    timeout
  );

  it.effect(
    "makes one occurrence when two runs meet",
    () =>
      onServer(
        Effect.gen(function* together() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));

          yield* Effect.all([makeDue, makeDue], { concurrency: 2 });

          assert.lengthOf(yield* occurrencesOf(rule.id), 1);
          assert.strictEqual((yield* ruleNow(workspaceId, rule.id)).made, 2);
        })
      ),
    timeout
  );

  it.effect(
    "makes one occurrence after intervals missed, at the next due instant after now",
    () =>
      onServer(
        Effect.gen(function* missed() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));

          // Nothing ran for three weeks.
          yield* setTime("2026-07-08T12:00:00Z");
          yield* makeDue;

          assert.deepStrictEqual(atOf(yield* occurrencesOf(rule.id)), [
            "2026-07-13T07:01:00.000Z",
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "leaves the rule as it was when the send rolls back",
    () =>
      onServer(
        Effect.gen(function* rolledBack() {
          const sql = yield* SqlClient.SqlClient;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));
          const taken = yield* newId(WorkspaceIdSchema);

          // A post that holds the occurrence's place already: saving the
          // occurrence fails, after the rule was locked.
          yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text, recycling_id, occurrence) VALUES (${taken}, ${workspaceId}, 'draft', 'A synthetic post', ${rule.id}, 2)`;

          yield* makeDue;

          assert.strictEqual((yield* ruleNow(workspaceId, rule.id)).made, 1);

          yield* sql`DELETE FROM publishing.posts WHERE id = ${taken}`;

          yield* makeDue;

          assert.strictEqual((yield* ruleNow(workspaceId, rule.id)).made, 2);
        })
      ),
    timeout
  );

  it.effect(
    "ends once its count is made, telling nobody",
    () =>
      onServer(
        Effect.gen(function* counted() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);

          const rule = yield* started(
            workspaceId,
            weekly(source, { count: Option.some(2) })
          );

          yield* makeDue;

          const ended = yield* ruleNow(workspaceId, rule.id);

          assert.deepStrictEqual([ended.made, ended.status._tag], [2, "ended"]);
          assert.deepStrictEqual(yield* toldOf([rule.id]), []);
        })
      ),
    timeout
  );

  it.effect(
    "ends when its source is gone, told once",
    () =>
      onServer(
        Effect.gen(function* sourceGone() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);

          const sent = yield* PostScheduling.use((scheduling) =>
            scheduling.send(editor, {
              channelIds: [channel],
              content: contentOf("A post that will be taken back."),
              idempotency: Option.none(),
              placement: { _tag: "at", at: utc(sourceAt) },
              timeZone: paris,
            })
          );

          const rule = yield* started(workspaceId, weekly(sent.post.id));

          yield* PostScheduling.use((scheduling) =>
            scheduling.unschedule(editor, sent.post.id)
          );
          yield* PostDrafts.use((drafts) =>
            drafts.discard(editor, sent.post.id)
          );
          yield* setTime("2026-06-15T07:02:00Z");
          yield* makeDue;
          yield* makeDue;

          const ended = yield* ruleNow(workspaceId, rule.id);

          assert.deepStrictEqual(ended.status._tag, "ended");
          assert.deepStrictEqual(
            (yield* toldOf([rule.id])).map(({ reason }) => reason),
            ["sourceGone"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "ends when its starter is gone or can no longer schedule, and waits while they are locked out",
    () =>
      onServer(
        Effect.gen(function* starters() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));

          yield* startersAre(() => ({ _tag: "lockedOut" }));

          yield* makeDue;

          assert.lengthOf(yield* occurrencesOf(rule.id), 0);
          assert.strictEqual(
            (yield* ruleNow(workspaceId, rule.id)).status._tag,
            "active"
          );

          yield* startersAre((kept) => ({
            _tag: "acting",
            actor: actorIn(kept.workspaceId, permissionsFor("viewer")),
          }));
          yield* makeDue;

          assert.deepStrictEqual(
            (yield* toldOf([rule.id])).map(({ reason }) => reason),
            ["starterGone"]
          );
          assert.lengthOf(yield* occurrencesOf(rule.id), 0);
        })
      ),
    timeout
  );

  it.effect(
    "ends when none of its channels is left, or a platform refuses what it would say",
    () =>
      onServer(
        Effect.gen(function* contentAndChannels() {
          const sql = yield* SqlClient.SqlClient;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const other = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const second = yield* published(workspaceId, other, "Another post.");
          const disconnected = yield* started(workspaceId, weekly(source));
          const refused = yield* started(workspaceId, weekly(second));

          yield* sql`DELETE FROM channels.channels WHERE id = ${channel}`;

          // A variant a platform no longer takes, as when its limit shrank.
          yield* sql`UPDATE publishing.recycling_rules SET variants = ${JSON.stringify(
            [{ overrides: [], text: "x".repeat(600) }]
          )}::jsonb WHERE id = ${refused.id}`;
          yield* makeDue;

          assert.sameMembers(
            (yield* toldOf([disconnected.id, refused.id])).map(
              ({ reason, ruleId }) => `${ruleId}:${reason}`
            ),
            [`${disconnected.id}:noChannels`, `${refused.id}:contentRejected`]
          );
        })
      ),
    timeout
  );

  it.effect(
    "makes nothing past its last day, when the instant it would take is after it, and ends completed",
    () =>
      onServer(
        Effect.gen(function* pastUntil() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);

          // Due on the 22nd, its queue's slot a Friday after its last day.
          const queue = yield* Queues.use((queues) =>
            queues.create(actorIn(workspaceId), {
              channelIds: [],
              channelSetId: Option.none(),
              isDefault: false,
              name: "Fridays",
              slots: [{ day: "friday", time: { hour: 9, minute: 1 } }],
              timeZone: paris,
            })
          ).pipe(Effect.map(({ queue: made }) => made));

          const another = yield* published(workspaceId, channel, "Fridays.");

          const queued = yield* started(
            workspaceId,
            weekly(another, {
              queueId: Option.some(queue.id),
              until: Option.some({ day: 23, month: 6, year: 2026 }),
            })
          );

          // A run before the 22nd: the queue's slot is the 26th.
          yield* setTime("2026-06-20T08:00:00Z");
          yield* makeDue;

          assert.lengthOf(yield* occurrencesOf(queued.id), 0);
          assert.deepStrictEqual(
            (yield* ruleNow(workspaceId, queued.id)).status._tag,
            "ended"
          );

          // Due on the 22nd, last day the 25th; no run until the 23rd.
          const missed = yield* started(
            workspaceId,
            weekly(source, {
              until: Option.some({ day: 25, month: 6, year: 2026 }),
            })
          );

          yield* setTime("2026-06-23T08:00:00Z");
          yield* makeDue;

          assert.lengthOf(yield* occurrencesOf(missed.id), 0);

          const ended = (yield* ruleNow(workspaceId, missed.id)).status;

          assert.strictEqual(
            ended._tag === "ended" ? ended.reason : ended._tag,
            "completed"
          );
          assert.lengthOf(yield* toldOf([missed.id, queued.id]), 0);
        })
      ),
    timeout
  );

  it.effect(
    "ends when its queue is gone, whether the deletion comes before or meets the run",
    () =>
      onServer(
        Effect.gen(function* queueGone() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const editor = actorIn(workspaceId);
          const source = yield* published(workspaceId, channel);

          const queueIn = (name: string) =>
            Queues.use((queues) =>
              queues.create(editor, {
                channelIds: [],
                channelSetId: Option.none(),
                isDefault: false,
                name,
                slots: [{ day: "monday", time: { hour: 9, minute: 1 } }],
                timeZone: paris,
              })
            ).pipe(Effect.map(({ queue }) => queue));

          const removed = (queueId: QueueId) =>
            Queues.use((queues) => queues.remove(editor, queueId));

          const before = yield* queueIn("Before");

          const rule = yield* started(
            workspaceId,
            weekly(source, { queueId: Option.some(before.id) })
          );

          yield* removed(before.id);
          yield* makeDue;

          assert.deepStrictEqual(
            (yield* toldOf([rule.id])).map(({ reason }) => reason),
            ["queueGone"]
          );
          assert.lengthOf(yield* occurrencesOf(rule.id), 0);

          // The run and the deletion together, each one first: neither
          // waits on the other for ever.
          for (const runFirst of [true, false]) {
            const queue = yield* queueIn(
              runFirst ? "Run first" : "Delete first"
            );

            const another = yield* published(
              workspaceId,
              channel,
              runFirst ? "A first race." : "A second race."
            );

            yield* started(
              workspaceId,
              weekly(another, { queueId: Option.some(queue.id) })
            );

            const first = yield* Effect.forkChild(
              runFirst ? makeDue : removed(queue.id)
            );

            yield* runFirst ? removed(queue.id) : makeDue;
            yield* Fiber.join(first);
          }
        })
      ),
    timeout
  );

  it.effect(
    "makes nothing while paused, and goes on once resumed",
    () =>
      onServer(
        Effect.gen(function* paused() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));
          const editor = actorIn(workspaceId);

          yield* Recycling.use((recycling) =>
            recycling.change(editor, rule.id, { paused: true })
          );

          yield* makeDue;

          assert.lengthOf(yield* occurrencesOf(rule.id), 0);

          yield* Recycling.use((recycling) =>
            recycling.resume(editor, rule.id, Option.none())
          );

          yield* makeDue;

          assert.lengthOf(yield* occurrencesOf(rule.id), 1);
        })
      ),
    timeout
  );

  it.effect(
    "tells a rule resumed and ended again a second time",
    () =>
      onServer(
        Effect.gen(function* twice() {
          const sql = yield* SqlClient.SqlClient;
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));
          const editor = actorIn(workspaceId);

          const refuse = sql`UPDATE publishing.recycling_rules SET variants = ${JSON.stringify(
            [{ overrides: [], text: "x".repeat(600) }]
          )}::jsonb WHERE id = ${rule.id}`;

          yield* refuse;
          yield* makeDue;
          yield* Recycling.use((recycling) =>
            recycling.resume(editor, rule.id, Option.none())
          );
          yield* refuse;
          yield* makeDue;

          const keys = (yield* toldOf([rule.id])).map(({ key }) => key);

          assert.deepStrictEqual(keys, [
            `recycling:${rule.id}:ended:0`,
            `recycling:${rule.id}:ended:1`,
          ]);
        })
      ),
    timeout
  );
});

// The plan allows one post a month.
const OnePostServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.none(), connected: 0 }),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () => Effect.succeed(Option.some(1)),
    })
  ),
  PostEvents.none,
  FakeRecycling
);

describe("making an occurrence in a month without room", () => {
  it.effect(
    "ends the rule planLimit, told once",
    () =>
      onServer(
        Effect.gen(function* full() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));

          yield* makeDue;

          assert.deepStrictEqual(yield* toldOf([rule.id]), [
            {
              key: `recycling:${rule.id}:ended:0`,
              reason: "planLimit",
              ruleId: rule.id,
            },
          ]);
        }),
        OnePostServer
      ),
    timeout
  );
});

// A gate that admits the first post it sees and holds every one after.
const holdingAfterFirst = Ref.makeUnsafe(0);

const HoldingServer = postsServerBehind(
  Layer.succeed(
    ApprovalGate,
    ApprovalGate.of({
      admit: () =>
        Ref.getAndUpdate(holdingAfterFirst, (seen) => seen + 1).pipe(
          Effect.map((seen) => (seen === 0 ? "admitted" : "held"))
        ),
      approved: () => Effect.succeed(false),
      follow: () => Effect.void,
      forgotten: () => Effect.void,
      holds: () => Effect.succeed(true),
      maySubmit: () => Effect.succeed(true),
      withdrawn: () => Effect.void,
    })
  ),
  attachableMedia(),
  postAllowance(),
  PostEvents.none,
  FakeRecycling
);

describe("making occurrences for a starter the gate holds", () => {
  it.effect(
    "holds each for an approval, and makes the next at its time all the same",
    () =>
      onServer(
        Effect.gen(function* held() {
          yield* Ref.set(holdingAfterFirst, 0);

          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));

          yield* makeDue;
          yield* setTime("2026-06-22T07:02:00Z");
          yield* makeDue;

          const made = yield* occurrencesOf(rule.id);

          assert.deepStrictEqual(
            made.map(({ status }) => status),
            ["awaitingApproval", "awaitingApproval"]
          );
          assert.deepStrictEqual(atOf(made), [
            "2026-06-22T07:01:00.000Z",
            "2026-06-29T07:01:00.000Z",
          ]);
        }),
        HoldingServer
      ),
    timeout
  );

  it.effect(
    "lets no application without the publishing scope change, resume or stop a rule its member started on the web",
    () =>
      onServer(
        Effect.gen(function* origins() {
          yield* Ref.set(holdingAfterFirst, 0);

          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const source = yield* published(workspaceId, channel);
          const rule = yield* started(workspaceId, weekly(source));
          const writes = permissionsFor("contributor");

          // The same member, through a client that writes drafts only.
          const member = actorIn(workspaceId, writes);

          assert(member.subject._tag === "user");

          const application = new Actor({
            permissions: writes,
            subject: { ...member.subject, clientId: "synthetic-client" },
            workspaceId,
          });

          const variant = [
            new RecyclingVariant({ overrides: [], text: "Not approved." }),
          ];

          const refusals = yield* Effect.all(
            [
              Recycling.use((recycling) =>
                recycling.change(application, rule.id, { variants: variant })
              ),
              Recycling.use((recycling) =>
                recycling.change(application, rule.id, { paused: true })
              ),
              Recycling.use((recycling) =>
                recycling.resume(application, rule.id, Option.none())
              ),
              Recycling.use((recycling) =>
                recycling.stop(application, rule.id)
              ),
            ].map((call) =>
              call.pipe(
                Effect.flip,
                Effect.map(({ _tag }) => _tag)
              )
            )
          );

          assert.deepStrictEqual(refusals, [
            "MissingPermission",
            "MissingPermission",
            "MissingPermission",
            "MissingPermission",
          ]);

          // The member, from where they started it, still changes it.
          const own = yield* Recycling.use((recycling) =>
            recycling.change(member, rule.id, {
              variants: variant,
            })
          );

          assert.lengthOf(own.rule.variants, 1);
        }),
        HoldingServer
      ),
    timeout
  );
});
