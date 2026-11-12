import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import type { Scope } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { SqlClient } from "effect/sql";
import { Api } from "peal-contract";
import type { Member } from "peal-contract";

import { FeedsHandlers } from "#publishing/api/feeds.ts";
import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import {
  FakeFeeds,
  resetFeeds,
  serveItems,
} from "#test/publishing/fakes/fake-feeds.ts";
import { setTime } from "#test/publishing/infrastructure/harness.ts";
import { postsServerBehind } from "#test/publishing/posts-server.ts";
import { attachableMedia, postAllowance } from "#test/publishing/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Feeds through the API: added, read, changed, paused and deleted by
// those who may make posts, a queue only by those who may schedule, and
// the reads of addresses members give counted by the hour.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";
const blog = "https://blog.example/feed.xml";

const FeedsServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  postAllowance(),
  PostEvents.none,
  undefined,
  FakeFeeds
);

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["feeds"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        FeedsHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

// The workspaces the tests made, whose feeds go when the test ends.
const tracked = Ref.makeUnsafe<readonly string[]>([]);

const forgetFeeds = Effect.gen(function* forgetFeeds() {
  const sql = yield* SqlClient.SqlClient;

  for (const workspaceId of yield* Ref.getAndSet(tracked, [])) {
    yield* sql`DELETE FROM publishing.feeds WHERE workspace_id = ${workspaceId}`;
    yield* sql`DELETE FROM publishing.feed_reads WHERE workspace_id = ${workspaceId}`;
  }
}).pipe(Effect.orDie);

const onServer = <A, E>(
  test: Effect.Effect<A, E, Layer.Success<typeof FeedsServer> | Scope.Scope>
) =>
  setTime(start).pipe(
    Effect.andThen(resetFeeds),
    Effect.andThen(
      test.pipe(Effect.ensuring(forgetFeeds), Effect.provide(FeedsServer))
    )
  );

const withoutSchedule = permissionsFor("editor").filter(
  (permission) => permission !== "post:schedule"
);

const studio = Effect.gen(function* studio() {
  const workspaceId = yield* newId(WorkspaceIdSchema);

  yield* Ref.update(tracked, (ids) => [...ids, workspaceId]);

  const editor = yield* clientAs(
    memberOf(workspaceId, permissionsFor("editor"))
  );

  const viewer = yield* clientAs(
    memberOf(workspaceId, permissionsFor("viewer"))
  );

  // An application the member let write drafts, and not publish.
  const application = yield* clientAs({
    permissions: withoutSchedule,
    principal: {
      _tag: "user",
      impersonatedBy: null,
      oauth: {
        clientId: "synthetic-client",
        scopes: ["workspace:write"],
        workspaceId,
      },
      userId: "4b7e9c1d-5a6b-4c8d-9e0f-2f6c8d3e0f4a",
    },
    workspaceId,
  });

  return { application, editor, params: { workspaceId }, viewer };
});

describe("feeds", () => {
  it.effect(
    "are added, read, changed, paused and deleted by those who make posts",
    () =>
      onServer(
        Effect.gen(function* lifecycle() {
          const { editor, params, viewer } = yield* studio;

          yield* serveItems(blog, [{ n: 1, title: "Already there" }]);

          const added = yield* editor.feeds.create({
            params,
            payload: { template: "{title}", url: blog },
          });

          assert.deepStrictEqual(
            [added.seen, added.feed.mode, added.feed.status, added.feed.title],
            [1, "draft", "active", "A synthetic blog"]
          );

          const page = yield* viewer.feeds.list({ params, query: {} });

          assert.deepStrictEqual(
            page.items.map(({ id }) => id),
            [added.feed.id]
          );

          const items = yield* viewer.feeds.items({
            params: { ...params, feedId: added.feed.id },
          });

          assert.deepStrictEqual(
            items.items.map(({ outcome, reason }) => [outcome, reason]),
            [["skipped", "existing"]]
          );
          // Each item is told apart by its identity's digest, never its text.
          assert.match(items.items[0]?.digest ?? "", /^[0-9a-f]{64}$/u);

          const paused = yield* editor.feeds.update({
            params: { ...params, feedId: added.feed.id },
            payload: { status: "paused", template: "{title}\n{link}" },
          });

          assert.deepStrictEqual(
            [paused.status, paused.template],
            ["paused", "{title}\n{link}"]
          );

          const refused = yield* viewer.feeds
            .create({ params, payload: { url: blog } })
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "Forbidden");

          yield* editor.feeds.delete({
            params: { ...params, feedId: added.feed.id },
          });

          const gone = yield* viewer.feeds
            .get({ params: { ...params, feedId: added.feed.id } })
            .pipe(Effect.flip);

          assert.strictEqual(gone._tag, "FeedNotFound");
        })
      ),
    timeout
  );

  it.effect(
    "preview what an address holds as the template writes it, keeping nothing",
    () =>
      onServer(
        Effect.gen(function* previews() {
          const { editor, params, viewer } = yield* studio;

          yield* serveItems(blog, [
            { link: "https://blog.example/3", n: 3, title: "Three" },
            { n: 2, title: "Two" },
            { n: 1, title: "One" },
            { n: 0, title: "Zero" },
          ]);

          const preview = yield* editor.feeds.preview({
            params,
            payload: { template: "New: {title}", url: blog },
          });

          assert.deepStrictEqual(
            preview.items.map(({ text }) => text),
            ["New: Three", "New: Two", "New: One"]
          );

          const page = yield* viewer.feeds.list({ params, query: {} });

          assert.lengthOf(page.items, 0);

          const refused = yield* editor.feeds
            .preview({ params, payload: { url: "https://10.0.0.1/feed" } })
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "FeedUnreadable");

          const template = yield* editor.feeds
            .preview({ params, payload: { template: "{nope}", url: blog } })
            .pipe(Effect.flip);

          assert.strictEqual(template._tag, "FeedTemplateInvalid");
        })
      ),
    timeout
  );

  it.effect(
    "put posts on a queue only for those who may schedule them",
    () =>
      onServer(
        Effect.gen(function* queueNeedsSchedule() {
          const { application, editor, params } = yield* studio;

          yield* serveItems(blog, []);

          const refused = yield* application.feeds
            .create({ params, payload: { mode: "queue", url: blog } })
            .pipe(Effect.flip);

          assert.strictEqual(refused._tag, "Forbidden");

          const drafts = yield* application.feeds.create({
            params,
            payload: { url: blog },
          });

          assert.strictEqual(drafts.feed.startedVia.via, "application");

          const toQueue = yield* application.feeds
            .update({
              params: { ...params, feedId: drafts.feed.id },
              payload: { mode: "queue" },
            })
            .pipe(Effect.flip);

          assert.strictEqual(toQueue._tag, "Forbidden");

          // No queue in the workspace yet.
          const noQueue = yield* editor.feeds
            .update({
              params: { ...params, feedId: drafts.feed.id },
              payload: { mode: "queue" },
            })
            .pipe(Effect.flip);

          assert.strictEqual(noQueue._tag, "QueueNotFound");
        })
      ),
    timeout
  );

  it.effect(
    "read at most thirty addresses members give a workspace an hour",
    () =>
      onServer(
        Effect.gen(function* readBudget() {
          const { editor, params } = yield* studio;

          yield* serveItems(blog, []);

          for (let read = 0; read < 30; read += 1) {
            yield* editor.feeds.preview({ params, payload: { url: blog } });
          }

          const limited = yield* editor.feeds
            .preview({ params, payload: { url: blog } })
            .pipe(Effect.flip);

          assert.strictEqual(limited._tag, "FeedReadsLimited");

          if (limited._tag === "FeedReadsLimited") {
            // 07:00 on the hour: the next read is free at 08:00.
            assert.strictEqual(limited.retryAfterSeconds, 3600);
          }
        })
      ),
    timeout
  );

  it.effect(
    "refuse a role that may not change feeds before looking the feed up",
    () =>
      onServer(
        Effect.gen(function* permissionFirst() {
          const { params, viewer } = yield* studio;

          const missing = {
            ...params,
            feedId: "0190f3a0-0000-7000-8000-00000000dead",
          };

          const changed = yield* viewer.feeds
            .update({ params: missing, payload: { status: "paused" } })
            .pipe(Effect.flip);

          const removed = yield* viewer.feeds
            .delete({ params: missing })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            [changed._tag, removed._tag],
            ["Forbidden", "Forbidden"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "say what is wrong with a long template or address, as the server judges it",
    () =>
      onServer(
        Effect.gen(function* longInputs() {
          const { editor, params } = yield* studio;

          yield* serveItems(blog, []);

          const template = yield* editor.feeds
            .create({
              params,
              payload: { template: "a".repeat(1001), url: blog },
            })
            .pipe(Effect.flip);

          const address = yield* editor.feeds
            .create({
              params,
              payload: { url: `https://blog.example/${"a".repeat(3000)}` },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            [template._tag, address._tag],
            ["FeedTemplateInvalid", "FeedAddressRefused"]
          );
        })
      ),
    timeout
  );
});
