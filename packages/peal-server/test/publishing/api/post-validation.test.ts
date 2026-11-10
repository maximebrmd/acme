import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, Forbidden } from "peal-contract";
import type { Member, PostContent } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// POST …/posts/validate: what sending a post would come to, with nothing
// made.

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

describe("the validate endpoint", () => {
  it.effect(
    "answers 200 with what would refuse the post, and makes nothing",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* validates() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const params = { workspaceId };

          const viewer = yield* clientAs(
            memberOf(workspaceId, permissionsFor("viewer"))
          );

          const fine = yield* viewer.posts.validate({
            params,
            payload: {
              channelIds: [mastodon],
              content: text("A synthetic post #one"),
              when: { _tag: "now" },
            },
          });

          assert.deepStrictEqual(fine, {
            awaitsApproval: false,
            channels: [
              {
                channelId: mastodon,
                hashtags: { count: 1, maximum: null },
                links: { count: 0, maximum: null },
                media: { count: 0, maximum: 4 },
                mentions: { count: 0, maximum: null },
                platform: "mastodon",
                text: "A synthetic post #one",
                textCounts: [{ length: 21, maximum: 500, unit: "codePoints" }],
                violations: [],
              },
            ],
            duplicates: [],
            planLimit: null,
            schedule: "ok",
            unknownChannels: [],
            unknownMedia: [],
            valid: true,
            violations: [],
          });

          // Everything wrong at once: ids that are no ids, a zone that is
          // no zone, a time gone by, a text too long.
          const wrong = yield* viewer.posts.validate({
            params,
            payload: {
              channelIds: [mastodon, "not-a-channel"],
              content: {
                media: [{ altText: "", mediaId: "not-a-media" }],
                overrides: [{ channelId: "not-a-channel", text: "Words" }],
                text: "a".repeat(501),
              },
              when: {
                _tag: "at",
                at: utc("2026-06-14T07:00:00Z"),
                timeZone: "Mars/Olympus",
              },
            },
          });

          assert.isFalse(wrong.valid);
          assert.strictEqual(wrong.schedule, "invalidTimeZone");
          assert.deepStrictEqual(wrong.unknownChannels, ["not-a-channel"]);
          assert.deepStrictEqual(wrong.unknownMedia, ["not-a-media"]);
          assert.deepStrictEqual(wrong.channels[0]?.violations, [
            {
              _tag: "textTooLong",
              channelId: mastodon,
              length: 501,
              maximum: 500,
              platform: "mastodon",
              unit: "codePoints",
            },
          ]);

          const late = yield* viewer.posts.validate({
            params,
            payload: {
              channelIds: [mastodon],
              content: text("A synthetic post"),
              when: {
                _tag: "at",
                at: utc("2026-06-14T07:00:00Z"),
                timeZone: "Europe/Paris",
              },
            },
          });

          assert.isFalse(late.valid);
          assert.strictEqual(late.schedule, "inPast");

          // A draft: no time, so none is checked.
          const draft = yield* viewer.posts.validate({
            params,
            payload: { channelIds: [mastodon], content: text("A draft") },
          });

          assert.isTrue(draft.valid);
          assert.isNull(draft.schedule);

          // Nothing was made by any of it.
          const drafts = yield* viewer.posts.drafts({ params, query: {} });

          assert.deepStrictEqual(drafts.items, []);

          const nobody = yield* clientAs(memberOf(workspaceId, []));

          const denied = yield* nobody.posts
            .validate({
              params,
              payload: { channelIds: [mastodon], content: text("Words") },
            })
            .pipe(Effect.flip);

          assert.instanceOf(denied, Forbidden);
        })
      ),
    timeout
  );
});
