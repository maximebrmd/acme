import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Layer, Option, Schema } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  capabilitiesVersion as contractVersion,
  ChannelNotFound,
  Forbidden,
  MediaContentTypeSchema,
  optionsPlatforms as contractOptionsPlatforms,
  PlatformCapabilitiesSchema,
  PlatformSchema,
  TargetOptionsSchema as ContractOptionsSchema,
} from "peal-contract";
import type { MediaContentType, Member } from "peal-contract";
import * as ContractText from "peal-contract/post-text";

import { countsChannel } from "#analytics/domain/counted-platforms.ts";
import { platformCapabilitiesView } from "#publishing/api/capabilities-view.ts";
import { CapabilitiesHandlers } from "#publishing/api/capabilities.ts";
import { AccountStandings } from "#publishing/application/account-standings.ts";
import { ChannelConnections } from "#publishing/application/channel-connections.ts";
import { CountedPlatforms } from "#publishing/application/counted-platforms.ts";
import { PostingCapabilities } from "#publishing/application/posting-capabilities.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type { CreatorFailure } from "#publishing/application/tiktok-creators.ts";
import { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import {
  capabilitiesOf,
  capabilitiesVersion,
} from "#publishing/domain/platform-capabilities.ts";
import { TikTokCreator } from "#publishing/domain/tiktok-creator.ts";
import type { TikTokPosting } from "#publishing/domain/tiktok-creator.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { platforms } from "#shared/domain/platform.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { memberOf } from "#test/channels/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"
);

const onTikTok = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1");

const onMastodon = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c2");

const onLinkedInPage = ChannelIdSchema.make(
  "01900000-0000-7000-8000-0000000000c3"
);

const onLinkedInProfile = ChannelIdSchema.make(
  "01900000-0000-7000-8000-0000000000c4"
);

// The way in each LinkedIn channel came through.
const connections = Layer.succeed(
  ChannelConnections,
  ChannelConnections.of({
    of: (_actor, channelId) =>
      Effect.succeed(
        Option.fromUndefinedOr(
          new Map<string, ChannelConnection>([
            [onLinkedInPage, "linkedinPage"],
            [onLinkedInProfile, "linkedinProfile"],
          ]).get(channelId)
        )
      ),
  })
);

const creator = new TikTokCreator({
  avatarUrl: Option.none(),
  commentDisabled: true,
  duetDisabled: false,
  maxVideoDuration: Option.some(Duration.minutes(10)),
  nickname: "Peal Example",
  privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  stitchDisabled: false,
  username: "peal_example",
});

const ready = Effect.succeed<TikTokPosting>({ _tag: "ready", creator });

const workspaceChannels = Layer.succeed(
  WorkspaceChannels,
  WorkspaceChannels.of({
    lookUp: (_actor, ids) =>
      Effect.succeed(
        [
          { channelId: onTikTok, platform: "tiktok" as const },
          { channelId: onMastodon, platform: "mastodon" as const },
          { channelId: onLinkedInPage, platform: "linkedin" as const },
          { channelId: onLinkedInProfile, platform: "linkedin" as const },
        ].filter(({ channelId }) => ids.includes(channelId))
      ),
  })
);

// The endpoints over the workspace's channels, TikTok answering `read` for
// the TikTok one, on a server whose platforms list counts posts on Mastodon
// only, and whose channels are counted as analytics counts them.
const clientWith = (
  member: Member,
  read: Effect.Effect<TikTokPosting, CreatorFailure> = ready
) =>
  HttpApiTest.groups(Api, ["capabilities"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        CapabilitiesHandlers.pipe(
          Layer.provide(
            PostingCapabilities.layer.pipe(
              Layer.provide(
                Layer.mergeAll(
                  AccountStandings.layer.pipe(
                    Layer.provide(
                      Layer.succeed(
                        TikTokCreators,
                        TikTokCreators.of({
                          read: () => read,
                          takesPhotos: false,
                        })
                      )
                    )
                  ),
                  Layer.succeed(
                    CountedPlatforms,
                    CountedPlatforms.of({
                      includes: (platform) => platform === "mastodon",
                      onChannel: (platform, connection) =>
                        platform === "mastodon" ||
                        countsChannel(platform, connection),
                    })
                  ),
                  connections,
                  workspaceChannels
                )
              )
            )
          ),
          Layer.provideMerge(securityTest(member))
        ),
        HttpServer.layerServices
      )
    )
  );

