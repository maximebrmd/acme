import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  ChannelNotFound,
  ChannelSetNameTaken,
  ChannelSetNotFound,
  Forbidden,
  PostContentInvalid,
  SignatureNameTaken,
  SignatureNotFound,
  UnknownChannels,
} from "peal-contract";
import type { Member, PostContent } from "peal-contract";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ChannelDefaultsHandlers } from "#publishing/api/channel-defaults.ts";
import { ChannelSetsHandlers } from "#publishing/api/channel-sets.ts";
import { PostsHandlers } from "#publishing/api/posts.ts";
import { SignaturesHandlers } from "#publishing/api/signatures.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { memberOf } from "#test/channels/support.ts";
import { utc } from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// What a workspace saves to write posts faster: signatures, channel sets
// and channels' default options, and the posts that take them.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const clientAs = (member: Member) =>
  HttpApiTest.groups(Api, [
    "posts",
    "signatures",
    "channelSets",
    "channelDefaults",
  ]).pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.mergeAll(
          PostsHandlers,
          SignaturesHandlers,
          ChannelSetsHandlers,
          ChannelDefaultsHandlers
        ).pipe(Layer.provideMerge(securityTest(member))),
        HttpServer.layerServices
      )
    )
  );

const text = (
  body: string,
  overrides: readonly (readonly [ChannelId, string])[] = []
): PostContent => ({
  media: [],
  overrides: overrides.map(([channelId, own]) => ({ channelId, text: own })),
  text: body,
});

const freshWorkspace = newId(WorkspaceIdSchema);

// A partner's key acting in a workspace the partner owns.
const partnerKeyOf = (workspaceId: WorkspaceId): Member => ({
  permissions: permissionsFor("editor"),
  principal: {
    _tag: "partnerKey",
    partnerId: "00000000-0000-7000-8000-00000000aaaa",
    partnerKeyId: "synthetic-partner-key",
    permissions: permissionsFor("editor"),
    scopes: [],
  },
  workspaceId,
});

const studio = Effect.gen(function* studio() {
  const workspaceId = yield* freshWorkspace;
  const mastodon = yield* connect(workspaceId, "mastodon");
  const bluesky = yield* connect(workspaceId, "bluesky");
  const youtube = yield* connect(workspaceId, "youtube");

  const editor = yield* clientAs(
    memberOf(workspaceId, permissionsFor("editor"))
  );

  const viewer = yield* clientAs(
    memberOf(workspaceId, permissionsFor("viewer"))
  );

  return {
    bluesky,
    editor,
    mastodon,
    params: { workspaceId },
    viewer,
    workspaceId,
    youtube,
  };
});

const tomorrow = {
  _tag: "at" as const,
  at: utc("2026-06-16T08:00:00Z"),
  timeZone: "Europe/Paris",
};

const textsOf = ({ content }: { readonly content: PostContent }) => ({
  overrides: Object.fromEntries(
    content.overrides.map(({ channelId, text: own }) => [channelId, own])
  ),
  text: content.text,
});

