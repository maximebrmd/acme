import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { FeedStore } from "#publishing/application/feed-store.ts";
import type { CreateFeedRequest } from "#publishing/application/feeds.ts";
import { Feeds } from "#publishing/application/feeds.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { Queues } from "#publishing/application/queues.ts";
import type { FeedId } from "#publishing/domain/feed-id.ts";
import type { QueueId } from "#publishing/domain/queue-id.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  digestOf,
  FakeFeeds,
  readAddresses,
  resetFeeds,
  serve,
  serveItems,
  toldStops,
} from "#test/publishing/fakes/fake-feeds.ts";
import {
  FakeRecycling,
  resetRecycling,
  startersAre,
} from "#test/publishing/fakes/fake-recycling.ts";
import { setTime } from "#test/publishing/infrastructure/harness.ts";
import { connect, postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  postAllowance,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Feeds on Postgres, as the cron reads them: what a feed holds when it is
// added makes nothing, each new item becomes one draft, or one post on a
// queue, as the starter is now, and what stops a feed is told once.

const timeout = 90_000;

// A Monday, 09:00 in Paris.
const start = "2026-06-15T07:00:00Z";
const paris = TimeZoneIdSchema.make("Europe/Paris");
const blog = "https://blog.example/feed.xml";

// The workspaces a test made, whose feeds it deletes when it ends: other
// tests' runs would read them otherwise.
const tracked = Ref.makeUnsafe<readonly WorkspaceId[]>([]);

const freshWorkspace = newId(WorkspaceIdSchema).pipe(
  Effect.tap((workspaceId) =>
    Ref.update(tracked, (ids) => [...ids, workspaceId])
  )
);

const forgetFeeds = Effect.gen(function* forgetFeeds() {
  const sql = yield* SqlClient.SqlClient;

  for (const workspaceId of yield* Ref.getAndSet(tracked, [])) {
    yield* sql`DELETE FROM publishing.feeds WHERE workspace_id = ${workspaceId}`;
    yield* sql`DELETE FROM publishing.posts WHERE workspace_id = ${workspaceId}`;
  }
}).pipe(Effect.orDie);

const serverWith = (
  gate: Layer.Layer<ApprovalGate> = ApprovalGate.open,
  allowance: ReturnType<typeof postAllowance> = postAllowance()
) =>
  postsServerBehind(
    gate,
    attachableMedia(),
    allowance,
    PostEvents.none,
    FakeRecycling,
    FakeFeeds
  );

const FeedsServer = serverWith();

type Server = Layer.Success<typeof FeedsServer>;

const onServer = <A, E>(
  test: Effect.Effect<A, E, Server>,
  server: Layer.Layer<Server, Layer.Error<typeof FeedsServer>> = FeedsServer
) =>
  setTime(start).pipe(
    Effect.andThen(Effect.all([resetRecycling, resetFeeds])),
    Effect.andThen(
      test.pipe(Effect.ensuring(forgetFeeds), Effect.provide(server))
    )
  );

const poll = Effect.gen(function* poll() {
  const now = yield* DateTime.now;

  return yield* Feeds.use((feeds) => feeds.poll(now));
});

// Moves time on past every feed's next check, by `hours` (one by default).
const later = (hours = 1.2) => TestClock.adjust(`${hours * 60} minutes`);

const created = (
  workspaceId: WorkspaceId,
  request: Partial<CreateFeedRequest> = {}
) =>
  Feeds.use((feeds) =>
    feeds.create(actorIn(workspaceId), {
      attachPicture: false,
      channelIds: [],
      channelSetId: Option.none(),
      mode: "draft",
      queueId: Option.none(),
      template: Option.none(),
      url: blog,
      ...request,
    })
  );

interface PostRow {
  readonly authorId: string | null;
  readonly id: string;
  readonly queueId: string | null;
  readonly scheduledAt: Date | null;
  readonly status: string;
  readonly text: string;
}

const postsOf = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<PostRow>`SELECT id, author_id AS "authorId", queue_id AS "queueId", scheduled_at AS "scheduledAt", status, text FROM publishing.posts WHERE workspace_id = ${workspaceId} ORDER BY id`
  ).pipe(Effect.orDie);

