import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, PostContentInvalid } from "peal-contract";
import type { PostContent } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
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

const asking: PostContent = {
  media: [],
  overrides: [],
  poll: { choices: ["Tea", "Coffee"], durationMinutes: 1440 },
  text: "Which one?",
};

const freshWorkspace = newId(WorkspaceIdSchema);

describe("the posts endpoints, for a post asking a poll", () => {
  it.effect(
    "keep a draft's poll, and answer none for a post without",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keepsPoll() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const client = yield* clientIn(workspaceId);

          const created = yield* client.posts.create({
            params: { workspaceId },
            payload: { channelIds: [mastodon], content: asking },
          });

          assert.deepStrictEqual(created.content.poll, {
            choices: ["Tea", "Coffee"],
            durationMinutes: 1440,
            multipleChoice: false,
          });

          // An update that sends no poll takes it off, as it replaces the
          // content whole.
          const without = yield* client.posts.update({
            params: { postId: created.id, workspaceId },
            payload: {
              channelIds: [mastodon],
              content: { media: [], overrides: [], text: "No question" },
            },
          });

          assert.notProperty(without.content, "poll");
        })
      ),
    timeout
  );

  it.effect(
    "refuse to send a poll where the platform takes none, naming it",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusesPoll() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connect(workspaceId, "bluesky");
          const client = yield* clientIn(workspaceId);

          const refused = yield* client.posts
            .send({
              headers: {},
              params: { workspaceId },
              payload: {
                channelIds: [bluesky],
                content: asking,
                when: { _tag: "now" },
              },
              query: {},
            })
            .pipe(Effect.flip);

          assert.deepStrictEqual(
            refused,
            new PostContentInvalid({
              violations: [
                {
                  _tag: "pollNotSupported",
                  channelId: bluesky,
                  platform: "bluesky",
                },
              ],
            })
          );
        })
      ),
    timeout
  );
});