describe("signatures", () => {
  it.effect(
    "are kept by name, one default a scope, for members who edit posts",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keeps() {
          const { editor, mastodon, params, viewer } = yield* studio;
          const other = yield* studio;

          const general = yield* editor.signatures.create({
            params,
            payload: { isDefault: true, name: "General", text: "— The studio" },
          });

          assert.deepStrictEqual(general.scope, { _tag: "workspace" });
          assert.isTrue(general.isDefault);

          // A new default of the same scope takes its place.
          const formal = yield* editor.signatures.create({
            params,
            payload: { isDefault: true, name: "Formal", text: "Kind regards" },
          });

          const onMastodon = yield* editor.signatures.create({
            params,
            payload: {
              isDefault: true,
              name: "Fediverse",
              scope: { _tag: "channel", channelId: mastodon },
              text: "#studio",
            },
          });

          const listed = yield* viewer.signatures.list({ params });

          assert.deepStrictEqual(
            listed.map(({ id, isDefault }) => [id, isDefault]),
            [
              [general.id, false],
              [formal.id, true],
              [onMastodon.id, true],
            ]
          );

          const taken = yield* editor.signatures
            .create({ params, payload: { name: "GENERAL", text: "Again" } })
            .pipe(Effect.flip);

          assert.instanceOf(taken, SignatureNameTaken);

          // A channel of another workspace is no channel here.
          const elsewhere = yield* other.editor.signatures
            .create({
              params: other.params,
              payload: {
                name: "Theirs",
                scope: { _tag: "channel", channelId: mastodon },
                text: "Theirs",
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(elsewhere, UnknownChannels);

          const byViewer = yield* viewer.signatures
            .create({ params, payload: { name: "Mine", text: "Mine" } })
            .pipe(Effect.flip);

          assert.instanceOf(byViewer, Forbidden);

          const renamed = yield* editor.signatures.update({
            params: { ...params, signatureId: general.id },
            payload: { name: "Casual", text: "Cheers" },
          });

          assert.strictEqual(renamed.text, "Cheers");
          assert.isFalse(renamed.isDefault);

          yield* editor.signatures.delete({
            params: { ...params, signatureId: general.id },
          });

          const gone = yield* editor.signatures
            .delete({ params: { ...params, signatureId: general.id } })
            .pipe(Effect.flip);

          assert.instanceOf(gone, SignatureNotFound);
        })
      ),
    timeout
  );

  it.effect(
    "go under a new post's text when it asks, once, and are counted",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* signs() {
          const { bluesky, editor, mastodon, params } = yield* studio;

          yield* editor.signatures.create({
            params,
            payload: { isDefault: true, name: "General", text: "— The studio" },
          });

          yield* editor.signatures.create({
            params,
            payload: {
              isDefault: true,
              name: "Fediverse",
              scope: { _tag: "platform", platform: "mastodon" },
              text: "#studio",
            },
          });

          const chosen = yield* editor.signatures.create({
            params,
            payload: { name: "Chosen", text: "Read more on our site" },
          });

          // Nothing asked: the post says what it was given.
          const plain = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [mastodon, bluesky],
              content: text("Hello"),
            },
          });

          assert.deepStrictEqual(textsOf(plain), {
            overrides: {},
            text: "Hello",
          });

          const signed = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [mastodon, bluesky],
              content: text("Hello"),
              defaultSignatures: true,
            },
          });

          assert.deepStrictEqual(textsOf(signed), {
            overrides: { [mastodon]: "Hello\n\n#studio" },
            text: "Hello\n\n— The studio",
          });

          // Saved again with the same request, nothing is added twice.
          const again = yield* editor.posts.update({
            params: { ...params, postId: signed.id },
            payload: {
              channelIds: [mastodon, bluesky],
              content: signed.content,
              defaultSignatures: true,
            },
          });

          assert.deepStrictEqual(textsOf(again), textsOf(signed));

          const byHand = yield* editor.posts.send({
            headers: {},
            params,
            payload: {
              channelIds: [bluesky],
              content: text("Hello"),
              signatureId: chosen.id,
              when: tomorrow,
            },
            query: {},
          });

          assert.strictEqual(
            byHand.content.text,
            "Hello\n\nRead more on our site"
          );

          // The signature is text of the post: it counts against the limit.
          const long = yield* editor.posts
            .send({
              headers: {},
              params,
              payload: {
                allowDuplicate: true,
                channelIds: [bluesky],
                content: text("x".repeat(295)),
                defaultSignatures: true,
                when: tomorrow,
              },
              query: {},
            })
            .pipe(Effect.flip);

          assert.instanceOf(long, PostContentInvalid);
          assert.deepStrictEqual(
            long.violations.map(({ _tag }) => _tag),
            ["textTooLong"]
          );

          const check = yield* editor.posts.validate({
            params,
            payload: {
              channelIds: [bluesky],
              content: text("x".repeat(295)),
              defaultSignatures: true,
            },
          });

          assert.isFalse(check.valid);

          const unknown = yield* editor.posts
            .create({
              params,
              payload: {
                channelIds: [bluesky],
                content: text("Hello"),
                signatureId: "not-an-id",
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(unknown, SignatureNotFound);

          yield* editor.posts.cancel({
            params: { ...params, postId: byHand.id },
          });
        })
      ),
    timeout
  );
});

// A post of three parts, the last saying `last`.
const thread = (last: string): PostContent => ({
  ...text("First"),
  followUps: [
    { delaySeconds: 0, media: [], overrides: [], text: "Second" },
    { delaySeconds: 60, media: [], overrides: [], text: last },
  ],
});