const viewer = memberOf(workspaceId, permissionsFor("viewer"));

const stranger = memberOf(workspaceId, []);

describe("the platforms' capabilities endpoint", () => {
  it.effect("describes every platform to anyone who reads channels", () =>
    Effect.gen(function* everyPlatform() {
      const client = yield* clientWith(viewer);

      const all = yield* client.capabilities.platforms({
        params: { workspaceId },
      });

      assert.deepStrictEqual(
        all.map(({ platform }) => platform),
        [...platforms]
      );

      const bluesky = all.find(({ platform }) => platform === "bluesky");

      assert.deepStrictEqual(bluesky?.text, {
        forbiddenCharacters: [],
        limits: [
          { maximum: 300, unit: "graphemes" },
          { maximum: 3000, unit: "utf8Bytes" },
          { maximum: 65_536, unit: "utf16Units" },
        ],
        maxHashtags: null,
        maxLinks: null,
        maxMentions: null,
      });
      assert.deepStrictEqual(bluesky?.analytics, { perPost: false });
      assert.deepStrictEqual(bluesky?.options, { constraints: [], fields: [] });
    })
  );

  it.effect(
    "names each format's kind as the media library does: a PDF is a document",
    () =>
      Effect.gen(function* kinds() {
        const client = yield* clientWith(viewer);

        const all = yield* client.capabilities.platforms({
          params: { workspaceId },
        });

        const kindsOf = new Map(
          all
            .flatMap(({ media }) => media.formats ?? [])
            .map(({ contentType, kind }) => [contentType, kind] as const)
        );

        assert.strictEqual(kindsOf.get("application/pdf"), "document");
        assert.strictEqual(kindsOf.get("image/gif"), "image");
        assert.strictEqual(kindsOf.get("video/quicktime"), "video");
      })
  );

  it.effect("describes a platform's media, format by format", () =>
    Effect.gen(function* media() {
      const client = yield* clientWith(viewer);

      const all = yield* client.capabilities.platforms({
        params: { workspaceId },
      });

      const youtube = all.find(({ platform }) => platform === "youtube");

      assert.deepStrictEqual(youtube?.media, {
        altText: { maxLength: 5000, shown: false },
        formats: ["video/mp4" as const, "video/quicktime" as const].map(
          (contentType) => ({
            contentType,
            kind: "video" as const,
            maxAspectRatio: null,
            maxByteSize: 274_877_906_944,
            maxDurationMs: 43_200_000,
            maxMediaWith: null,
            maxPixels: null,
            maxSide: null,
            minAspectRatio: null,
            minByteSize: null,
            minDurationMs: null,
            minSide: null,
          })
        ),
        maxCount: 1,
        maxVideos: 1,
        mixesKinds: false,
        required: true,
      });

      assert.deepStrictEqual(
        all.find(({ platform }) => platform === "pinterest")?.media,
        {
          altText: { maxLength: 500, shown: true },
          formats: [
            ...(["image/jpeg", "image/png"] as const).map((contentType) => ({
              contentType,
              kind: "image" as const,
              maxAspectRatio: null,
              maxByteSize: 20_971_520,
              maxDurationMs: null,
              maxMediaWith: null,
              maxPixels: null,
              maxSide: null,
              minAspectRatio: null,
              minByteSize: null,
              minDurationMs: null,
              minSide: null,
            })),
            ...(["video/mp4", "video/quicktime"] as const).map(
              (contentType) => ({
                contentType,
                kind: "video" as const,
                maxAspectRatio: 1.91,
                maxByteSize: 2_147_483_648,
                maxDurationMs: 900_000,
                maxMediaWith: null,
                maxPixels: null,
                maxSide: null,
                minAspectRatio: 0.5,
                minByteSize: null,
                minDurationMs: 4000,
                minSide: null,
              })
            ),
          ],
          maxCount: 5,
          maxVideos: 1,
          mixesKinds: false,
          required: true,
        }
      );
    })
  );

  it.effect(
    "describes a platform's options and the lookups that fill them",
    () =>
      Effect.gen(function* options() {
        const client = yield* clientWith(viewer);

        const all = yield* client.capabilities.platforms({
          params: { workspaceId },
        });

        const youtube = all.find(({ platform }) => platform === "youtube");

        assert.deepStrictEqual(
          youtube?.options.fields.find(({ name }) => name === "categoryId"),
          {
            forbiddenCharacters: [],
            ifLeftOut: null,
            lookup: "youtubeVideoCategories",
            maxLength: null,
            maximum: null,
            minimum: null,
            name: "categoryId",
            pattern: String.raw`^\d+$`,
            required: false,
            type: "text",
            values: [],
          }
        );
        assert.deepStrictEqual(
          youtube?.lookups.map(({ fills, name, paged }) => ({
            fills,
            name,
            paged,
          })),
          [
            {
              fills: ["categoryId"],
              name: "youtubeVideoCategories",
              paged: false,
            },
            { fills: [], name: "youtubePlaylists", paged: true },
          ]
        );
      })
  );

  it.effect("refuses a member who may not read channels", () =>
    Effect.gen(function* refused() {
      const client = yield* clientWith(stranger);

      const error = yield* client.capabilities
        .platforms({ params: { workspaceId } })
        .pipe(Effect.flip);

      assert.instanceOf(error, Forbidden);
    })
  );
});

