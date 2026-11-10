import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  Forbidden,
  maxTagsPerWorkspace,
  PostNotFound,
  TagNameTaken,
  TagNotFound,
  TooManyTags,
  UnknownTags,
} from "peal-contract";
import type { Member, PostContent } from "peal-contract";

import { PostsHandlers } from "#publishing/api/posts.ts";
import { TagsHandlers } from "#publishing/api/tags.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// …/tags and PUT …/posts/:postId/tags: a workspace's tags, and its posts'.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, ["posts", "tags"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.merge(PostsHandlers, TagsHandlers).pipe(
          Layer.provideMerge(securityTest(member))
        ),
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

const studio = Effect.gen(function* studio() {
  const workspaceId = yield* freshWorkspace;
  const mastodon = yield* connect(workspaceId, "mastodon");

  const editor = yield* clientAs(
    memberOf(workspaceId, permissionsFor("editor"))
  );

  const viewer = yield* clientAs(
    memberOf(workspaceId, permissionsFor("viewer"))
  );

  return { editor, mastodon, params: { workspaceId }, viewer, workspaceId };
});

describe("the tags endpoints", () => {
  it.effect(
    "keep a workspace's tags, oldest first, for every member to read",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* lists() {
          const { editor, params, viewer } = yield* studio;

          const launch = yield* editor.tags.create({
            params,
            payload: { colour: "blue", name: "Launch" },
          });

          const hiring = yield* editor.tags.create({
            params,
            payload: { colour: "green", name: "Hiring" },
          });

          const listed = yield* viewer.tags.list({ params });

          assert.deepStrictEqual(
            listed.map(({ colour, id, name }) => ({ colour, id, name })),
            [
              { colour: "blue", id: launch.id, name: "Launch" },
              { colour: "green", id: hiring.id, name: "Hiring" },
            ]
          );
        })
      ),
    timeout
  );

  it.effect(
    "refuse a name the workspace has already, whatever its case",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusesTwice() {
          const { editor, params } = yield* studio;

          const launch = yield* editor.tags.create({
            params,
            payload: { colour: "blue", name: "Launch" },
          });

          const again = yield* editor.tags
            .create({ params, payload: { colour: "red", name: "LAUNCH" } })
            .pipe(Effect.flip);

          assert.instanceOf(again, TagNameTaken);

          const hiring = yield* editor.tags.create({
            params,
            payload: { colour: "green", name: "Hiring" },
          });

          const renamed = yield* editor.tags
            .update({
              params: { ...params, tagId: hiring.id },
              payload: { colour: "green", name: "launch" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(renamed, TagNameTaken);

          // Its own name, in another case and colour, is no other tag's.
          const recased = yield* editor.tags.update({
            params: { ...params, tagId: launch.id },
            payload: { colour: "pink", name: "LAUNCH" },
          });

          assert.strictEqual(recased.name, "LAUNCH");
          assert.strictEqual(recased.colour, "pink");
          assert.strictEqual(recased.id, launch.id);
        })
      ),
    timeout
  );

  it.effect(
    "are for members who may edit posts, in their own workspace",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusesViewers() {
          const { editor, params, viewer } = yield* studio;
          const other = yield* studio;

          const tag = yield* editor.tags.create({
            params,
            payload: { colour: "blue", name: "Launch" },
          });

          const made = yield* viewer.tags
            .create({ params, payload: { colour: "red", name: "Mine" } })
            .pipe(Effect.flip);

          assert.instanceOf(made, Forbidden);

          const dropped = yield* viewer.tags
            .delete({ params: { ...params, tagId: tag.id } })
            .pipe(Effect.flip);

          assert.instanceOf(dropped, Forbidden);

          // Another workspace's tag is no tag here.
          const elsewhere = yield* other.editor.tags
            .update({
              params: { ...other.params, tagId: tag.id },
              payload: { colour: "red", name: "Theirs" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(elsewhere, TagNotFound);

          const malformed = yield* editor.tags
            .delete({ params: { ...params, tagId: "not-an-id" } })
            .pipe(Effect.flip);

          assert.instanceOf(malformed, TagNotFound);
        })
      ),
    timeout
  );

  it.effect(
    "keep a hundred tags at most",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* fills() {
          const { editor, params } = yield* studio;

          yield* Effect.forEach(
            Array.from({ length: maxTagsPerWorkspace }, (_, at) => at),
            (at) =>
              editor.tags.create({
                params,
                payload: { colour: "gray", name: `Tag ${String(at)}` },
              }),
            { discard: true }
          );

          const over = yield* editor.tags
            .create({ params, payload: { colour: "gray", name: "One more" } })
            .pipe(Effect.flip);

          assert.instanceOf(over, TooManyTags);
          assert.strictEqual(over.allowed, maxTagsPerWorkspace);
        })
      ),
    timeout
  );
});

