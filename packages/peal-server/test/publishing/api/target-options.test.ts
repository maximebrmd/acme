import { assert, describe, it } from "@effect/vitest";
import { Api, PostContentInvalid, UnknownChannels } from "acme-contract";
import type { Member, PostContent } from "acme-contract";
import { Effect, Layer, Schema } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import {
  attachableVideo,
  connect,
  onPostsServerAt,
} from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

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

// YouTube takes videos only.
const content: PostContent = {
  media: [{ altText: "A synthetic video", mediaId: attachableVideo }],
  overrides: [],
  text: "A synthetic video",
};

const freshWorkspace = newId(WorkspaceIdSchema);

describe("a post's options through the API", () => {
  it.effect(
    "are created, read and replaced with the draft, and checked to schedule",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* throughTheApi() {
          const workspaceId = yield* freshWorkspace;
          const youtube = yield* connect(workspaceId, "youtube");
          const mastodon = yield* connect(workspaceId, "mastodon");

          const client = yield* clientAs(
            memberOf(workspaceId, permissionsFor("editor"))
          );

          const created = yield* client.posts.create({
            params: { workspaceId },
            payload: {
              channelIds: [youtube, mastodon],
              content,
              options: [
                {
                  channelId: youtube,
                  options: { platform: "youtube", title: "A working title" },
                },
              ],
            },
          });

          assert.deepStrictEqual(
            created.targets.map(({ channelId, options }) => [
              channelId,
              options,
            ]),
            [
              [youtube, { platform: "youtube", title: "A working title" }],
              [mastodon, null],
            ]
          );

          const params = { postId: created.id, workspaceId };

          assert.deepStrictEqual(yield* client.posts.get({ params }), created);

          const schedule = {
            at: utc("2026-06-16T07:30:00Z"),
            channelIds: [youtube, mastodon] as const,
            timeZone: "Europe/Paris",
          };

          const unfinished = yield* client.posts
            .schedule({ params, payload: schedule })
            .pipe(Effect.flip);

          assert(Schema.is(PostContentInvalid)(unfinished));
          assert.deepStrictEqual(unfinished.violations, [
            {
              _tag: "optionMissing",
              channelId: youtube,
              field: "madeForKids",
              platform: "youtube",
            },
          ]);

          const finished = {
            madeForKids: false,
            platform: "youtube" as const,
            tags: ["launch"],
            title: "A synthetic launch video",
          };

          const updated = yield* client.posts.update({
            params,
            payload: {
              channelIds: [youtube, mastodon],
              content,
              options: [{ channelId: youtube, options: finished }],
            },
          });

          assert.deepStrictEqual(updated.targets[0]?.options, finished);

          const scheduled = yield* client.posts.schedule({
            params,
            payload: schedule,
          });

          assert.deepStrictEqual(
            scheduled.targets.map(({ options }) => options),
            [finished, null]
          );

          yield* client.posts.cancel({ params });
        })
      ),
    timeout
  );

  it.effect(
    "name the workspace's channels, of their own platform",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refused() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");

          const client = yield* clientAs(
            memberOf(workspaceId, permissionsFor("editor"))
          );

          const malformed = yield* client.posts
            .create({
              params: { workspaceId },
              payload: {
                channelIds: [mastodon],
                content,
                options: [
                  {
                    channelId: "not-a-channel",
                    options: { platform: "tiktok" },
                  },
                ],
              },
            })
            .pipe(Effect.flip);

          assert(Schema.is(UnknownChannels)(malformed));

          const mismatched = yield* client.posts
            .create({
              params: { workspaceId },
              payload: {
                channelIds: [mastodon],
                content,
                options: [
                  {
                    channelId: mastodon,
                    options: {
                      platform: "tiktok",
                      privacyLevel: "SELF_ONLY",
                    },
                  },
                ],
              },
            })
            .pipe(Effect.flip);

          assert(Schema.is(PostContentInvalid)(mismatched));
          assert.deepStrictEqual(mismatched.violations, [
            {
              _tag: "optionsForOtherPlatform",
              channelId: mastodon,
              optionsPlatform: "tiktok",
              platform: "mastodon",
            },
          ]);
        })
      ),
    timeout
  );
});
