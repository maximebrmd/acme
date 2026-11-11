import { assert, describe, it } from "@effect/vitest";
import { Effect, FileSystem, Path, Ref, Schema } from "effect";

import { filesLayer, signedIn } from "./signed-in.ts";
import {
  draftId,
  fediverseSignatureId,
  goneChannelId,
  launchSetId,
  mastodonId,
  signOffId,
  tiktokId,
  videosSetId,
  youtubeId,
} from "./studio.ts";
import type { Studio } from "./studio.ts";

// peal signatures, peal sets and peal channels defaults, and the posts
// that take what they save, against the in-memory studio: what each
// command asks the server, what it prints, and how it explains a refusal.

const changes = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ changes: made }) => made));

const postsOf = (studio: Studio) =>
  Ref.get(studio.state).pipe(Effect.map(({ posts }) => posts));

const inStudio = ["--workspace", "studio"];

const inShop = ["--workspace", "shop"];

const newSignatureId = "0190f3a0-0000-7000-8000-00000000a103";

const newSetId = "0190f3a0-0000-7000-8000-00000000a203";

const stranger = "0190f3a0-0000-7000-8000-00000000ffff";

const mastodon = `${mastodonId} (mastodon @studio@social.example.test)`;

const notAllowed =
  "Peal refused: your role in this workspace does not allow it";

const videoOptions = {
  madeForKids: false,
  platform: "youtube",
  title: "A synthetic video",
};

const droppedFromLaunch = {
  _tag: "channelsDropped",
  channelIds: [goneChannelId],
  channelSetId: launchSetId,
  channelSetName: "Launch",
};

const parsed = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown));

const ErrorSchema = Schema.fromJsonString(
  Schema.Struct({ error: Schema.Record(Schema.String, Schema.Unknown) })
);

const errorOf = (text: string) =>
  Schema.decodeUnknownSync(ErrorSchema)(text).error;

// What the commands print of a post, as far as these tests read it.
const PostAnswerSchema = Schema.fromJsonString(
  Schema.Struct({
    content: Schema.Struct({ text: Schema.String }),
    id: Schema.String,
    targets: Schema.Array(
      Schema.Struct({ channelId: Schema.String, options: Schema.Unknown })
    ),
    warnings: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  })
);

const postOf = Schema.decodeUnknownSync(PostAnswerSchema);

const ImportAnswerSchema = Schema.fromJsonString(
  Schema.Struct({
    created: Schema.Number,
    rows: Schema.Array(
      Schema.Struct({
        _tag: Schema.String,
        post: Schema.optionalKey(
          Schema.Struct({
            targets: Schema.Array(Schema.Struct({ channelId: Schema.String })),
          })
        ),
      })
    ),
  })
);

const importOf = Schema.decodeUnknownSync(ImportAnswerSchema);

