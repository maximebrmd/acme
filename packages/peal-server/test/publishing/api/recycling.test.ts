import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Ref } from "effect";
import type { Scope } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { SqlClient } from "effect/sql";
import {
  Api,
  Forbidden,
  PostNotRecyclable,
  RecyclingEndsTooSoon,
  RecyclingRuleEnded,
  RecyclingRuleNotFound,
  RecyclingVariantsInvalid,
} from "peal-contract";
import type { Member } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { RecyclingHandlers } from "#publishing/api/recycling.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import type { PostsServerTest } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Recycling rules through the API: started from a post that is on its
// way, read with what comes next, changed, paused, resumed and stopped by
// those who may schedule, and the posts a rule made found by it.

const timeout = 60_000;

// A Monday morning, 09:00 in Paris.
const start = "2026-06-15T07:00:00Z";

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["posts", "recycling"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.merge(PostsHandlers, RecyclingHandlers).pipe(
          Layer.provideMerge(securityTest(member))
        ),
        HttpServer.layerServices
      )
    )
  );

// The workspaces the tests made, whose rules go when the test ends, so no
// run of another test makes their posts.
const tracked = Ref.makeUnsafe<readonly string[]>([]);

const forgetRules = Effect.gen(function* forgetRules() {
  const sql = yield* SqlClient.SqlClient;

  for (const workspaceId of yield* Ref.getAndSet(tracked, [])) {
    yield* sql`DELETE FROM publishing.recycling_rules WHERE workspace_id = ${workspaceId}`;
  }
}).pipe(Effect.orDie);

const onServer = <A, E>(
  test: Effect.Effect<A, E, Layer.Success<typeof PostsServerTest> | Scope.Scope>
) => onPostsServerAt(start, test.pipe(Effect.ensuring(forgetRules)));

const studio = Effect.gen(function* studio() {
  const workspaceId = yield* newId(WorkspaceIdSchema);

  yield* Ref.update(tracked, (ids) => [...ids, workspaceId]);
  const mastodon = yield* connect(workspaceId, "mastodon");

  const editor = yield* clientAs(
    memberOf(workspaceId, permissionsFor("editor"))
  );

  const viewer = yield* clientAs(
    memberOf(workspaceId, permissionsFor("viewer"))
  );

  const params = { workspaceId };

  const sent = (text: string) =>
    editor.posts.send({
      headers: {},
      params,
      payload: {
        channelIds: [mastodon],
        content: { media: [], overrides: [], text },
        when: {
          _tag: "at",
          at: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
          timeZone: "Europe/Paris",
        },
      },
      query: {},
    });

  return { editor, mastodon, params, sent, viewer, workspaceId };
});

