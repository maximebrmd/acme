import { assert, describe, it } from "@effect/vitest";
import { Effect, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  campaignTagId,
  draftId,
  evergreenTagId,
  finishedId,
  mastodonId,
  scheduledId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal tags, and the tags of posts, against the in-memory studio: what
// each command asks the server, what it prints, and how it explains a
// refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const tagsOf = (studio: Studio, postId: string) =>
  Ref.get(studio.state).pipe(
    Effect.map(
      ({ posts }) => posts.find(({ id }) => id === postId)?.tagIds ?? []
    )
  );

const inStudio = ["--workspace", "studio"];

const newTagId = "0190f3a0-0000-7000-8000-00000000a003";

const parsed = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));

const ErrorSchema = Schema.fromJsonString(
  Schema.Struct({ error: Schema.Record(Schema.String, Schema.Unknown) })
);

const errorOf = (text: string) =>
  Schema.decodeUnknownSync(ErrorSchema)(text).error;

describe("peal tags", () => {
  it.effect("lists the workspace's tags, in prose and as JSON", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();
      const listed = yield* session.printed(["tags", "list", ...inStudio]);

      assert.include(listed, "Tags of Studio:");
      assert.match(
        listed,
        new RegExp(`${campaignTagId}\\s+Spring campaign\\s+green`, "u")
      );
      assert.match(
        listed,
        new RegExp(`${evergreenTagId}\\s+Evergreen\\s+blue`, "u")
      );

      assert.deepStrictEqual(
        parsed(yield* session.printed(["tags", "list", "--json", ...inStudio])),
        [
          {
            colour: "green",
            createdAt: "2026-10-01T09:00:00.000Z",
            id: campaignTagId,
            name: "Spring campaign",
          },
          {
            colour: "blue",
            createdAt: "2026-10-02T09:00:00.000Z",
            id: evergreenTagId,
            name: "Evergreen",
          },
        ]
      );
      assert.strictEqual(
        yield* session.printed(["tags", "list", "--workspace", "shop"]),
        "Shop has no tags."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("creates a tag, gray unless told, its name trimmed", () =>
    Effect.gen(function* creates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed(["tags", "create", "  Launch ", ...inStudio]),
        `Created tag Launch (gray) in Studio: ${newTagId}.`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "tags",
            "create",
            "Partners",
            "--colour",
            "pink",
            "--json",
            ...inStudio,
          ])
        ),
        { colour: "pink", name: "Partners" }
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        "tag:create:Launch:gray",
        "tag:create:Partners:pink",
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses a name that does not fit, before asking", () =>
    Effect.gen(function* misfit() {
      const session = yield* signedIn();

      for (const name of ["   ", "x".repeat(41)]) {
        assert.include(
          yield* session.refused(["tags", "create", name, ...inStudio]),
          "A tag's name has 1 to 40 characters, on one line."
        );
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says a name is taken, whatever its case", () =>
    Effect.gen(function* taken() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused(["tags", "create", "evergreen", ...inStudio]),
        "The workspace already has a tag of that name, whatever its case: nothing was changed."
      );

      const failure = errorOf(
        yield* session.refused([
          "tags",
          "update",
          "Evergreen",
          "--name",
          "SPRING CAMPAIGN",
          "--json",
          ...inStudio,
        ])
      );

      assert.strictEqual(failure["_tag"], "TagNameTaken");
      assert.strictEqual(failure["code"], "tag_name_taken");
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("changes what is given of a tag, and keeps the rest", () =>
    Effect.gen(function* updates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "tags",
          "update",
          "spring campaign",
          "--colour",
          "amber",
          ...inStudio,
        ]),
        `Tag ${campaignTagId} of Studio is now Spring campaign (amber). Its posts keep it.`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "tags",
            "update",
            evergreenTagId,
            "--name",
            " Always ",
            "--json",
            ...inStudio,
          ])
        ),
        { colour: "blue", id: evergreenTagId, name: "Always" }
      );
      assert.include(
        yield* session.refused(["tags", "update", "Always", ...inStudio]),
        "Give --name, --colour or both"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `tag:update:${campaignTagId}:Spring campaign:amber`,
        `tag:update:${evergreenTagId}:Always:blue`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes a tag, which leaves its posts", () =>
    Effect.gen(function* deletes() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "tags",
          "delete",
          "Spring Campaign",
          ...inStudio,
        ]),
        "Deleted tag Spring campaign of Studio: it is off every post that had it, and the posts stay."
      );
      assert.deepStrictEqual(yield* tagsOf(session.studio, scheduledId), []);
      assert.strictEqual(
        yield* session.printed([
          "tags",
          "delete",
          evergreenTagId,
          "--json",
          ...inStudio,
        ]),
        "null"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `tag:delete:${campaignTagId}`,
        `tag:delete:${evergreenTagId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says a tag it was not given the id or the name of", () =>
    Effect.gen(function* unknown() {
      const session = yield* signedIn();

      for (const args of [
        ["tags", "delete", "Autumn"],
        ["tags", "update", "Autumn", "--colour", "red"],
        ["posts", "tag", draftId, "--tag", "Autumn"],
        ["posts", "list", "--tag", "Autumn"],
        ["drafts", "save", "--text", "A synthetic draft.", "--tag", "Autumn"],
      ]) {
        const refused = yield* session.refused([...args, ...inStudio]);

        assert.include(
          refused,
          "The workspace has no tag Autumn, by id or by name: peal tags list shows them."
        );
        assert.notInclude(refused, "Evergreen");
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("tells a member who may not change them", () =>
    Effect.gen(function* viewer() {
      const session = yield* signedIn();

      for (const args of [
        ["tags", "create", "Launch"],
        ["posts", "tag", draftId],
      ]) {
        assert.include(
          yield* session.refused([...args, "--workspace", "shop"]),
          "Peal refused: your role in this workspace does not allow it"
        );
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("the tags of posts", () => {
  it.effect("files a post under tags named by name or by id", () =>
    Effect.gen(function* tags() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "posts",
          "tag",
          finishedId,
          "--tag",
          "evergreen",
          "--tag",
          campaignTagId,
          "--tag",
          "Evergreen",
          ...inStudio,
        ]),
        `Post ${finishedId} is now filed under: Evergreen, Spring campaign.`
      );
      assert.deepStrictEqual(yield* tagsOf(session.studio, finishedId), [
        evergreenTagId,
        campaignTagId,
      ]);
      assert.include(
        yield* session.printed(["posts", "show", finishedId, ...inStudio]),
        "Tags: Evergreen, Spring campaign"
      );
      assert.notInclude(
        yield* session.printed(["posts", "show", draftId, ...inStudio]),
        "Tags:"
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("takes every tag off a post given none", () =>
    Effect.gen(function* clears() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed(["posts", "tag", scheduledId, ...inStudio]),
        `Took every tag off post ${scheduledId}.`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "posts",
            "tag",
            scheduledId,
            "--tag",
            "Evergreen",
            "--json",
            ...inStudio,
          ])
        ),
        { id: scheduledId, tagIds: [evergreenTagId] }
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `tag:${scheduledId}:`,
        `tag:${scheduledId}:${evergreenTagId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("lists the posts filed under a tag", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      const listed = yield* session.printed([
        "posts",
        "list",
        "--tag",
        "spring campaign",
        ...inStudio,
      ]);

      assert.include(listed, scheduledId);
      assert.notInclude(listed, draftId);
      assert.notInclude(listed, finishedId);
      assert.strictEqual(
        yield* session.printed([
          "posts",
          "list",
          "--tag",
          evergreenTagId,
          ...inStudio,
        ]),
        "No post of Studio matches."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("saves a draft with tags, and keeps them without --tag", () =>
    Effect.gen(function* drafts() {
      const session = yield* signedIn();

      const made = parsed(
        yield* session.printed([
          "drafts",
          "save",
          "--text",
          "A synthetic draft with a tag.",
          "--channel",
          mastodonId,
          "--tag",
          "Evergreen",
          "--json",
          ...inStudio,
        ])
      );

      assert.deepInclude(made, { tagIds: [evergreenTagId] });

      yield* session.printed([
        "posts",
        "tag",
        draftId,
        "--tag",
        "Evergreen",
        ...inStudio,
      ]);
      yield* session.printed([
        "drafts",
        "save",
        "--post",
        draftId,
        "--text",
        "A synthetic draft, rewritten.",
        ...inStudio,
      ]);

      assert.deepStrictEqual(yield* tagsOf(session.studio, draftId), [
        evergreenTagId,
      ]);

      yield* session.printed([
        "drafts",
        "save",
        "--post",
        draftId,
        "--tag",
        "Spring campaign",
        ...inStudio,
      ]);

      assert.deepStrictEqual(yield* tagsOf(session.studio, draftId), [
        campaignTagId,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("sends a post filed under a tag", () =>
    Effect.gen(function* sends() {
      const session = yield* signedIn();

      const sent = parsed(
        yield* session.printed([
          "post",
          "A synthetic post with a tag.",
          "--channel",
          mastodonId,
          "--at",
          "2026-11-25T09:00:00Z",
          "--tag",
          "Evergreen",
          "--json",
          ...inStudio,
        ])
      );

      assert.deepInclude(sent, { tagIds: [evergreenTagId] });
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