describe("a post of several parts", () => {
  it.effect(
    "is signed under its last part, and checked and compared as signed",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* signsLast() {
          const { bluesky, editor, params } = yield* studio;

          const signOff = yield* editor.signatures.create({
            params,
            payload: { name: "Sign-off", text: "— The studio" },
          });

          const sent = yield* editor.posts.send({
            headers: {},
            params,
            payload: {
              channelIds: [bluesky],
              content: thread("Last"),
              signatureId: signOff.id,
              when: tomorrow,
            },
            query: {},
          });

          assert.strictEqual(sent.content.text, "First");
          assert.deepStrictEqual(
            (sent.content.followUps ?? []).map((part) => [
              part.text,
              part.delaySeconds,
            ]),
            [
              ["Second", 0],
              ["Last\n\n— The studio", 60],
            ]
          );

          // Checked as it would go out: the last part with its signature.
          const signed = yield* editor.posts.validate({
            params,
            payload: {
              channelIds: [bluesky],
              content: thread("Last"),
              signatureId: signOff.id,
              when: tomorrow,
            },
          });

          assert.deepStrictEqual(
            signed.channels.flatMap(({ parts }) =>
              parts.map((part) => part.text)
            ),
            ["Second", "Last\n\n— The studio"]
          );

          // The same post, signed, is already on its way; unsigned, it is
          // another post.
          assert.deepStrictEqual(signed.duplicates, [
            { channelId: bluesky, postId: sent.id },
          ]);

          const unsigned = yield* editor.posts.validate({
            params,
            payload: {
              channelIds: [bluesky],
              content: thread("Last"),
              when: tomorrow,
            },
          });

          assert.deepStrictEqual(unsigned.duplicates, []);

          yield* editor.posts.cancel({
            params: { ...params, postId: sent.id },
          });
        })
      ),
    timeout
  );
});