describe("recycling rules", () => {
  it.effect(
    "start from a scheduled post and say what comes next, with each variant",
    () =>
      onServer(
        Effect.gen(function* starts() {
          const { editor, params, sent, viewer } = yield* studio;
          const source = yield* sent("Our opening hours, all summer.");

          const rule = yield* editor.recycling.create({
            params,
            payload: {
              count: 4,
              every: { count: 2, unit: "weeks" },
              postId: source.id,
              variants: [{ text: "Open all summer, as before." }],
            },
          });

          assert.deepStrictEqual(
            [rule.status, rule.made, rule.timeZone, rule.sourcePostId],
            ["active", 1, "Europe/Paris", source.id]
          );
          assert.deepStrictEqual(
            rule.coming.map(({ at, occurrence, variant }) => [
              DateTime.formatIso(at),
              occurrence,
              variant,
            ]),
            [
              ["2026-06-29T08:00:00.000Z", 2, 1],
              ["2026-07-13T08:00:00.000Z", 3, null],
              ["2026-07-27T08:00:00.000Z", 4, 1],
            ]
          );
          assert.deepStrictEqual(rule.startedVia, {
            id: null,
            name: null,
            via: "web",
          });

          const read = yield* viewer.recycling.get({
            params: { ...params, ruleId: rule.id },
          });

          const listed = yield* viewer.recycling.list({ params, query: {} });

          assert.strictEqual(read.id, rule.id);
          assert.deepStrictEqual(
            listed.items.map(({ id }) => id),
            [rule.id]
          );
          assert.isNull(listed.nextCursor);
        })
      ),
    timeout
  );

  it.effect(
    "refuse a draft, a second rule, a variant too long, an ending too soon, and those who may not schedule",
    () =>
      onServer(
        Effect.gen(function* refuses() {
          const { editor, mastodon, params, sent, viewer } = yield* studio;
          const source = yield* sent("A post to repeat.");
          const every = { count: 1, unit: "weeks" } as const;

          const draft = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [mastodon],
              content: { media: [], overrides: [], text: "A draft." },
            },
          });

          const fromDraft = yield* editor.recycling
            .create({ params, payload: { every, postId: draft.id } })
            .pipe(Effect.flip);

          const tooLong = yield* editor.recycling
            .create({
              params,
              payload: {
                every,
                postId: source.id,
                variants: [{ text: "x".repeat(600) }],
              },
            })
            .pipe(Effect.flip);

          const tooSoon = yield* editor.recycling
            .create({
              params,
              payload: { every, postId: source.id, until: "2026-06-16" },
            })
            .pipe(Effect.flip);

          const byViewer = yield* viewer.recycling
            .create({ params, payload: { every, postId: source.id } })
            .pipe(Effect.flip);

          yield* editor.recycling.create({
            params,
            payload: { every, postId: source.id },
          });

          const second = yield* editor.recycling
            .create({ params, payload: { every, postId: source.id } })
            .pipe(Effect.flip);

          assert.instanceOf(fromDraft, PostNotRecyclable);
          assert.instanceOf(tooLong, RecyclingVariantsInvalid);
          assert.instanceOf(tooSoon, RecyclingEndsTooSoon);
          assert.instanceOf(byViewer, Forbidden);
          assert.deepStrictEqual(
            second instanceof PostNotRecyclable ? second.reason : second,
            "repeating"
          );
        })
      ),
    timeout
  );

  it.effect(
    "pause, resume and stop, then change no more",
    () =>
      onServer(
        Effect.gen(function* lifecycle() {
          const { editor, params, sent, viewer } = yield* studio;
          const source = yield* sent("A post to pause.");

          const rule = yield* editor.recycling.create({
            params,
            payload: { every: { count: 1, unit: "days" }, postId: source.id },
          });

          const path = { params: { ...params, ruleId: rule.id } };

          const paused = yield* editor.recycling.update({
            ...path,
            payload: { paused: true, variants: [{ text: "Another way" }] },
          });

          const resumed = yield* editor.recycling.resume({
            ...path,
            payload: {},
          });

          const byViewer = yield* viewer.recycling
            .delete(path)
            .pipe(Effect.flip);

          yield* editor.recycling.delete(path);

          const stopped = yield* editor.recycling.get(path);

          const changed = yield* editor.recycling
            .update({ ...path, payload: { count: 5 } })
            .pipe(Effect.flip);

          const missing = yield* editor.recycling
            .get({
              params: {
                ...params,
                ruleId: "00000000-0000-7000-8000-000000000000",
              },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            [paused.status, paused.variants.length, resumed.status],
            ["paused", 1, "active"]
          );
          assert.instanceOf(byViewer, Forbidden);
          assert.deepStrictEqual(
            [stopped.status, stopped.endedReason, stopped.nextDueAt],
            ["ended", "stopped", null]
          );
          assert.instanceOf(changed, RecyclingRuleEnded);
          assert.instanceOf(missing, RecyclingRuleNotFound);
        })
      ),
    timeout
  );

  it.effect(
    "list the posts a rule made, and none for another",
    () =>
      onServer(
        Effect.gen(function* searches() {
          const { editor, params, sent } = yield* studio;
          const source = yield* sent("A post to find.");

          const rule = yield* editor.recycling.create({
            params,
            payload: { every: { count: 1, unit: "weeks" }, postId: source.id },
          });

          const page = yield* editor.posts.search({
            params,
            query: { recyclingId: rule.id },
          });

          const other = yield* editor.posts.search({
            params,
            query: { recyclingId: "not-a-rule" },
          });

          // The source is no occurrence: a rule's posts are those it made.
          assert.deepStrictEqual(
            [page.items.length, other.items.length],
            [0, 0]
          );
          assert.deepStrictEqual(
            [source.recyclingId, source.occurrence],
            [null, null]
          );
        })
      ),
    timeout
  );
});