const itemsOf = (workspaceId: WorkspaceId, feedId: FeedId) =>
  Feeds.use((feeds) => feeds.items(actorIn(workspaceId), feedId)).pipe(
    Effect.map((items) =>
      items
        .map(({ digest, outcome, reason }) => ({
          digest,
          outcome,
          reason: Option.getOrUndefined(reason),
        }))
        .toSorted((left, right) => left.digest.localeCompare(right.digest))
    )
  );

const feedNow = (workspaceId: WorkspaceId, feedId: FeedId) =>
  Feeds.use((feeds) => feeds.get(actorIn(workspaceId), feedId));

const queueOn = (
  workspaceId: WorkspaceId,
  ...channelIds: readonly ChannelId[]
) =>
  Queues.use((queues) =>
    queues.create(actorIn(workspaceId), {
      channelIds,
      channelSetId: Option.none(),
      isDefault: true,
      name: "Weekdays",
      slots: [
        { day: "monday", time: { hour: 12, minute: 0 } },
        { day: "monday", time: { hour: 13, minute: 0 } },
        { day: "monday", time: { hour: 14, minute: 0 } },
      ],
      timeZone: paris,
    })
  ).pipe(Effect.map(({ queue }): QueueId => queue.id));

describe("a feed added", () => {
  it.effect(
    "records what it holds, and makes nothing of it",
    () =>
      onServer(
        Effect.gen(function* addsFeed() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");

          yield* serveItems(blog, [
            { n: 2, title: "Second" },
            { n: 1, title: "First" },
          ]);

          const { feed, seen } = yield* created(workspaceId, {
            channelIds: [channel],
          });

          assert.strictEqual(seen, 2);
          assert.deepStrictEqual(feed.title, Option.some("A synthetic blog"));

          yield* later();
          yield* poll;

          assert.lengthOf(yield* postsOf(workspaceId), 0);
          assert.deepStrictEqual(
            (yield* itemsOf(workspaceId, feed.id)).map(({ reason }) => reason),
            ["existing", "existing"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "is refused at an address that is not a feed, and past the workspace's ten",
    () =>
      onServer(
        Effect.gen(function* refusesFeed() {
          const workspaceId = yield* freshWorkspace;

          yield* serve(blog, { _tag: "failing", failure: "notAFeed" });

          const notAFeed = yield* created(workspaceId).pipe(Effect.flip);

          assert.strictEqual(notAFeed._tag, "FeedUnreadable");

          const refused = yield* created(workspaceId, {
            url: "http://blog.example/feed",
          }).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "FeedAddressRefused");

          const template = yield* created(workspaceId, {
            template: Option.some("{title} {author}"),
          }).pipe(Effect.flip);

          assert.strictEqual(template._tag, "FeedTemplateInvalid");

          for (let n = 0; n < 10; n += 1) {
            const url = `https://blog.example/${String(n)}.xml`;

            yield* serveItems(url, []);
            yield* created(workspaceId, { url });
          }

          yield* serveItems(blog, []);

          const tooMany = yield* created(workspaceId).pipe(Effect.flip);

          assert.strictEqual(tooMany._tag, "TooManyFeeds");
        })
      ),
    timeout
  );

  it.effect(
    "is refused a queue to whoever may not schedule",
    () =>
      onServer(
        Effect.gen(function* draftsOnly() {
          const workspaceId = yield* freshWorkspace;

          yield* serveItems(blog, []);

          const refused = yield* Feeds.use((feeds) =>
            feeds.create(
              actorIn(
                workspaceId,
                permissionsFor("editor").filter(
                  (permission) => permission !== "post:schedule"
                )
              ),
              {
                attachPicture: false,
                channelIds: [],
                channelSetId: Option.none(),
                mode: "queue",
                queueId: Option.none(),
                template: Option.none(),
                url: blog,
              }
            )
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "MissingPermission");
        })
      ),
    timeout
  );
});

describe("a feed in draft mode", () => {
  it.effect(
    "makes one draft of each new item, as its starter, once",
    () =>
      onServer(
        Effect.gen(function* makesDrafts() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");

          yield* serveItems(blog, [{ n: 1, title: "Old" }]);

          const { feed } = yield* created(workspaceId, {
            channelIds: [channel],
          });

          yield* serveItems(blog, [
            { link: "https://blog.example/new", n: 2, title: "New" },
            { n: 1, title: "Old" },
          ]);

          yield* later();

          const run = yield* poll;

          assert.isAtLeast(run.made, 1);

          const [draft] = yield* postsOf(workspaceId);

          assert.strictEqual(draft?.status, "draft");
          assert.strictEqual(draft?.text, "New\n\nhttps://blog.example/new");
          assert.isNotNull(draft?.authorId);

          // Read again: the same item makes nothing more.
          yield* later();
          yield* poll;

          assert.lengthOf(yield* postsOf(workspaceId), 1);

          const items = yield* itemsOf(workspaceId, feed.id);

          assert.deepStrictEqual(
            items.find(({ digest }) => digest === digestOf(2)),
            { digest: digestOf(2), outcome: "made", reason: undefined }
          );
        })
      ),
    timeout
  );

  it.effect(
    "makes one draft when two runs read the same feed at once",
    () =>
      onServer(
        Effect.gen(function* runsTogether() {
          const workspaceId = yield* freshWorkspace;

          yield* serveItems(blog, []);
          yield* created(workspaceId);
          yield* serveItems(blog, [{ n: 1, title: "Once" }]);
          yield* later();

          yield* Effect.all([poll, poll], { concurrency: 2 });

          assert.lengthOf(yield* postsOf(workspaceId), 1);
        })
      ),
    timeout
  );

  it.effect(
    "makes so many a run, and skips the rest of a flood",
    () =>
      onServer(
        Effect.gen(function* flood() {
          const workspaceId = yield* freshWorkspace;

          yield* serveItems(blog, []);

          const { feed } = yield* created(workspaceId);

          yield* serveItems(
            blog,
            Array.from({ length: 6 }, (_, n) => ({
              n: n + 1,
              title: `Item ${String(n + 1)}`,
            }))
          );
          yield* later();
          yield* poll;

          assert.lengthOf(yield* postsOf(workspaceId), 3);

          const reasons = (yield* itemsOf(workspaceId, feed.id)).map(
            ({ outcome, reason }) => reason ?? outcome
          );

          assert.deepStrictEqual(reasons.toSorted(), [
            "made",
            "made",
            "made",
            "tooMany",
            "tooMany",
            "tooMany",
          ]);
        })
      ),
    timeout
  );
});

describe("a feed in queue mode", () => {
  it.effect(
    "puts each new item on the queue's next slot, and a run taken up again makes no second",
    () =>
      onServer(
        Effect.gen(function* queues() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queueId = yield* queueOn(workspaceId, channel);

          yield* serveItems(blog, []);

          const { feed } = yield* created(workspaceId, {
            mode: "queue",
            queueId: Option.some(queueId),
          });

          yield* serveItems(blog, [{ n: 1, title: "Queued" }]);
          yield* later();
          yield* poll;

          const [post] = yield* postsOf(workspaceId);

          assert.strictEqual(post?.status, "scheduled");
          assert.strictEqual(post?.queueId, queueId);
          // The queue's next slot: Monday at noon in Paris.
          assert.strictEqual(
            post?.scheduledAt?.toISOString(),
            "2026-06-15T10:00:00.000Z"
          );

          // A crash between the send and its outcome: the item is still
          // claimed when the next run comes.
          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`UPDATE publishing.feed_items SET outcome = 'claimed', post_id = NULL WHERE feed_id = ${feed.id}`
          ).pipe(Effect.orDie);

          yield* later();
          yield* poll;

          const posts = yield* postsOf(workspaceId);

          assert.lengthOf(posts, 1);

          const [item] = yield* FeedStore.use((store) =>
            store.items(feed.id, 10)
          );

          assert.strictEqual(item?.outcome, "made");
          assert.deepStrictEqual(item?.postId, Option.some(post?.id ?? ""));

          yield* PostScheduling.use((scheduling) =>
            scheduling.cancel(
              actorIn(workspaceId),
              PostIdSchema.make(post?.id ?? "")
            )
          ).pipe(Effect.ignore);
        })
      ),
    timeout
  );

  it.effect(
    "makes a draft of what the queue refuses, with why",
    () =>
      onServer(
        Effect.gen(function* heldBack() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const x = yield* connect(workspaceId, "x");
          const queueId = yield* queueOn(workspaceId, channel, x);

          yield* serveItems(blog, []);

          const { feed } = yield* created(workspaceId, {
            mode: "queue",
            queueId: Option.some(queueId),
            template: Option.some("{title}"),
          });

          // The same text already goes out on the channel today.
          yield* PostScheduling.use((scheduling) =>
            scheduling.send(actorIn(workspaceId), {
              channelIds: [channel],
              content: contentOf("Twice"),
              idempotency: Option.none(),
              placement: { _tag: "queue", queueId: Option.some(queueId) },
              timeZone: paris,
            })
          );

          // X takes 280 characters.
          yield* serveItems(blog, [
            { n: 1, title: "Twice" },
            { n: 2, title: "x".repeat(299) },
          ]);
          yield* later();
          yield* poll;

          const posts = yield* postsOf(workspaceId);

          assert.deepStrictEqual(posts.map(({ status }) => status).toSorted(), [
            "draft",
            "draft",
            "scheduled",
          ]);

          assert.deepStrictEqual(
            (yield* itemsOf(workspaceId, feed.id)).map(
              ({ outcome, reason }) => [outcome, reason]
            ),
            [
              ["heldBack", "duplicate"],
              ["heldBack", "contentRejected"],
            ]
          );

          yield* Effect.forEach(
            posts.filter(({ status }) => status === "scheduled"),
            ({ id }) =>
              PostScheduling.use((scheduling) =>
                scheduling.cancel(actorIn(workspaceId), PostIdSchema.make(id))
              ).pipe(Effect.ignore)
          );
        })
      ),
    timeout
  );

  it.effect(
    "is stopped when its queue goes, the item kept as a draft",
    () =>
      onServer(
        Effect.gen(function* queueGone() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queueId = yield* queueOn(workspaceId, channel);

          yield* serveItems(blog, []);

          const { feed } = yield* created(workspaceId, {
            mode: "queue",
            queueId: Option.some(queueId),
          });

          yield* Queues.use((queues) =>
            queues.remove(actorIn(workspaceId), queueId)
          );
          yield* serveItems(blog, [{ n: 1, title: "Kept" }]);
          yield* later();
          yield* poll;

          assert.deepStrictEqual(
            (yield* postsOf(workspaceId)).map(({ status }) => status),
            ["draft"]
          );
          assert.deepStrictEqual(
            (yield* feedNow(workspaceId, feed.id)).status._tag,
            "stopped"
          );
          assert.deepStrictEqual(
            (yield* toldStops).map(({ reason }) => reason),
            ["queueGone"]
          );
        })
      ),
    timeout
  );
});