describe("channel sets", () => {
  it.effect(
    "keep channels of the workspace under a name, with their options",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keeps() {
          const { bluesky, editor, mastodon, params, viewer, youtube } =
            yield* studio;

          const other = yield* studio;

          const set = yield* editor.channelSets.create({
            params,
            payload: {
              channelIds: [mastodon, youtube],
              name: "Launch",
              options: [
                {
                  channelId: youtube,
                  options: { platform: "youtube", title: "A working title" },
                },
              ],
            },
          });

          assert.deepStrictEqual(set.channelIds, [mastodon, youtube]);
          assert.deepStrictEqual(set.unavailableChannelIds, []);

          const taken = yield* editor.channelSets
            .create({
              params,
              payload: { channelIds: [bluesky], name: "launch" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(taken, ChannelSetNameTaken);

          const foreign = yield* editor.channelSets
            .create({
              params,
              payload: { channelIds: [other.mastodon], name: "Theirs" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(foreign, UnknownChannels);

          // Options are the channel's own platform's.
          const misplaced = yield* editor.channelSets
            .create({
              params,
              payload: {
                channelIds: [mastodon],
                name: "Misplaced",
                options: [
                  {
                    channelId: mastodon,
                    options: { platform: "youtube", title: "No" },
                  },
                ],
              },
            })
            .pipe(Effect.flip);

          assert.instanceOf(misplaced, PostContentInvalid);

          const byViewer = yield* viewer.channelSets
            .create({
              params,
              payload: { channelIds: [bluesky], name: "Mine" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(byViewer, Forbidden);

          const listed = yield* viewer.channelSets.list({ params });

          assert.deepStrictEqual(
            listed.map(({ id }) => id),
            [set.id]
          );

          const updated = yield* editor.channelSets.update({
            params: { ...params, channelSetId: set.id },
            payload: { channelIds: [bluesky], name: "Launch day" },
          });

          assert.deepStrictEqual(updated.channelIds, [bluesky]);
          assert.deepStrictEqual(updated.options, []);

          yield* editor.channelSets.delete({
            params: { ...params, channelSetId: set.id },
          });

          const gone = yield* editor.channelSets
            .update({
              params: { ...params, channelSetId: set.id },
              payload: { channelIds: [bluesky], name: "Launch" },
            })
            .pipe(Effect.flip);

          assert.instanceOf(gone, ChannelSetNotFound);
        })
      ),
    timeout
  );

  it.effect(
    "are named by a post instead of its channels, by id or by name",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* names() {
          const { bluesky, editor, mastodon, params, workspaceId, youtube } =
            yield* studio;

          const set = yield* editor.channelSets.create({
            params,
            payload: {
              channelIds: [mastodon, youtube],
              name: "Launch",
              options: [
                {
                  channelId: youtube,
                  options: { platform: "youtube", title: "A working title" },
                },
              ],
            },
          });

          const draft = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [bluesky],
              channelSets: ["launch"],
              content: text("Hello"),
            },
          });

          assert.deepStrictEqual(
            draft.targets.map(({ channelId, options }) => [channelId, options]),
            [
              [bluesky, null],
              [mastodon, null],
              [youtube, { platform: "youtube", title: "A working title" }],
            ]
          );
          assert.isUndefined(draft.warnings);

          // The post's own options win over the set's.
          const own = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [],
              channelSets: [set.id],
              content: text("Hello"),
              options: [
                {
                  channelId: youtube,
                  options: { platform: "youtube", title: "Its own title" },
                },
              ],
            },
          });

          assert.deepStrictEqual(
            own.targets.map(({ options }) => options),
            [null, { platform: "youtube", title: "Its own title" }]
          );

          // A partner's key, in a workspace the partner owns, names it too.
          const partner = yield* clientAs(partnerKeyOf(workspaceId));

          const sent = yield* partner.posts
            .send({
              headers: {},
              params,
              payload: {
                channelIds: [],
                channelSets: ["Launch"],
                content: text("From a partner"),
                options: [
                  {
                    channelId: youtube,
                    options: { platform: "youtube", title: "Its own title" },
                  },
                ],
                when: tomorrow,
              },
              query: {},
            })
            .pipe(Effect.flip);

          // YouTube takes a video, which this post has none of: the set was
          // read, and its channels checked as any others.
          assert.instanceOf(sent, PostContentInvalid);

          const unknown = yield* editor.posts
            .send({
              headers: {},
              params,
              payload: {
                channelIds: [bluesky],
                channelSets: ["No such set"],
                content: text("Hello"),
                when: tomorrow,
              },
              query: {},
            })
            .pipe(Effect.flip);

          assert.instanceOf(unknown, ChannelSetNotFound);
        })
      ),
    timeout
  );

  it.effect(
    "leave out a channel disconnected since, and say so",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* drops() {
          const { bluesky, editor, mastodon, params, workspaceId } =
            yield* studio;

          const set = yield* editor.channelSets.create({
            params,
            payload: { channelIds: [mastodon, bluesky], name: "Launch" },
          });

          yield* ChannelRepository.use((channels) =>
            channels.remove(workspaceId, mastodon)
          );

          const [listed] = yield* editor.channelSets.list({ params });

          assert.deepStrictEqual(listed?.channelIds, [mastodon, bluesky]);
          assert.deepStrictEqual(listed?.unavailableChannelIds, [mastodon]);

          const dropped = [
            {
              _tag: "channelsDropped" as const,
              channelIds: [mastodon],
              channelSetId: set.id,
              channelSetName: "Launch",
            },
          ];

          const check = yield* editor.posts.validate({
            params,
            payload: {
              channelIds: [],
              channelSets: ["Launch"],
              content: text("Hello"),
              when: tomorrow,
            },
          });

          assert.isTrue(check.valid);
          assert.deepStrictEqual(check.warnings, dropped);
          assert.deepStrictEqual(
            check.channels.map(({ channelId }) => channelId),
            [bluesky]
          );

          const sent = yield* editor.posts.send({
            headers: {},
            params,
            payload: {
              channelIds: [],
              channelSets: ["Launch"],
              content: text("Hello"),
              when: tomorrow,
            },
            query: {},
          });

          assert.deepStrictEqual(
            sent.targets.map(({ channelId }) => channelId),
            [bluesky]
          );
          assert.deepStrictEqual(sent.warnings, dropped);

          // Read again, the post is the post: the warning was the answer's.
          const read = yield* editor.posts.get({
            params: { ...params, postId: sent.id },
          });

          assert.isUndefined(read.warnings);

          yield* editor.posts.cancel({
            params: { ...params, postId: sent.id },
          });

          // Every channel of the set gone, and no other: nothing is made.
          yield* ChannelRepository.use((channels) =>
            channels.remove(workspaceId, bluesky)
          );

          const none = yield* editor.posts
            .send({
              headers: {},
              params,
              payload: {
                allowDuplicate: true,
                channelIds: [],
                channelSets: ["Launch"],
                content: text("Hello"),
                when: tomorrow,
              },
              query: {},
            })
            .pipe(Effect.flip);

          assert.instanceOf(none, UnknownChannels);
          assert.deepStrictEqual(none.channelIds, [mastodon, bluesky]);
        })
      ),
    timeout
  );

  it.effect(
    "are named in a CSV file's channels column",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* imports() {
          const { bluesky, editor, mastodon, params } = yield* studio;

          const set = yield* editor.channelSets.create({
            params,
            payload: { channelIds: [mastodon, bluesky], name: "Launch" },
          });

          const csv = [
            "text,channels,at,time_zone",
            `By name,Launch,2026-06-16 09:00,Europe/Paris`,
            `By id,${set.id},2026-06-17 09:00,Europe/Paris`,
            `With a channel,${bluesky},2026-06-18 09:00,Europe/Paris`,
          ].join("\n");

          const imported = yield* editor.posts.import({
            headers: {},
            params,
            payload: { csv },
          });

          assert.strictEqual(imported.created, 3);

          const made = yield* editor.posts.search({
            params,
            query: { sort: "scheduledAsc" },
          });

          assert.deepStrictEqual(
            made.items.map(({ targets }) =>
              targets.map(({ channelId }) => channelId)
            ),
            [[mastodon, bluesky], [mastodon, bluesky], [bluesky]]
          );

          yield* Effect.forEach(
            made.items,
            ({ id }) =>
              editor.posts.cancel({ params: { ...params, postId: id } }),
            { discard: true }
          );
        })
      ),
    timeout
  );
});