describe("a channel's capabilities endpoint", () => {
  it.effect("adds what the account restricts, read from the platform", () =>
    Effect.gen(function* restricted() {
      const client = yield* clientWith(viewer);

      const described = yield* client.capabilities.channel({
        params: { channelId: onTikTok, workspaceId },
      });

      assert.strictEqual(described.channelId, onTikTok);
      assert.strictEqual(described.capabilities.platform, "tiktok");
      assert.strictEqual(described.capabilities.version, capabilitiesVersion);
      assert.deepStrictEqual(described.account, {
        _tag: "read",
        blocked: null,
        restrictions: [
          {
            _tag: "optionValues",
            field: "privacyLevel",
            values: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
          },
          { _tag: "optionFixed", field: "disableComment", value: true },
          { _tag: "videoDuration", maximumMs: 600_000 },
          {
            _tag: "mediaTypesRefused",
            contentTypes: ["image/jpeg", "image/webp"],
          },
        ],
      });
    })
  );

  it.effect("says an account cannot post now", () =>
    Effect.gen(function* blocked() {
      const client = yield* clientWith(
        viewer,
        Effect.succeed({ _tag: "blocked", reason: "postLimit" })
      );

      const described = yield* client.capabilities.channel({
        params: { channelId: onTikTok, workspaceId },
      });

      assert.deepStrictEqual(described.account, {
        _tag: "read",
        blocked: "postLimit",
        restrictions: [
          {
            _tag: "mediaTypesRefused",
            contentTypes: ["image/jpeg", "image/webp"],
          },
        ],
      });
    })
  );

  it.effect(
    "answers the platform's capabilities when the account cannot be asked",
    () =>
      Effect.gen(function* unread() {
        const reasons = yield* Effect.forEach(
          [
            new PlatformUnavailable(),
            new RateLimited({}),
            new TokenExpired(),
            new BadRequest({ code: ownRefusalCodes.channelDisabled }),
            new BadRequest({ code: ownRefusalCodes.channelDisconnected }),
          ],
          (failure) =>
            clientWith(viewer, Effect.fail(failure)).pipe(
              Effect.flatMap((client) =>
                client.capabilities.channel({
                  params: { channelId: onTikTok, workspaceId },
                })
              ),
              Effect.map(({ account, capabilities }) => [
                capabilities.platform,
                account,
              ])
            )
        );

        assert.deepStrictEqual(
          reasons,
          (
            [
              "platformUnreachable",
              "rateLimited",
              "reconnect",
              "disabled",
              "disconnected",
            ] as const
          ).map((reason) => [
            "tiktok" as const,
            { _tag: "unread" as const, reason },
          ])
        );
      })
  );

  it.effect("asks nothing of a platform without account rules", () =>
    Effect.gen(function* unrestricted() {
      const client = yield* clientWith(viewer, Effect.die("not asked"));

      const described = yield* client.capabilities.channel({
        params: { channelId: onMastodon, workspaceId },
      });

      assert.deepStrictEqual(described.account, { _tag: "unrestricted" });
      assert.deepStrictEqual(described.capabilities.analytics, {
        perPost: true,
      });
    })
  );

  it.effect(
    "tells a LinkedIn company page from a profile: only the page has counts and the lookup of pages to mention",
    () =>
      Effect.gen(function* linkedin() {
        const client = yield* clientWith(viewer, Effect.die("not asked"));

        const [page, profile] = yield* Effect.forEach(
          [onLinkedInPage, onLinkedInProfile],
          (channelId) =>
            client.capabilities.channel({ params: { channelId, workspaceId } })
        );

        assert.deepStrictEqual(page?.capabilities.analytics, { perPost: true });
        assert.deepStrictEqual(
          page?.capabilities.lookups.map(({ name }) => name),
          ["linkedinOrganizations"]
        );
        assert.deepStrictEqual(profile?.capabilities.analytics, {
          perPost: false,
        });
        assert.deepStrictEqual(profile?.capabilities.lookups, []);
        // The options are the platform's, whichever way in.
        assert.deepStrictEqual(
          profile?.capabilities.options,
          page?.capabilities.options
        );
      })
  );

  it.effect("knows only the workspace's channels", () =>
    Effect.gen(function* unknown() {
      const client = yield* clientWith(viewer);

      const errors = yield* Effect.forEach(
        ["01900000-0000-7000-8000-0000000000c9", "not-an-id"],
        (channelId) =>
          client.capabilities
            .channel({ params: { channelId, workspaceId } })
            .pipe(Effect.flip)
      );

      assert.instanceOf(errors[0], ChannelNotFound);
      assert.instanceOf(errors[1], ChannelNotFound);
    })
  );

  it.effect("refuses a member who may not read channels", () =>
    Effect.gen(function* refused() {
      const client = yield* clientWith(stranger);

      const error = yield* client.capabilities
        .channel({ params: { channelId: onTikTok, workspaceId } })
        .pipe(Effect.flip);

      assert.instanceOf(error, Forbidden);
    })
  );
});