// A gate that holds every post.
const HoldingServer = serverWith(
  Layer.succeed(
    ApprovalGate,
    ApprovalGate.of({
      admit: () => Effect.succeed("held"),
      approved: () => Effect.succeed(false),
      follow: () => Effect.void,
      forgotten: () => Effect.void,
      holds: () => Effect.succeed(true),
      maySubmit: () => Effect.succeed(true),
      withdrawn: () => Effect.void,
    })
  )
);

describe("a feed whose starter's posts need an approval", () => {
  it.effect(
    "puts its posts on the queue awaiting it",
    () =>
      onServer(
        Effect.gen(function* awaitsApproval() {
          const workspaceId = yield* freshWorkspace;
          const channel = yield* connect(workspaceId, "mastodon");
          const queueId = yield* queueOn(workspaceId, channel);

          yield* serveItems(blog, []);
          yield* created(workspaceId, {
            mode: "queue",
            queueId: Option.some(queueId),
          });
          yield* serveItems(blog, [{ n: 1, title: "Held" }]);
          yield* later();
          yield* poll;

          assert.deepStrictEqual(
            (yield* postsOf(workspaceId)).map(({ status }) => status),
            ["awaitingApproval"]
          );
        }),
        HoldingServer
      ),
    timeout
  );
});

