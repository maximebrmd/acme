import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, Forbidden, InvalidTimeRange } from "peal-contract";
import type { Member, PostContent, PostPage } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// GET …/posts/search: the workspace's posts, filtered, ordered and paged.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["posts"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        PostsHandlers.pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const text = (body: string): PostContent => ({
  media: [],
  overrides: [],
  text: body,
});

const freshWorkspace = newId(WorkspaceIdSchema);

const keyOf = (workspaceId: WorkspaceId): Member => ({
  permissions: permissionsFor("editor"),
  principal: {
    _tag: "apiKey",
    apiKeyId: "synthetic-key",
    permissions: permissionsFor("editor"),
    workspaceId,
  },
  workspaceId,
});

// A workspace with five posts: three scheduled a day apart, the last by
// an API key and on two channels, one of them cancelled; and two drafts.
const studio = Effect.gen(function* studio() {
  const workspaceId = yield* freshWorkspace;
  const mastodon = yield* connect(workspaceId, "mastodon");
  const bluesky = yield* connect(workspaceId, "bluesky");

  const editor = yield* clientAs(
    memberOf(workspaceId, permissionsFor("editor"))
  );

  const key = yield* clientAs(keyOf(workspaceId));
  const params = { workspaceId };

  const send = (
    client: typeof editor,
    body: string,
    at: string,
    channelIds: readonly [ChannelId, ...ChannelId[]]
  ) =>
    client.posts.send({
      headers: {},
      params,
      payload: {
        channelIds,
        content: text(body),
        when: { _tag: "at", at: utc(at), timeZone: "Europe/Paris" },
      },
      query: {},
    });

  const first = yield* send(editor, "One", "2026-06-16T08:00:00Z", [mastodon]);
  const second = yield* send(editor, "Two", "2026-06-17T08:00:00Z", [bluesky]);

  const draft = yield* editor.posts.create({
    params,
    payload: { channelIds: [mastodon], content: text("A draft") },
  });

  const third = yield* send(key, "Three", "2026-06-18T08:00:00Z", [
    mastodon,
    bluesky,
  ]);

  const other = yield* editor.posts.create({
    params,
    payload: { channelIds: [], content: text("Another draft") },
  });

  yield* editor.posts.cancel({ params: { ...params, postId: second.id } });

  return {
    bluesky,
    draft,
    editor,
    first,
    mastodon,
    other,
    params,
    second,
    third,
    workspaceId,
  };
});

