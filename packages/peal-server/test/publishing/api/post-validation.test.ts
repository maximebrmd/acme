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
    "checks every part of a thread, and shows each as its channel would receive it",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* validatesParts() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const linkedin = yield* connect(workspaceId, "linkedin");
          const params = { workspaceId };

          const viewer = yield* clientAs(
            memberOf(workspaceId, permissionsFor("viewer"))
          );

          const thread = (second: string): PostContent => ({
            followUps: [
              {
                delaySeconds: 60,
                media: [],
                overrides: [{ channelId: mastodon, text: second }],
                text: "A second part, for the others.",
              },
              {
                delaySeconds: 0,
                media: [{ altText: "", mediaId: "not-a-media" }],
                overrides: [],
                text: "A third part #three",
              },
            ],
            media: [],
            overrides: [],
            text: "A synthetic first part",
          });

          const checked = yield* viewer.posts.validate({
            params,
            payload: {
              channelIds: [mastodon, linkedin],
              content: thread("b".repeat(501)),
              when: { _tag: "now" },
            },
          });

          assert.isFalse(checked.valid);
          // A file a later part shows is looked for like the first's.
          assert.deepStrictEqual(checked.unknownMedia, ["not-a-media"]);

          const [onMastodon, onLinkedin] = checked.channels;

          // The first part where it always was, the parts after it beside
          // it, each with the text the channel has and its own counts.
          assert.isDefined(onMastodon);
          assert.strictEqual(onMastodon.text, "A synthetic first part");
          assert.deepStrictEqual(onMastodon.parts, [
            {
              hashtags: { count: 0, maximum: null },
              links: { count: 0, maximum: null },
              media: { count: 0, maximum: 4 },
              mentions: { count: 0, maximum: null },
              part: 1,
              text: "b".repeat(501),
              textCounts: [{ length: 501, maximum: 500, unit: "codePoints" }],
            },
            {
              hashtags: { count: 1, maximum: null },
              links: { count: 0, maximum: null },
              media: { count: 0, maximum: 4 },
              mentions: { count: 0, maximum: null },
              part: 2,
              text: "A third part #three",
              textCounts: [{ length: 19, maximum: 500, unit: "codePoints" }],
            },
          ]);
          // What refuses a part names it, as scheduling does.
          assert.deepStrictEqual(onMastodon.violations, [
            {
              _tag: "textTooLong",
              channelId: mastodon,
              length: 501,
              maximum: 500,
              part: 1,
              platform: "mastodon",
              unit: "codePoints",
            },
          ]);

          // A platform that takes a post alone refuses the parts.
          assert.deepStrictEqual(
            onLinkedin?.violations.map(({ _tag }) => _tag),
            ["tooManyParts"]
          );
          assert.lengthOf(onLinkedin?.parts ?? [], 2);
          assert.strictEqual(
            onLinkedin?.parts[0]?.text,
            "A second part, for the others."
          );

          // A thread that fits is valid, and a post alone has no parts.
          const fine = yield* viewer.posts.validate({
            params,
            payload: {
              channelIds: [mastodon],
              content: {
                followUps: [
                  { delaySeconds: 0, media: [], overrides: [], text: "Two" },
                ],
                media: [],
                overrides: [],
                text: "One",
              },
              when: { _tag: "now" },
            },
          });

          assert.isTrue(fine.valid);
          assert.lengthOf(fine.channels[0]?.parts ?? [], 1);

          const alone = yield* viewer.posts.validate({
            params,
            payload: { channelIds: [mastodon], content: text("Alone") },
          });

          assert.deepStrictEqual(alone.channels[0]?.parts, []);
        })
      ),
    timeout
  );

  it.effect(
    "says a story's text is not sent, and shows it with none",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* validatesStory() {
          const workspaceId = yield* freshWorkspace;
          const instagram = yield* connect(workspaceId, "instagram");
          const params = { workspaceId };

          const viewer = yield* clientAs(
            memberOf(workspaceId, permissionsFor("viewer"))
          );

          const checkedWith = (options: object) =>
            viewer.posts.validate({
              params,
              payload: {
                channelIds: [instagram],
                content: text("A synthetic story #one"),
                options: [
                  {
                    channelId: instagram,
                    options: { platform: "instagram", ...options },
                  },
                ],
              },
            });

          const [story] = (yield* checkedWith({ format: "story" })).channels;

          assert.isTrue(story?.textNotSent);
          assert.strictEqual(story?.text, "");
          assert.deepStrictEqual(story?.textCounts, []);
          assert.deepStrictEqual(story?.media, { count: 0, maximum: 1 });

          const [feed] = (yield* checkedWith({ format: "feed" })).channels;

          assert.isUndefined(feed?.textNotSent);
          assert.strictEqual(feed?.text, "A synthetic story #one");
        })
      ),
    timeout
  );

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
                parts: [],
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

          // A channel that is none is said once, as unknown: not again
          // as a post for no channel, when it was the only one named.
          const none = yield* viewer.posts.validate({
            params,
            payload: {
              channelIds: ["not-a-channel"],
              content: { media: [], overrides: [], text: "Hello" },
            },
          });

          assert.isFalse(none.valid);
          assert.deepStrictEqual(none.unknownChannels, ["not-a-channel"]);
          assert.deepStrictEqual(none.violations, []);

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