const orNull = <A>(value: A | undefined): A | null => value ?? null;

// A file type's limits as the capabilities show them, from the contract's.
// A type's kind, from its name: what is neither an image nor a video is a
// document.
const kindOfType = (contentType: MediaContentType) => {
  if (contentType.startsWith("image/")) {
    return "image" as const;
  }

  return contentType.startsWith("video/")
    ? ("video" as const)
    : ("document" as const);
};

const formatOf = (
  contentType: MediaContentType,
  limits: ContractText.FormatLimits
) => ({
  contentType,
  kind: kindOfType(contentType),
  maxAspectRatio: orNull(limits.aspectRatio?.maximum),
  maxByteSize: orNull(limits.maxByteSize),
  maxDurationMs: orNull(limits.maxDurationMs),
  maxMediaWith: orNull(limits.maxMediaWith),
  maxPixels: orNull(limits.maxPixels),
  maxSide: orNull(limits.sideRange?.maximum),
  minAspectRatio: orNull(limits.aspectRatio?.minimum),
  minByteSize: orNull(limits.minByteSize),
  minDurationMs: orNull(limits.minDurationMs),
  minSide: orNull(limits.sideRange?.minimum),
});

// Clients that count with `peal-contract/post-text` and clients that read
// the capabilities must see the same figures.
describe("the capabilities and the contract's copy of the rules", () => {
  const views = platforms.map((platform) =>
    platformCapabilitiesView(capabilitiesOf(platform, false))
  );

  it("carry the same version, and decode as the contract says", () => {
    assert.strictEqual(contractVersion, capabilitiesVersion);
    assert.deepStrictEqual(PlatformSchema.literals, platforms);

    for (const view of views) {
      assert.deepStrictEqual(
        Schema.decodeUnknownSync(PlatformCapabilitiesSchema)(
          Schema.encodeSync(PlatformCapabilitiesSchema)(view)
        ),
        view
      );
    }
  });

  it("give the text limits the contract's rules give, then Peal's own", () => {
    for (const view of views) {
      const rules = ContractText.platformRules[view.platform];

      assert.deepStrictEqual(view.text, {
        forbiddenCharacters: rules.forbiddenCharacters ?? [],
        limits: [
          ...rules.textLimits,
          { maximum: ContractText.maxPostTextLength, unit: "utf16Units" },
        ],
        maxHashtags: rules.maxHashtags ?? null,
        maxLinks: rules.maxLinks ?? null,
        maxMentions: rules.maxMentions ?? null,
      });
    }
  });

  it("give the media rules the contract's rules give, within Peal's own", () => {
    for (const view of views) {
      const rules = ContractText.platformRules[view.platform];

      assert.deepStrictEqual(
        { ...view.media, formats: view.media.formats?.length ?? null },
        {
          altText: {
            maxLength: Math.min(
              rules.media?.maxAltTextLength ?? ContractText.maxAltTextLength,
              ContractText.maxAltTextLength
            ),
            shown: rules.media?.showsAltText ?? null,
          },
          formats:
            rules.media === undefined
              ? null
              : Object.keys(rules.media.formats).length,
          maxCount: Math.min(
            rules.maxMedia ?? ContractText.maxMediaPerPost,
            ContractText.maxMediaPerPost
          ),
          maxVideos: rules.media?.maxVideos ?? null,
          mixesKinds: rules.media?.mixesKinds ?? null,
          required: rules.mediaRequired,
        }
      );
    }
  });

  it("give each file type the limits the contract's rules give", () => {
    for (const view of views) {
      const formats = ContractText.platformRules[view.platform].media?.formats;

      assert.deepStrictEqual(
        view.media.formats,
        formats === undefined
          ? null
          : MediaContentTypeSchema.literals.flatMap((contentType) =>
              Option.match(Option.fromUndefinedOr(formats[contentType]), {
                onNone: () => [],
                onSome: (limits) => [formatOf(contentType, limits)],
              })
            )
      );
    }
  });

  it("describe the fields the contract's options have, and no other", () => {
    assert.deepStrictEqual(
      views.flatMap(({ options, platform }) =>
        options.fields.length > 0 ? [platform] : []
      ),
      [...contractOptionsPlatforms]
    );

    for (const options of ContractOptionsSchema.members) {
      const { literal: platform } = options.fields.platform;
      const view = views.find((described) => described.platform === platform);

      assert.deepStrictEqual(
        view?.options.fields.map(({ name }) => name),
        Object.keys(options.fields)
          .filter((name) => name !== "platform")
          .toSorted()
      );
    }
  });
});