describe("peal signatures", () => {
  it.effect("lists the workspace's signatures, in prose and as JSON", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      const listed = yield* session.printed([
        "signatures",
        "list",
        ...inStudio,
      ]);

      assert.include(listed, "Signatures of Studio:");
      assert.match(
        listed,
        new RegExp(
          `${signOffId}\\s+Sign-off\\s+every channel\\s+default\\s+The Studio team`,
          "u"
        )
      );
      assert.match(
        listed,
        new RegExp(
          `${fediverseSignatureId}\\s+Fediverse\\s+every mastodon channel\\s+#studio #synthetic`,
          "u"
        )
      );

      assert.deepStrictEqual(
        parsed(
          yield* session.printed(["signatures", "list", "--json", ...inStudio])
        ),
        [
          {
            createdAt: "2026-10-03T09:00:00.000Z",
            id: signOffId,
            isDefault: true,
            name: "Sign-off",
            scope: { _tag: "workspace" },
            text: "The Studio team",
          },
          {
            createdAt: "2026-10-04T09:00:00.000Z",
            id: fediverseSignatureId,
            isDefault: false,
            name: "Fediverse",
            scope: { _tag: "platform", platform: "mastodon" },
            text: "#studio #synthetic",
          },
        ]
      );
      assert.strictEqual(
        yield* session.printed(["signatures", "list", ...inShop]),
        "Shop has no signatures."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("creates a signature for the workspace unless told where", () =>
    Effect.gen(function* creates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "signatures",
          "create",
          "  Weekly ",
          "--text",
          "  See you next week.  ",
          ...inStudio,
        ]),
        `Created signature Weekly (every channel) in Studio: ${newSignatureId}.`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "signatures",
            "create",
            "Skies",
            "--text",
            "Synthetic skies.",
            "--platform",
            "bluesky",
            "--default",
            "--json",
            ...inStudio,
          ])
        ),
        {
          isDefault: true,
          name: "Skies",
          scope: { _tag: "platform", platform: "bluesky" },
          text: "Synthetic skies.",
        }
      );
      assert.include(
        yield* session.printed([
          "signatures",
          "create",
          "Toots",
          "--text",
          "A synthetic toot.",
          "--channel",
          mastodonId,
          ...inStudio,
        ]),
        `Created signature Toots (channel ${mastodonId}) in Studio:`
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        "signature:create:Weekly:workspace:plain",
        "signature:create:Skies:platform:bluesky:default",
        `signature:create:Toots:channel:${mastodonId}:plain`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses what does not fit, before asking", () =>
    Effect.gen(function* misfit() {
      const session = yield* signedIn();

      for (const args of [
        ["   ", "--text", "A synthetic text."],
        ["x".repeat(61), "--text", "A synthetic text."],
        ["Weekly", "--text", "   "],
        ["Weekly", "--text", "x".repeat(2001)],
      ]) {
        assert.include(
          yield* session.refused([
            "signatures",
            "create",
            ...args,
            ...inStudio,
          ]),
          "A signature's name has 1 to 60 characters, on one line, and its text 1 to 2000."
        );
      }

      assert.include(
        yield* session.refused([
          "signatures",
          "create",
          "Weekly",
          "--text",
          "A synthetic text.",
          "--platform",
          "mastodon",
          "--channel",
          mastodonId,
          ...inStudio,
        ]),
        "Give --platform or --channel, not both."
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says a name is taken, whatever its case", () =>
    Effect.gen(function* taken() {
      const session = yield* signedIn();

      assert.include(
        yield* session.refused([
          "signatures",
          "create",
          "sign-off",
          "--text",
          "A synthetic text.",
          ...inStudio,
        ]),
        "The workspace already has a signature of that name, whatever its case: nothing was changed."
      );

      const failure = errorOf(
        yield* session.refused([
          "signatures",
          "update",
          "Fediverse",
          "--name",
          "SIGN-OFF",
          "--json",
          ...inStudio,
        ])
      );

      assert.strictEqual(failure["_tag"], "SignatureNameTaken");
      assert.strictEqual(failure["code"], "signature_name_taken");
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("changes what is given of a signature, and keeps the rest", () =>
    Effect.gen(function* updates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "signatures",
          "update",
          "sign-off",
          "--text",
          " Until next time. ",
          ...inStudio,
        ]),
        `Signature ${signOffId} of Studio is now Sign-off (every channel, the default there). Posts that already hold its text keep it as it was.`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "signatures",
            "update",
            fediverseSignatureId,
            "--default",
            "--json",
            ...inStudio,
          ])
        ),
        {
          id: fediverseSignatureId,
          isDefault: true,
          name: "Fediverse",
          scope: { _tag: "platform", platform: "mastodon" },
          text: "#studio #synthetic",
        }
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "signatures",
            "update",
            "Fediverse",
            "--no-default",
            "--channel",
            mastodonId,
            "--json",
            ...inStudio,
          ])
        ),
        { isDefault: false, scope: { _tag: "channel", channelId: mastodonId } }
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `signature:update:${signOffId}:Sign-off:workspace:default`,
        `signature:update:${fediverseSignatureId}:Fediverse:platform:mastodon:default`,
        `signature:update:${fediverseSignatureId}:Fediverse:channel:${mastodonId}:plain`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("leaves one default where a signature is meant for", () =>
    Effect.gen(function* soleDefault() {
      const session = yield* signedIn();

      yield* session.printed([
        "signatures",
        "update",
        "Fediverse",
        "--whole-workspace",
        "--default",
        ...inStudio,
      ]);

      const listed = yield* session.printed([
        "signatures",
        "list",
        ...inStudio,
      ]);

      assert.match(
        listed,
        new RegExp(`${signOffId}\\s+Sign-off\\s+every channel\\s+The`, "u")
      );
      assert.match(
        listed,
        new RegExp(
          `${fediverseSignatureId}\\s+Fediverse\\s+every channel\\s+default`,
          "u"
        )
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("refuses flags that do not hold together", () =>
    Effect.gen(function* flags() {
      const session = yield* signedIn();
      const updating = ["signatures", "update", "Fediverse"];

      assert.include(
        yield* session.refused([...updating, ...inStudio]),
        "Give what changes"
      );
      assert.include(
        yield* session.refused([
          ...updating,
          "--default",
          "--no-default",
          ...inStudio,
        ]),
        "Give --default or --no-default, not both."
      );
      assert.include(
        yield* session.refused([
          ...updating,
          "--whole-workspace",
          "--platform",
          "bluesky",
          ...inStudio,
        ]),
        "Give --whole-workspace, --platform or --channel, not several."
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes a signature", () =>
    Effect.gen(function* deletes() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "signatures",
          "delete",
          "SIGN-OFF",
          ...inStudio,
        ]),
        "Deleted signature Sign-off of Studio: posts that already hold its text keep it."
      );
      assert.strictEqual(
        yield* session.printed([
          "signatures",
          "delete",
          fediverseSignatureId,
          "--json",
          ...inStudio,
        ]),
        "null"
      );
      assert.strictEqual(
        yield* session.printed(["signatures", "list", ...inStudio]),
        "Studio has no signatures."
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `signature:delete:${signOffId}`,
        `signature:delete:${fediverseSignatureId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says a signature it was not given the id or the name of", () =>
    Effect.gen(function* unknown() {
      const session = yield* signedIn();

      for (const args of [
        ["signatures", "delete", "Autumn"],
        ["signatures", "update", "Autumn", "--default"],
        [
          "drafts",
          "save",
          "--text",
          "A synthetic draft.",
          "--signature",
          "Autumn",
        ],
        [
          "post",
          "A synthetic post.",
          "--channel",
          mastodonId,
          "--now",
          "--signature",
          "Autumn",
        ],
      ]) {
        const refused = yield* session.refused([...args, ...inStudio]);

        assert.include(
          refused,
          "The workspace has no signature Autumn, by id or by name: peal signatures list shows them."
        );
        assert.notInclude(refused, "Sign-off");
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal sets", () => {
  it.effect("lists the workspace's channel sets, in prose and as JSON", () =>
    Effect.gen(function* lists() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed(["sets", "list", ...inStudio]),
        [
          "Channel sets of Studio:",
          `  ${launchSetId}  Launch  2 channels, 1 no longer connected`,
          `      ${mastodon}`,
          `      ${goneChannelId}: no longer connected, so posts leave it out`,
          `  ${videosSetId}  Videos  1 channel`,
          `      ${youtubeId} (youtube Studio videos), with options`,
        ].join("\n")
      );
      assert.deepStrictEqual(
        parsed(yield* session.printed(["sets", "list", "--json", ...inStudio])),
        [
          {
            channelIds: [mastodonId, goneChannelId],
            createdAt: "2026-10-05T09:00:00.000Z",
            id: launchSetId,
            name: "Launch",
            options: [],
            unavailableChannelIds: [goneChannelId],
          },
          {
            channelIds: [youtubeId],
            createdAt: "2026-10-06T09:00:00.000Z",
            id: videosSetId,
            name: "Videos",
            options: [{ channelId: youtubeId, options: videoOptions }],
            unavailableChannelIds: [],
          },
        ]
      );
      assert.strictEqual(
        yield* session.printed(["sets", "list", ...inShop]),
        "Shop has no channel sets."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("creates a set of channels, with the options of some", () =>
    Effect.gen(function* creates() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed([
          "sets",
          "create",
          " Socials ",
          "--channel",
          mastodonId,
          "--channels",
          `${tiktokId},${mastodonId}`,
          ...inStudio,
        ]),
        `Created channel set Socials in Studio, of 2 channels: ${newSetId}.`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "sets",
            "create",
            "Films",
            "--channel",
            youtubeId,
            "--options",
            `${youtubeId}={"platform":"youtube","madeForKids":true}`,
            "--json",
            ...inStudio,
          ])
        ),
        {
          channelIds: [youtubeId],
          name: "Films",
          options: [
            {
              channelId: youtubeId,
              options: { madeForKids: true, platform: "youtube" },
            },
          ],
          unavailableChannelIds: [],
        }
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `set:create:Socials:${mastodonId},${tiktokId}`,
        `set:create:Films:${youtubeId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains a set that cannot be kept", () =>
    Effect.gen(function* refusals() {
      const session = yield* signedIn();
      const creating = ["sets", "create", "Socials"];

      for (const args of [
        creating,
        ["sets", "create", "   ", "--channel", mastodonId],
        ["sets", "create", "x".repeat(61), "--channel", mastodonId],
      ]) {
        assert.include(
          yield* session.refused([...args, ...inStudio]),
          "A channel set has a name of 1 to 60 characters, on one line, and 1 to 50 channels"
        );
      }

      assert.include(
        yield* session.refused([
          ...creating,
          "--channel",
          stranger,
          ...inStudio,
        ]),
        `These channels are not the workspace's: ${stranger}.`
      );
      assert.include(
        yield* session.refused([
          ...creating,
          "--channel",
          mastodonId,
          "--options",
          `${mastodonId}={"platform":"youtube"}`,
          ...inStudio,
        ]),
        `optionsForOtherPlatform on channel ${mastodonId} (mastodon): its options are youtube's, not this channel's platform's`
      );
      assert.include(
        yield* session.refused([
          "sets",
          "create",
          "launch",
          "--channel",
          mastodonId,
          ...inStudio,
        ]),
        "The workspace already has a channel set of that name, whatever its case: nothing was changed."
      );

      const failure = errorOf(
        yield* session.refused([
          "sets",
          "update",
          "Videos",
          "--name",
          "LAUNCH",
          "--json",
          ...inStudio,
        ])
      );

      assert.strictEqual(failure["_tag"], "ChannelSetNameTaken");
      assert.strictEqual(failure["code"], "channel_set_name_taken");
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("changes what is given of a set, and keeps the rest", () =>
    Effect.gen(function* updates() {
      const session = yield* signedIn();

      // A set is saved with connected channels only: the one that is gone
      // goes, and the command says so.
      assert.strictEqual(
        yield* session.printed([
          "sets",
          "update",
          "launch",
          "--name",
          " Launch day ",
          ...inStudio,
        ]),
        [
          `Channel set ${launchSetId} of Studio is now Launch day, of 1 channel. Posts made with it before keep their channels.`,
          `Taken out, as no longer connected: ${goneChannelId}.`,
        ].join("\n")
      );
      // The options of a channel it keeps stay, beside those given.
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "sets",
            "update",
            videosSetId,
            "--channel",
            youtubeId,
            "--channel",
            tiktokId,
            "--options",
            `${tiktokId}={"platform":"tiktok","privacyLevel":"SELF_ONLY"}`,
            "--json",
            ...inStudio,
          ])
        ),
        {
          channelIds: [youtubeId, tiktokId],
          id: videosSetId,
          name: "Videos",
          options: [
            { channelId: youtubeId, options: videoOptions },
            {
              channelId: tiktokId,
              options: { platform: "tiktok", privacyLevel: "SELF_ONLY" },
            },
          ],
        }
      );
      // And go with a channel it loses.
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "sets",
            "update",
            "Videos",
            "--channel",
            tiktokId,
            "--json",
            ...inStudio,
          ])
        ),
        {
          channelIds: [tiktokId],
          options: [
            {
              channelId: tiktokId,
              options: { platform: "tiktok", privacyLevel: "SELF_ONLY" },
            },
          ],
        }
      );
      assert.include(
        yield* session.refused(["sets", "update", "Videos", ...inStudio]),
        "Give --name, --channel, --options or several"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `set:update:${launchSetId}:Launch day:${mastodonId}`,
        `set:update:${videosSetId}:Videos:${youtubeId},${tiktokId}`,
        `set:update:${videosSetId}:Videos:${tiktokId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("deletes a set, which leaves its channels", () =>
    Effect.gen(function* deletes() {
      const session = yield* signedIn();

      assert.strictEqual(
        yield* session.printed(["sets", "delete", "LAUNCH", ...inStudio]),
        "Deleted channel set Launch of Studio: its channels, and the posts made with it, stay."
      );
      assert.strictEqual(
        yield* session.printed([
          "sets",
          "delete",
          videosSetId,
          "--json",
          ...inStudio,
        ]),
        "null"
      );
      assert.deepStrictEqual(yield* changes(session.studio), [
        `set:delete:${launchSetId}`,
        `set:delete:${videosSetId}`,
      ]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("says a set it was not given the id or the name of", () =>
    Effect.gen(function* unknown() {
      const session = yield* signedIn();

      for (const args of [
        ["sets", "delete", "Autumn"],
        ["sets", "update", "Autumn", "--name", "Winter"],
        ["drafts", "save", "--text", "A synthetic draft.", "--set", "Autumn"],
        ["post", "A synthetic post.", "--now", "--set", "Autumn"],
        ["post", "A synthetic post.", "--now", "--set", "Autumn", "--dry-run"],
      ]) {
        const refused = yield* session.refused([...args, ...inStudio]);

        assert.include(
          refused,
          "The workspace has no channel set Autumn, by id or by name: peal sets list shows them."
        );
        assert.notInclude(refused, "Launch");
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("a member who may not change what the workspace saves", () => {
  it.effect("is told their role refuses it", () =>
    Effect.gen(function* viewer() {
      const session = yield* signedIn();

      for (const args of [
        ["signatures", "create", "Weekly", "--text", "A synthetic text."],
        ["sets", "create", "Socials", "--channel", mastodonId],
        [
          "channels",
          "defaults",
          "set",
          youtubeId,
          "--options",
          '{"platform":"youtube"}',
        ],
        ["channels", "defaults", "clear", youtubeId],
      ]) {
        assert.include(
          yield* session.refused([...args, ...inShop]),
          notAllowed
        );
      }

      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("posts that take what the workspace saved", () => {
  it.effect("sends a post to a set, and says which channels it left out", () =>
    Effect.gen(function* sends() {
      const session = yield* signedIn();

      const printed = yield* session.printed([
        "post",
        "A synthetic launch.",
        "--set",
        "launch",
        "--now",
        ...inStudio,
      ]);

      const [said, warned] = printed.split("\n");

      assert.include(said, `Publishing now on ${mastodon}: post `);
      assert.strictEqual(
        warned,
        `The channel set Launch names 1 channel that is no longer connected, which the post was made without: ${goneChannelId}. peal sets update takes it out of the set.`
      );

      // As JSON, the answer as it came, its warnings in it.
      const sent = postOf(
        yield* session.printed([
          "post",
          "Another synthetic launch.",
          "--set",
          launchSetId,
          "--channel",
          tiktokId,
          "--at",
          "2026-11-25T09:00:00Z",
          "--options",
          `${tiktokId}={"platform":"tiktok","privacyLevel":"SELF_ONLY"}`,
          "--json",
          ...inStudio,
        ])
      );

      assert.deepStrictEqual(
        sent.targets.map(({ channelId }) => channelId),
        [tiktokId, mastodonId]
      );
      assert.deepStrictEqual(sent.warnings, [droppedFromLaunch]);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("checks a post for a set with --dry-run, and makes nothing", () =>
    Effect.gen(function* checks() {
      const session = yield* signedIn();

      const printed = yield* session.printed([
        "post",
        "A synthetic launch.",
        "--set",
        "Launch",
        "--now",
        "--dry-run",
        ...inStudio,
      ]);

      assert.include(
        printed,
        "Checked, and made nothing: the post would go through."
      );
      assert.include(printed, mastodon);
      assert.include(
        printed,
        `The channel set Launch names 1 channel that is no longer connected, which the post would be made without: ${goneChannelId}.`
      );
      assert.deepInclude(
        parsed(
          yield* session.printed([
            "post",
            "A synthetic launch.",
            "--set",
            "Launch",
            "--now",
            "--dry-run",
            "--json",
            ...inStudio,
          ])
        ),
        { valid: true, warnings: [droppedFromLaunch] }
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
      assert.lengthOf(yield* postsOf(session.studio), 4);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("posts nothing to a set none of whose channels is left", () =>
    Effect.gen(function* gone() {
      const session = yield* signedIn();

      yield* Ref.update(session.studio.state, (current) => ({
        ...current,
        channelSets: current.channelSets.map((set) =>
          set.id === launchSetId ? { ...set, channelIds: [goneChannelId] } : set
        ),
      }));

      assert.include(
        yield* session.refused([
          "post",
          "A synthetic launch.",
          "--set",
          "Launch",
          "--now",
          ...inStudio,
        ]),
        `These channels are not the workspace's: ${goneChannelId}.`
      );
      assert.include(
        yield* session.refused([
          "sets",
          "update",
          "Launch",
          "--name",
          "Launch day",
          ...inStudio,
        ]),
        "None of the channels of Launch is connected any more"
      );
      assert.include(
        yield* session.refused(["post", "A synthetic launch.", "--now"]),
        "Name the channels it goes to with --channel, or a channel set with --set"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("puts signatures under a post's text, never twice", () =>
    Effect.gen(function* signs() {
      const session = yield* signedIn();

      const sending = (text: string, ...rest: readonly string[]) =>
        session
          .printed([
            "post",
            text,
            "--channel",
            mastodonId,
            "--at",
            "2026-11-25T09:00:00Z",
            ...rest,
            "--json",
            ...inStudio,
          ])
          .pipe(Effect.map((printed) => postOf(printed).content.text));

      assert.strictEqual(
        yield* sending("A synthetic hello.", "--default-signatures"),
        "A synthetic hello.\n\nThe Studio team"
      );
      assert.strictEqual(
        yield* sending("A synthetic toot.", "--signature", "fediverse"),
        "A synthetic toot.\n\n#studio #synthetic"
      );
      assert.strictEqual(
        yield* sending(
          "A synthetic goodbye.",
          "--signature",
          fediverseSignatureId,
          "--default-signatures"
        ),
        "A synthetic goodbye.\n\n#studio #synthetic\n\nThe Studio team"
      );
      // A text that ends with its signature already is left as it is.
      assert.strictEqual(
        yield* sending(
          "A synthetic note.\n\nThe Studio team",
          "--default-signatures"
        ),
        "A synthetic note.\n\nThe Studio team"
      );
      assert.strictEqual(
        yield* sending("A synthetic note, unsigned."),
        "A synthetic note, unsigned."
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("saves a draft for a set, with the options the set keeps", () =>
    Effect.gen(function* drafts() {
      const session = yield* signedIn();

      const made = postOf(
        yield* session.printed([
          "drafts",
          "save",
          "--text",
          "A synthetic video draft.",
          "--set",
          "videos",
          "--signature",
          "Sign-off",
          "--json",
          ...inStudio,
        ])
      );

      assert.strictEqual(
        made.content.text,
        "A synthetic video draft.\n\nThe Studio team"
      );
      assert.deepStrictEqual(made.targets, [
        { channelId: youtubeId, options: videoOptions },
      ]);
      assert.isUndefined(made.warnings);

      // A draft that changes takes a set's channels beside its own.
      assert.strictEqual(
        yield* session.printed([
          "drafts",
          "save",
          "--post",
          draftId,
          "--set",
          "Launch",
          "--set",
          videosSetId,
          "--default-signatures",
          ...inStudio,
        ]),
        [
          `Saved draft ${draftId} in Studio, for 2 channels.`,
          `The channel set Launch names 1 channel that is no longer connected, which the post was made without: ${goneChannelId}. peal sets update takes it out of the set.`,
        ].join("\n")
      );

      const changed = (yield* postsOf(session.studio)).find(
        ({ id }) => id === draftId
      );

      assert.deepStrictEqual(
        changed?.targets.map(({ channelId }) => channelId),
        [mastodonId, youtubeId]
      );
      assert.isTrue(changed?.content.text.endsWith("\n\nThe Studio team"));
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("imports a row whose channels name a set", () =>
    Effect.gen(function* imports() {
      const session = yield* signedIn();
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const file = path.join(session.directory, "posts.csv");

      yield* fs.writeFileString(
        file,
        [
          "text,channels,at",
          `A synthetic imported video.,Videos ${mastodonId},2026-11-25T09:00:00Z`,
          "",
        ].join("\n")
      );

      const result = importOf(
        yield* session.printed(["posts", "import", file, "--json", ...inStudio])
      );

      assert.strictEqual(result.created, 1);
      assert.deepStrictEqual(
        result.rows[0]?.post?.targets.map(({ channelId }) => channelId),
        [mastodonId, youtubeId]
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});

describe("peal channels defaults", () => {
  const options =
    '{"platform":"youtube","madeForKids":false,"title":"A default title"}';

  const kept = {
    madeForKids: false,
    platform: "youtube",
    title: "A default title",
  };

  it.effect("keeps a channel's default options, which a new draft takes", () =>
    Effect.gen(function* roundTrip() {
      const session = yield* signedIn();
      const showing = ["channels", "defaults", "show", youtubeId];

      assert.strictEqual(
        yield* session.printed([...showing, ...inStudio]),
        `Channel ${youtubeId} has no default options: a post takes there only the options it gives.`
      );
      assert.deepStrictEqual(
        parsed(yield* session.printed([...showing, "--json", ...inStudio])),
        { options: null }
      );

      const set = yield* session.printed([
        "channels",
        "defaults",
        "set",
        youtubeId,
        "--options",
        options,
        ...inStudio,
      ]);

      assert.include(
        set,
        `Kept as the default options of channel ${youtubeId}: {`
      );
      assert.include(set, '"title":"A default title"');
      assert.include(
        yield* session.printed([...showing, ...inStudio]),
        `Default options of channel ${youtubeId}, which a new post takes there when it gives none: {`
      );
      assert.deepStrictEqual(
        parsed(yield* session.printed([...showing, "--json", ...inStudio])),
        { options: kept }
      );

      const saving = (...rest: readonly string[]) =>
        session
          .printed([
            "drafts",
            "save",
            "--text",
            "A synthetic video draft.",
            "--channel",
            youtubeId,
            ...rest,
            "--json",
            ...inStudio,
          ])
          .pipe(Effect.map((printed) => postOf(printed).targets));

      // A new draft takes them where it gives none, and its own otherwise.
      assert.deepStrictEqual(yield* saving(), [
        { channelId: youtubeId, options: kept },
      ]);
      assert.deepStrictEqual(
        yield* saving("--options", `${youtubeId}={"platform":"youtube"}`),
        [{ channelId: youtubeId, options: { platform: "youtube" } }]
      );

      assert.strictEqual(
        yield* session.printed([
          "channels",
          "defaults",
          "clear",
          youtubeId,
          ...inStudio,
        ]),
        `Channel ${youtubeId} has no default options any more. Posts already made keep theirs.`
      );
      assert.deepStrictEqual(yield* saving(), [
        { channelId: youtubeId, options: null },
      ]);
      assert.strictEqual(
        yield* session.printed([
          "channels",
          "defaults",
          "clear",
          youtubeId,
          "--json",
          ...inStudio,
        ]),
        "null"
      );
      assert.deepStrictEqual(
        (yield* changes(session.studio)).filter((change) =>
          change.startsWith("defaults:")
        ),
        [
          `defaults:set:${youtubeId}`,
          `defaults:clear:${youtubeId}`,
          `defaults:clear:${youtubeId}`,
        ]
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("prints the options it kept as JSON", () =>
    Effect.gen(function* json() {
      const session = yield* signedIn();

      assert.deepStrictEqual(
        parsed(
          yield* session.printed([
            "channels",
            "defaults",
            "set",
            youtubeId,
            "--options",
            options,
            "--json",
            ...inStudio,
          ])
        ),
        { options: kept }
      );
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );

  it.effect("explains options a channel cannot keep", () =>
    Effect.gen(function* refusals() {
      const session = yield* signedIn();

      const setting = (channelId: string, given: string) => [
        "channels",
        "defaults",
        "set",
        channelId,
        "--options",
        given,
        ...inStudio,
      ];

      assert.include(
        yield* session.refused(setting(youtubeId, "{title")),
        "--options takes a platform's options as JSON"
      );
      assert.include(
        yield* session.refused(setting(youtubeId, '{"platform":"facebook"}')),
        "--options takes a platform's options as JSON"
      );
      assert.include(
        yield* session.refused(setting(mastodonId, options)),
        `optionsForOtherPlatform on channel ${mastodonId} (mastodon)`
      );
      assert.include(
        yield* session.refused(setting(stranger, options)),
        "The workspace has no such channel"
      );
      assert.include(
        yield* session.refused([
          "channels",
          "defaults",
          "show",
          stranger,
          ...inStudio,
        ]),
        "The workspace has no such channel"
      );
      assert.deepStrictEqual(yield* changes(session.studio), []);
    }).pipe(Effect.scoped, Effect.provide(filesLayer))
  );
});