describe("the search endpoint", () => {
  it.effect(
    "lists every post, newest first, with the platform of each channel",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* lists() {
          const made = yield* studio;
          const { editor, params } = made;

          const all = yield* editor.posts.search({ params, query: {} });

          assert.deepStrictEqual(
            all.items.map(({ id }) => id),
            [
              made.other.id,
              made.third.id,
              made.draft.id,
              made.second.id,
              made.first.id,
            ]
          );
          assert.isNull(all.nextCursor);
          assert.sameDeepMembers(
            [...all.channels],
            [
              { channelId: made.mastodon, platform: "mastodon" },
              { channelId: made.bluesky, platform: "bluesky" },
            ]
          );

          // A post comes whole: no second call to know how it stands.
          assert.deepStrictEqual(
            all.items[1],
            yield* editor.posts.get({
              params: { ...params, postId: made.third.id },
            })
          );

          const viewer = yield* clientAs(
            memberOf(made.workspaceId, permissionsFor("viewer"))
          );

          assert.lengthOf(
            (yield* viewer.posts.search({ params, query: {} })).items,
            5
          );

          const nobody = yield* clientAs(memberOf(made.workspaceId, []));

          assert.instanceOf(
            yield* nobody.posts.search({ params, query: {} }).pipe(Effect.flip),
            Forbidden
          );
        })
      ),
    timeout
  );

  it.effect(
    "filters by status, channel, platform, time and how a post was created",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* filters() {
          const made = yield* studio;
          const { editor, params } = made;

          const idsOf = (
            query: Parameters<typeof editor.posts.search>[0]["query"]
          ) =>
            editor.posts
              .search({ params, query })
              .pipe(Effect.map((page) => page.items.map(({ id }) => id)));

          assert.deepStrictEqual(yield* idsOf({ status: "draft" }), [
            made.other.id,
            made.draft.id,
          ]);
          assert.deepStrictEqual(yield* idsOf({ status: "cancelled" }), [
            made.second.id,
          ]);
          assert.deepStrictEqual(yield* idsOf({ outcome: "failed" }), []);
          assert.deepStrictEqual(yield* idsOf({ channelId: made.bluesky }), [
            made.third.id,
            made.second.id,
          ]);
          assert.deepStrictEqual(yield* idsOf({ platform: "mastodon" }), [
            made.third.id,
            made.draft.id,
            made.first.id,
          ]);
          assert.deepStrictEqual(yield* idsOf({ platform: "youtube" }), []);
          assert.deepStrictEqual(
            yield* idsOf({ channelId: made.bluesky, platform: "mastodon" }),
            []
          );
          assert.deepStrictEqual(yield* idsOf({ createdVia: "apiKey" }), [
            made.third.id,
          ]);
          assert.deepStrictEqual(
            yield* idsOf({ authorId: made.first.authorId ?? "" }),
            [made.other.id, made.draft.id, made.second.id, made.first.id]
          );
          // From is included, to is not; posts without a time are left out.
          assert.deepStrictEqual(
            yield* idsOf({
              from: utc("2026-06-17T08:00:00Z"),
              to: utc("2026-06-18T08:00:00Z"),
            }),
            [made.second.id]
          );
          assert.deepStrictEqual(
            yield* idsOf({
              channelId: made.mastodon,
              from: utc("2026-06-16T00:00:00Z"),
              status: "scheduled",
            }),
            [made.third.id, made.first.id]
          );
          // An id that is no id is on no post.
          assert.deepStrictEqual(yield* idsOf({ channelId: "not-an-id" }), []);

          const backwards = yield* editor.posts
            .search({
              params,
              query: {
                from: utc("2026-06-18T08:00:00Z"),
                to: utc("2026-06-17T08:00:00Z"),
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(backwards, InvalidTimeRange);
        })
      ),
    timeout
  );

  it.effect(
    "pages by cursor in every order, through posts made and moved meanwhile",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* pages() {
          const made = yield* studio;
          const { editor, params } = made;

          // By scheduled time: only the posts that have one.
          const soonest = yield* editor.posts.search({
            params,
            query: { limit: 2, sort: "scheduledAsc" },
          });

          assert.deepStrictEqual(
            soonest.items.map(({ id }) => id),
            [made.first.id, made.second.id]
          );
          assert.isNotNull(soonest.nextCursor);

          // Meanwhile a post is made before the page's end, and one after.
          const early = yield* editor.posts.send({
            headers: {},
            params,
            payload: {
              channelIds: [made.mastodon],
              content: text("Early"),
              when: {
                _tag: "at",
                at: utc("2026-06-15T09:00:00Z"),
                timeZone: "UTC",
              },
            },
            query: {},
          });

          const late = yield* editor.posts.send({
            headers: {},
            params,
            payload: {
              channelIds: [made.mastodon],
              content: text("Late"),
              when: {
                _tag: "at",
                at: utc("2026-06-18T08:00:00Z"),
                timeZone: "UTC",
              },
            },
            query: {},
          });

          const rest = yield* editor.posts.search({
            params,
            query: {
              cursor: soonest.nextCursor ?? "",
              limit: 2,
              sort: "scheduledAsc",
            },
          });

          // Nothing repeated, nothing skipped: the two at the same instant
          // come in the order they were made.
          assert.deepStrictEqual(
            rest.items.map(({ id }) => id),
            [made.third.id, late.id]
          );
          assert.isNull(rest.nextCursor);

          // By creation, oldest first, one at a time, to the end.
          const walk = (
            cursor?: string
          ): Effect.Effect<readonly string[], unknown> =>
            editor.posts
              .search({
                params,
                query:
                  cursor === undefined
                    ? { limit: 3, sort: "createdAsc" }
                    : { cursor, limit: 3, sort: "createdAsc" },
              })
              .pipe(
                Effect.flatMap((page: PostPage) =>
                  page.nextCursor === null
                    ? Effect.succeed(page.items.map(({ id }) => id))
                    : walk(page.nextCursor).pipe(
                        Effect.map((following) => [
                          ...page.items.map(({ id }) => id),
                          ...following,
                        ])
                      )
                )
              );

          const walked = yield* walk();

          assert.deepStrictEqual(walked, [
            made.first.id,
            made.second.id,
            made.draft.id,
            made.third.id,
            made.other.id,
            early.id,
            late.id,
          ]);

          const latest = yield* editor.posts.search({
            params,
            query: { limit: 1, sort: "scheduledDesc" },
          });

          // Same instant: the later id first.
          assert.deepStrictEqual(
            latest.items.map(({ id }) => id),
            [late.id]
          );

          // A cursor continues its own list only.
          const mixed = yield* editor.posts
            .search({
              params,
              query: { cursor: soonest.nextCursor ?? "", sort: "createdAsc" },
            })
            .pipe(Effect.flip);

          assert.strictEqual(mixed._tag, "BadRequest");

          const garbage = yield* editor.posts
            .search({ params, query: { cursor: "not a cursor" } })
            .pipe(Effect.flip);

          assert.strictEqual(garbage._tag, "BadRequest");

          // Nothing goes out from this test.
          for (const post of [made.first, made.third, early, late]) {
            yield* editor.posts.cancel({
              params: { ...params, postId: post.id },
            });
          }
        })
      ),
    timeout
  );
});
