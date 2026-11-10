import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, PostContentInvalid, UnknownMedia } from "peal-contract";
import type { PostContent } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import {
  eventually,
  setTime,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  connect,
  onPostsServerAt,
} from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const clientIn = (workspaceId: WorkspaceId) =>
  HttpApiTest.groups(Api, ["posts"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        PostsHandlers.pipe(
          Layer.provideMerge(
            securityTest(memberOf(workspaceId, permissionsFor("editor")))
          )
        ),
        HttpServer.layerServices
      )
    )
  );

const thread: PostContent = {
  followUps: [
    {
      delaySeconds: 0,
      media: [{ altText: "A synthetic chart", mediaId: attachableImage }],
      overrides: [],
      text: "A second part",
    },
    { delaySeconds: 0, media: [], overrides: [], text: "A third part" },
  ],
  media: [],
  overrides: [],
  text: "A first part",
};

const freshWorkspace = newId(WorkspaceIdSchema);

describe("the posts endpoints, for a post of several parts", () => {
  it.effect(
    "keep a draft's parts in order, and answer none for a post alone",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keepsParts() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* clientIn(workspaceId);

          const created = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [mastodon], content: thread },
          });

          assert.deepStrictEqual(created.content, thread);
          assert.deepStrictEqual(
            created.targets.map(({ parts }) => parts),
            [{ count: 3, live: [] }]
          );

          // A client from before parts sends none, and replaces them all.
          const alone = yield* client.posts.update({
            params: { postId: created.id, workspaceId },
            payload: {
              channelIds: [mastodon],
              content: { media: [], overrides: [], text: "Alone" },
            },
          });

          assert.deepStrictEqual(alone.content.followUps, []);
          assert.deepStrictEqual(alone.targets[0]?.parts, {
            count: 1,
            live: [],
          });
        })
      ),
    timeout
  );

  it.effect(
    "refuse a part's media that is not the workspace's",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* unknownMedia() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* clientIn(workspaceId);
          const stray = "00000000-0000-7000-8000-00000000dead";

          const refused = yield* client.posts
            .create({
              params: { workspaceId },
              payload: {
                channelIds: [mastodon],
                content: {
                  followUps: [
                    {
                      delaySeconds: 0,
                      media: [{ altText: "", mediaId: stray }],
                      overrides: [],
                      text: "A second part",
                    },
                  ],
                  media: [],
                  overrides: [],
                  text: "A first part",
                },
              },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            refused,
            new UnknownMedia({ mediaIds: [stray] })
          );
        })
      ),
    timeout
  );

  it.effect(
    "refuse to send parts where the platform takes a post alone, naming it",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusesParts() {
          const workspaceId = yield* freshWorkspace;
          const linkedin = yield* connect(workspaceId, "linkedin");
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* clientIn(workspaceId);

          const refused = yield* client.posts
            .send({
              headers: {},
              params: { workspaceId },
              payload: {
                channelIds: [linkedin, mastodon],
                content: {
                  followUps: [
                    {
                      delaySeconds: 0,
                      media: [],
                      overrides: [],
                      text: "a".repeat(501),
                    },
                  ],
                  media: [],
                  overrides: [],
                  text: "A first part",
                },
                when: { _tag: "now" },
              },
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            refused,
            new PostContentInvalid({
              violations: [
                {
                  _tag: "tooManyParts",
                  channelId: linkedin,
                  count: 2,
                  maximum: 1,
                  platform: "linkedin",
                },
                {
                  _tag: "textTooLong",
                  channelId: mastodon,
                  length: 501,
                  maximum: 500,
                  part: 1,
                  platform: "mastodon",
                  unit: "codePoints",
                },
              ],
            })
          );
        })
      ),
    timeout
  );

  it.effect(
    "say which parts are live, and which part each attempt sent",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* showsLiveParts() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* clientIn(workspaceId);

          const sent = yield* client.posts.send({
            headers: {},
            params: { workspaceId },
            payload: {
              channelIds: [mastodon],
              content: thread,
              when: {
                _tag: "at",
                at: utc("2026-06-15T08:00:00Z"),
                timeZone: "Europe/Paris",
              },
            },
          });

          const params = { postId: sent.id, workspaceId };

          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually(
            "the post finishes",
            client.posts
              .get({ params })
              .pipe(Effect.map(({ status }) => status === "finished"))
          );

          const post = yield* client.posts.get({ params });
          const [target] = post.targets;

          assert(target !== undefined);
          assert.strictEqual(post.outcome, "published");
          assert.strictEqual(target.parts.count, 3);
          assert.deepStrictEqual(
            target.parts.live.map(({ index }) => index),
            [0, 1, 2]
          );
          // The target's address is its first part's.
          assert.strictEqual(target.permalink, target.parts.live[0]?.permalink);

          const attempts = yield* client.posts.attempts({ params });

          assert.deepStrictEqual(
            attempts.map(({ attempt, part, result }) => [
              part,
              attempt,
              result,
            ]),
            [
              [0, 1, "published"],
              [1, 1, "published"],
              [2, 1, "published"],
            ]
          );
        })
      ),
    timeout
  );
});