describe("a post's tags", () => {
  it.effect(
    "come with a draft, a post sent in one call, and change on their own",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* tags() {
          const { editor, mastodon, params } = yield* studio;

          const launch = yield* editor.tags.create({
            params,
            payload: { colour: "blue", name: "Launch" },
          });

          const hiring = yield* editor.tags.create({
            params,
            payload: { colour: "green", name: "Hiring" },
          });

          const draft = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [mastodon],
              content: text("A draft"),
              tagIds: [launch.id],
            },
          });

          assert.deepStrictEqual(draft.tagIds, [launch.id]);

          // An update that says nothing of tags keeps them.
          const edited = yield* editor.posts.update({
            params: { ...params, postId: draft.id },
            payload: { channelIds: [mastodon], content: text("Edited") },
          });

          assert.deepStrictEqual(edited.tagIds, [launch.id]);

          const retagged = yield* editor.posts.update({
            params: { ...params, postId: draft.id },
            payload: {
              channelIds: [mastodon],
              content: text("Edited"),
              tagIds: [hiring.id, launch.id],
            },
          });

          assert.deepStrictEqual(retagged.tagIds, [hiring.id, launch.id]);

          const sent = yield* editor.posts.send({
            headers: {},
            params,
            payload: {
              channelIds: [mastodon],
              content: text("Sent"),
              tagIds: [hiring.id],
              when: {
                _tag: "at",
                at: utc("2026-06-16T08:00:00Z"),
                timeZone: "Europe/Paris",
              },
            },
            query: {},
          });

          assert.deepStrictEqual(sent.tagIds, [hiring.id]);

          // A scheduled post is tagged as it stands: nothing else changes.
          const filed = yield* editor.posts.tag({
            params: { ...params, postId: sent.id },
            payload: { tagIds: [launch.id] },
          });

          assert.deepStrictEqual(filed.tagIds, [launch.id]);
          assert.strictEqual(filed.status, "scheduled");
          assert.deepStrictEqual(filed.schedule, sent.schedule);

          const read = yield* editor.posts.get({
            params: { ...params, postId: sent.id },
          });

          assert.deepStrictEqual(read.tagIds, [launch.id]);

          yield* editor.posts.cancel({
            params: { ...params, postId: sent.id },
          });
        })
      ),
    timeout
  );

  it.effect(
    "are the workspace's own, or the post is not saved",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* refusesUnknown() {
          const { editor, mastodon, params, viewer } = yield* studio;
          const other = yield* studio;

          const theirs = yield* other.editor.tags.create({
            params: other.params,
            payload: { colour: "blue", name: "Theirs" },
          });

          const created = yield* editor.posts
            .create({
              params,
              payload: {
                channelIds: [mastodon],
                content: text("A draft"),
                tagIds: [theirs.id],
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(created, UnknownTags);
          assert.deepStrictEqual(created.tagIds, [theirs.id]);

          const drafts = yield* editor.posts.drafts({ params, query: {} });

          assert.deepStrictEqual(drafts.items, []);

          const draft = yield* editor.posts.create({
            params,
            payload: { channelIds: [], content: text("A draft") },
          });

          const filed = yield* editor.posts
            .tag({
              params: { ...params, postId: draft.id },
              payload: { tagIds: ["not-an-id"] },
            })
            .pipe(Effect.flip);

          assert.instanceOf(filed, UnknownTags);

          const byViewer = yield* viewer.posts
            .tag({
              params: { ...params, postId: draft.id },
              payload: { tagIds: [] },
            })
            .pipe(Effect.flip);

          assert.instanceOf(byViewer, Forbidden);

          const elsewhere = yield* other.editor.posts
            .tag({
              params: { ...other.params, postId: draft.id },
              payload: { tagIds: [theirs.id] },
            })
            .pipe(Effect.flip);

          assert.instanceOf(elsewhere, PostNotFound);
        })
      ),
    timeout
  );

  it.effect(
    "leave a post when their tag is deleted, and the post stays",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* deletes() {
          const { editor, params } = yield* studio;

          const launch = yield* editor.tags.create({
            params,
            payload: { colour: "blue", name: "Launch" },
          });

          const hiring = yield* editor.tags.create({
            params,
            payload: { colour: "green", name: "Hiring" },
          });

          const draft = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [],
              content: text("A draft"),
              tagIds: [launch.id, hiring.id],
            },
          });

          yield* editor.tags.delete({
            params: { ...params, tagId: launch.id },
          });

          const read = yield* editor.posts.get({
            params: { ...params, postId: draft.id },
          });

          assert.deepStrictEqual(read.tagIds, [hiring.id]);

          const left = yield* editor.tags.list({ params });

          assert.deepStrictEqual(
            left.map(({ id }) => id),
            [hiring.id]
          );
        })
      ),
    timeout
  );

  it.effect(
    "find the posts filed under one",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* searches() {
          const { editor, params } = yield* studio;

          const launch = yield* editor.tags.create({
            params,
            payload: { colour: "blue", name: "Launch" },
          });

          const hiring = yield* editor.tags.create({
            params,
            payload: { colour: "green", name: "Hiring" },
          });

          const draft = (body: string, tagIds: readonly string[]) =>
            editor.posts.create({
              params,
              payload: { channelIds: [], content: text(body), tagIds },
            });

          const one = yield* draft("One", [launch.id]);
          const two = yield* draft("Two", [launch.id, hiring.id]);

          yield* draft("Three", []);

          const launched = yield* editor.posts.search({
            params,
            query: { tagId: launch.id },
          });

          assert.deepStrictEqual(
            launched.items.map(({ id }) => id),
            [two.id, one.id]
          );

          const hired = yield* editor.posts.search({
            params,
            query: { status: "draft", tagId: hiring.id },
          });

          assert.deepStrictEqual(
            hired.items.map(({ id }) => id),
            [two.id]
          );

          // An id that names no tag is on no post.
          const none = yield* editor.posts.search({
            params,
            query: { tagId: "not-an-id" },
          });

          assert.deepStrictEqual(none.items, []);
        })
      ),
    timeout
  );
});
