import { assert, describe, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostNotFound } from "#publishing/application/post-not-found.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostTags } from "#publishing/application/post-tags.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { newId } from "#shared/application/ids.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  connect,
  onPostsServerAt,
} from "#test/publishing/posts-server.ts";
import { actorAs, actorIn, contentOf } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// A post copied into a new draft: what it says and where it goes, without
// its time.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

const colleague = UserIdSchema.make("7d9a1c0e-5b3f-4e2a-8c6d-1f0e9b8a7c6d");

describe("duplicating a post", () => {
  it.effect(
    "makes a draft with its text, media, channels, options and tags",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* copies() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const tags = yield* PostTags;
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const pinterest = yield* connect(workspaceId, "pinterest");
          const actor = actorIn(workspaceId);

          const tag = yield* tags.create(actor, {
            colour: "blue",
            name: "Launch",
          });

          const options = [
            new ChannelOptions({
              channelId: pinterest,
              options: new PinterestOptions({
                boardId: "1234",
                platform: "pinterest",
                title: "A synthetic pin",
              }),
            }),
          ];

          const sent = yield* scheduling.send(actor, {
            at: Option.some(utc("2026-06-16T08:00:00Z")),
            channelIds: [mastodon, pinterest],
            content: contentOf("Hello", {
              media: [attachableImage],
              overrides: [[mastodon, "Hello, fediverse"]],
            }),
            idempotency: Option.none(),
            options,
            tagIds: [tag.id],
            timeZone: TimeZoneIdSchema.make("Europe/Paris"),
          });

          // Someone else copies it: the copy is theirs, and a draft.
          const copier = actorAs(colleague, workspaceId);
          const copy = yield* drafts.duplicate(copier, sent.post.id);

          assert.notStrictEqual(copy.post.id, sent.post.id);
          assert.strictEqual(copy.post.status._tag, "draft");
          assert.deepStrictEqual(copy.post.authorId, Option.some(colleague));
          assert.deepStrictEqual(copy.post.content, sent.post.content);
          assert.deepStrictEqual(copy.post.tagIds, [tag.id]);
          assert.deepStrictEqual(
            copy.targets.map(({ channelId, options: chosen }) => [
              channelId,
              chosen,
            ]),
            sent.targets.map(({ channelId, options: chosen }) => [
              channelId,
              chosen,
            ])
          );

          // The original is as it was.
          assert.strictEqual(sent.post.status._tag, "scheduled");

          yield* scheduling.cancel(actor, sent.post.id);
        })
      ),
    timeout
  );

  it.effect(
    "leaves out what the workspace no longer has",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* dropsWhatIsGone() {
          const drafts = yield* PostDrafts;
          const tags = yield* PostTags;
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const bluesky = yield* connect(workspaceId, "bluesky");
          const actor = actorIn(workspaceId);

          const tag = yield* tags.create(actor, {
            colour: "blue",
            name: "Launch",
          });

          const draft = yield* drafts.create(actor, {
            channelIds: [mastodon, bluesky],
            content: contentOf("Hello", {
              overrides: [[mastodon, "Hello, fediverse"]],
            }),
            tagIds: [tag.id],
          });

          yield* ChannelRepository.use((channels) =>
            channels.remove(workspaceId, mastodon)
          );
          yield* tags.remove(actor, tag.id);

          const copy = yield* drafts.duplicate(actor, draft.post.id);

          assert.deepStrictEqual(
            copy.targets.map(({ channelId }) => channelId),
            [bluesky]
          );
          assert.deepStrictEqual(copy.post.content.overrides, []);
          assert.strictEqual(copy.post.content.text, "Hello");
          assert.deepStrictEqual(copy.post.tagIds, []);
        })
      ),
    timeout
  );

  it.effect(
    "copies the parts that follow the post, each with its own texts and media",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* copiesParts() {
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connect(workspaceId, "mastodon");
          const bluesky = yield* connect(workspaceId, "bluesky");
          const actor = actorIn(workspaceId);

          const second = contentOf("Second", {
            media: [attachableImage],
            overrides: [[mastodon, "Second, fediverse"]],
          });

          const draft = yield* drafts.create(actor, {
            channelIds: [mastodon, bluesky],
            content: new PostContent({
              followUps: [
                new PostPart({
                  delaySeconds: 90,
                  media: second.media,
                  overrides: second.overrides,
                  text: second.text,
                }),
              ],
              media: [],
              overrides: [],
              text: "First",
            }),
          });

          const copy = yield* drafts.duplicate(actor, draft.post.id);

          assert.deepStrictEqual(copy.post.content, draft.post.content);

          // A part's text on a channel the workspace no longer has goes.
          yield* ChannelRepository.use((channels) =>
            channels.remove(workspaceId, mastodon)
          );

          const later = yield* drafts.duplicate(actor, draft.post.id);
          const [part] = later.post.content.followUps;

          assert.strictEqual(part?.text, "Second");
          assert.strictEqual(part?.delaySeconds, 90);
          assert.deepStrictEqual(part?.media, second.media);
          assert.deepStrictEqual(part?.overrides, []);
        })
      ),
    timeout
  );

  it.effect(
    "is for members who may write drafts, of their workspace's posts",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refuses() {
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const elsewhere = yield* freshWorkspace;
          const actor = actorIn(workspaceId);

          const draft = yield* drafts.create(actor, {
            channelIds: [],
            content: contentOf("Hello"),
          });

          const byViewer = yield* drafts
            .duplicate(
              actorIn(workspaceId, permissionsFor("viewer")),
              draft.post.id
            )
            .pipe(Effect.flip);

          assert.instanceOf(byViewer, MissingPermission);

          const foreign = yield* drafts
            .duplicate(actorIn(elsewhere), draft.post.id)
            .pipe(Effect.flip);

          assert.instanceOf(foreign, PostNotFound);
        })
      ),
    timeout
  );
});