describe("a channel's default options", () => {
  it.effect(
    "are taken by a new post that gives none there, and checked as its own",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* defaults() {
          const { editor, mastodon, params, viewer, youtube } = yield* studio;
          const other = yield* studio;
          const onYouTube = { ...params, channelId: youtube };

          const none = yield* viewer.channelDefaults.get({ params: onYouTube });

          assert.isNull(none.options);

          const kept = yield* editor.channelDefaults.set({
            params: onYouTube,
            payload: { options: { platform: "youtube", privacy: "unlisted" } },
          });

          assert.deepStrictEqual(kept.options, {
            platform: "youtube",
            privacy: "unlisted",
          });

          const draft = yield* editor.posts.create({
            params,
            payload: {
              channelIds: [youtube, mastodon],
              content: text("Hello"),
            },
          });

          assert.deepStrictEqual(
            draft.targets.map(({ options }) => options),
            [{ platform: "youtube", privacy: "unlisted" }, null]
          );

          // What the post says itself wins, and an update keeps what it is
          // given: defaults are for new posts.
          const updated = yield* editor.posts.update({
            params: { ...params, postId: draft.id },
            payload: { channelIds: [youtube], content: text("Hello") },
          });

          assert.deepStrictEqual(
            updated.targets.map(({ options }) => options),
            [null]
          );

          // A default never gets a post past the platform's rules: the
          // title YouTube needs is still missing.
          const sent = yield* editor.posts
            .send({
              headers: {},
              params,
              payload: {
                channelIds: [youtube],
                content: text("Hello"),
                when: {
                  _tag: "at",
                  at: utc("2026-06-16T08:00:00Z"),
                  timeZone: "Europe/Paris",
                },
              },
              query: {},
            })
            .pipe(Effect.flip);

          assert.instanceOf(sent, PostContentInvalid);
          assert.isTrue(
            sent.violations.some(
              (violation) =>
                violation._tag === "optionMissing" &&
                violation.field === "title"
            )
          );

          const misplaced = yield* editor.channelDefaults
            .set({
              params: { ...params, channelId: mastodon },
              payload: { options: { platform: "youtube", title: "No" } },
            })
            .pipe(Effect.flip);

          assert.instanceOf(misplaced, PostContentInvalid);

          const byViewer = yield* viewer.channelDefaults
            .set({
              params: onYouTube,
              payload: { options: { platform: "youtube", title: "Mine" } },
            })
            .pipe(Effect.flip);

          assert.instanceOf(byViewer, Forbidden);

          const elsewhere = yield* other.editor.channelDefaults
            .get({ params: { ...other.params, channelId: youtube } })
            .pipe(Effect.flip);

          assert.instanceOf(elsewhere, ChannelNotFound);

          yield* editor.channelDefaults.clear({ params: onYouTube });

          const cleared = yield* editor.channelDefaults.get({
            params: onYouTube,
          });

          assert.isNull(cleared.options);
        })
      ),
    timeout
  );
});