describe("a feed that cannot go on", () => {
  it.effect(
    "stops when its starter is gone, and tells it once",
    () =>
      onServer(
        Effect.gen(function* starterGone() {
          const workspaceId = yield* freshWorkspace;

          yield* serveItems(blog, []);

          const { feed } = yield* created(workspaceId);

          yield* startersAre(() => ({ _tag: "gone" }));
          yield* serveItems(blog, [{ n: 1, title: "Nobody" }]);
          yield* later();
          yield* poll;
          yield* later();
          yield* poll;

          assert.lengthOf(yield* postsOf(workspaceId), 0);
          assert.deepStrictEqual(
            (yield* toldStops).map(({ feedId, reason }) => [feedId, reason]),
            [[feed.id, "starterGone"]]
          );
        })
      ),
    timeout
  );

  it.effect(
    "waits while its starter is locked out, and makes the item once back",
    () =>
      onServer(
        Effect.gen(function* lockedOut() {
          const workspaceId = yield* freshWorkspace;

          yield* serveItems(blog, []);
          yield* created(workspaceId);
          yield* startersAre(() => ({ _tag: "lockedOut" }));
          yield* serveItems(blog, [{ n: 1, title: "Later" }]);
          yield* later();
          yield* poll;

          assert.lengthOf(yield* postsOf(workspaceId), 0);

          yield* resetRecycling;
          yield* later();
          yield* poll;

          assert.lengthOf(yield* postsOf(workspaceId), 1);
        })
      ),
    timeout
  );

  it.effect(
    "stops after seven days of failing reads, and when gone at once",
    () =>
      onServer(
        Effect.gen(function* failing() {
          const workspaceId = yield* freshWorkspace;

          yield* serveItems(blog, []);

          const { feed } = yield* created(workspaceId);

          yield* serve(blog, { _tag: "failing", failure: "serverError" });

          for (let day = 0; day < 8 * 2; day += 1) {
            yield* later(12);
            yield* poll;
          }

          const stopped = yield* feedNow(workspaceId, feed.id);

          assert.deepStrictEqual(stopped.status, {
            _tag: "stopped",
            reason: "unreachable",
            stoppedAt: stopped.updatedAt,
          });

          const gone = "https://gone.example/feed.xml";

          yield* serveItems(gone, []);

          const other = yield* created(workspaceId, { url: gone });

          yield* serve(gone, { _tag: "failing", failure: "gone" });
          yield* later();
          yield* poll;

          assert.strictEqual(
            (yield* feedNow(workspaceId, other.feed.id)).status._tag,
            "stopped"
          );
          assert.deepStrictEqual(
            (yield* toldStops).map(({ reason }) => reason),
            ["unreachable", "gone"]
          );
        })
      ),
    timeout
  );
});

describe("a feed resumed", () => {
  it.effect(
    "reads it at once, records what it holds and makes nothing of it",
    () =>
      onServer(
        Effect.gen(function* resumes() {
          const workspaceId = yield* freshWorkspace;

          yield* serveItems(blog, []);

          const { feed } = yield* created(workspaceId);

          yield* Feeds.use((feeds) =>
            feeds.change(actorIn(workspaceId), feed.id, { status: "paused" })
          );
          yield* serveItems(blog, [{ n: 1, title: "While paused" }]);
          yield* later();
          yield* poll;

          const before = (yield* readAddresses).length;

          const resumed = yield* Feeds.use((feeds) =>
            feeds.change(actorIn(workspaceId), feed.id, { status: "active" })
          );

          assert.strictEqual(resumed.status._tag, "active");
          assert.strictEqual((yield* readAddresses).length, before + 1);

          yield* later();
          yield* poll;

          assert.lengthOf(yield* postsOf(workspaceId), 0);
          assert.deepStrictEqual(
            (yield* itemsOf(workspaceId, feed.id)).map(({ reason }) => reason),
            ["existing"]
          );
        })
      ),
    timeout
  );
});
