import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Layer, Option, Ref, Schema } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import {
  Api,
  ChannelCannotPost,
  ChannelNotFound,
  Forbidden,
  LookupInputInvalid,
  LookupInputSchema as ContractInputSchema,
  LookupNameSchema as ContractNameSchema,
  LookupNotFound,
  maxLookupPageSize as contractMaxPageSize,
  PlatformRateLimited,
  PlatformUnreachable,
} from "peal-contract";
import type { Member } from "peal-contract";

import { LookupsHandlers } from "#publishing/api/lookups.ts";
import { ChannelConnections } from "#publishing/application/channel-connections.ts";
import { ChannelLookups } from "#publishing/application/channel-lookups.ts";
import { LookupInputRejected } from "#publishing/application/lookup-input-rejected.ts";
import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import type { LookupFailure } from "#publishing/application/platform-lookups.ts";
import { WorkspaceChannels } from "#publishing/application/workspace-channels.ts";
import {
  lookupNames,
  lookups,
  maxLookupPageSize,
} from "#publishing/domain/lookup.ts";
import type { LookupQuery, LookupResult } from "#publishing/domain/lookup.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import { TikTokCreator } from "#publishing/domain/tiktok-creator.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { memberOf } from "#test/channels/support.ts";
import { securityTest } from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const workspaceId = WorkspaceIdSchema.make(
  "3f1d2c4b-5a69-4788-9a0b-1c2d3e4f5a6b"
);

const onYouTube = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1");

const onTikTok = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c2");

const onMastodon = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c3");

const onLinkedInPage = ChannelIdSchema.make(
  "01900000-0000-7000-8000-0000000000e5"
);

const onLinkedInProfile = ChannelIdSchema.make(
  "01900000-0000-7000-8000-0000000000e6"
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

const onPinterest = ChannelIdSchema.make(
  "01900000-0000-7000-8000-0000000000c4"
);

const creator = new TikTokCreator({
  avatarUrl: Option.none(),
  commentDisabled: false,
  duetDisabled: true,
  maxVideoDuration: Option.some(Duration.minutes(10)),
  nickname: "Peal Example",
  privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  stitchDisabled: false,
  username: "peal_example",
});

const answers = {
  linkedinOrganizations: {
    _tag: "linkedinOrganizations",
    items: [
      {
        name: "Example Bakery",
        urn: "urn:li:organization:2414183",
        vanityName: Option.some("example-bakery"),
      },
    ],
    nextCursor: Option.none(),
  },
  pinterestBoardSections: {
    _tag: "pinterestBoardSections",
    items: [{ id: "5000000000001", name: "Salads" }],
    nextCursor: Option.none(),
  },
  pinterestBoards: {
    _tag: "pinterestBoards",
    items: [
      {
        id: "549755885001",
        name: "Summer recipes",
        privacy: Option.some("PUBLIC"),
      },
      { id: "549755885002", name: "Drafts", privacy: Option.none() },
    ],
    nextCursor: Option.some("page-2"),
  },
  tiktokCreator: {
    _tag: "tiktokCreator",
    items: [{ posting: { _tag: "ready", creator }, takesPhotos: false }],
    nextCursor: Option.none(),
  },
  youtubePlaylists: {
    _tag: "youtubePlaylists",
    items: [
      {
        id: "PLsynthetic01",
        privacy: Option.some("public"),
        title: "Launches",
      },
      { id: "PLsynthetic02", privacy: Option.none(), title: "Field notes" },
    ],
    nextCursor: Option.some("page-2"),
  },
  youtubeVideoCategories: {
    _tag: "youtubeVideoCategories",
    items: [{ id: "22", title: "People & Blogs" }],
    nextCursor: Option.none(),
  },
} satisfies { readonly [Tag in LookupQuery["_tag"]]: LookupResult };

// The endpoints over the workspace's three channels, the platforms
// answering every lookup, or failing with `failure`; `asked` keeps the
// queries that reached them.
const clientWith = Effect.fn("test.lookupsClient")(function* clientWith(
  member: Member,
  failure?: LookupFailure
) {
  const asked = yield* Ref.make<readonly LookupQuery[]>([]);

  const client = yield* HttpApiTest.groups(Api, ["lookups"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        LookupsHandlers.pipe(
          Layer.provide(
            ChannelLookups.layer.pipe(
              Layer.provide(
                Layer.mergeAll(
                  Layer.succeed(
                    PlatformLookups,
                    PlatformLookups.of({
                      run: (_channelId, query) =>
                        Ref.update(asked, (before) => [...before, query]).pipe(
                          Effect.andThen(
                            failure === undefined
                              ? Effect.succeed(answers[query._tag])
                              : Effect.fail(failure)
                          )
                        ),
                    })
                  ),
                  Layer.succeed(
                    WorkspaceChannels,
                    WorkspaceChannels.of({
                      lookUp: (_actor, ids) =>
                        Effect.succeed(
                          [
                            {
                              channelId: onYouTube,
                              platform: "youtube" as const,
                            },
                            {
                              channelId: onTikTok,
                              platform: "tiktok" as const,
                            },
                            {
                              channelId: onMastodon,
                              platform: "mastodon" as const,
                            },
                            {
                              channelId: onPinterest,
                              platform: "pinterest" as const,
                            },
                            {
                              channelId: onLinkedInPage,
                              platform: "linkedin" as const,
                            },
                            {
                              channelId: onLinkedInProfile,
                              platform: "linkedin" as const,
                            },
                          ].filter(({ channelId }) => ids.includes(channelId))
                        ),
                    })
                  ),
                  connections
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

  return { asked: Ref.get(asked), client };
});

const viewer = memberOf(workspaceId, permissionsFor("viewer"));

const stranger = memberOf(workspaceId, []);

const youtube = { channelId: onYouTube, workspaceId };

describe("a channel's lookups endpoint", () => {
  it.effect("lists the lookups its platform has, and what each takes", () =>
    Effect.gen(function* listed() {
      const { client } = yield* clientWith(viewer);

      const described = yield* client.lookups.list({ params: youtube });

      assert.deepStrictEqual(
        described.map(({ fills, input, name, paged, platform }) => ({
          fills,
          input: input.map((field) => field.name),
          name,
          paged,
          platform,
        })),
        [
          {
            fills: ["categoryId"],
            input: ["language", "regionCode"],
            name: "youtubeVideoCategories",
            paged: false,
            platform: "youtube",
          },
          {
            fills: [],
            input: ["cursor", "limit"],
            name: "youtubePlaylists",
            paged: true,
            platform: "youtube",
          },
        ]
      );

      assert.deepStrictEqual(
        yield* client.lookups.list({
          params: { channelId: onMastodon, workspaceId },
        }),
        []
      );
    })
  );

  it.effect(
    "knows only the workspace's channels, for those who read them",
    () =>
      Effect.gen(function* guarded() {
        const { client } = yield* clientWith(viewer);
        const outside = yield* clientWith(stranger);

        const unknown = yield* client.lookups
          .list({ params: { channelId: "not-an-id", workspaceId } })
          .pipe(Effect.flip);

        const refused = yield* outside.client.lookups
          .list({ params: youtube })
          .pipe(Effect.flip);

        assert.instanceOf(unknown, ChannelNotFound);
        assert.instanceOf(refused, Forbidden);
      })
  );
});

describe("running a channel's lookup", () => {
  it.effect("answers a page of items, tagged by the lookup", () =>
    Effect.gen(function* ran() {
      const { asked, client } = yield* clientWith(viewer);

      const categories = yield* client.lookups.run({
        params: { ...youtube, name: "youtubeVideoCategories" },
        payload: { regionCode: "FR" },
      });

      const playlists = yield* client.lookups.run({
        params: { ...youtube, name: "youtubePlaylists" },
        payload: {},
      });

      assert.deepStrictEqual(categories, {
        _tag: "youtubeVideoCategories",
        items: [{ id: "22", title: "People & Blogs" }],
        nextCursor: null,
      });
      assert.deepStrictEqual(playlists, {
        _tag: "youtubePlaylists",
        items: [
          { id: "PLsynthetic01", privacy: "public", title: "Launches" },
          { id: "PLsynthetic02", privacy: null, title: "Field notes" },
        ],
        nextCursor: "page-2",
      });
      assert.deepStrictEqual(yield* asked, [
        {
          _tag: "youtubeVideoCategories",
          language: Option.none(),
          regionCode: "FR",
        },
        { _tag: "youtubePlaylists", cursor: Option.none(), limit: 25 },
      ]);
    })
  );

  it.effect(
    "answers a TikTok creator as the existing endpoint shows them",
    () =>
      Effect.gen(function* tiktokCreator() {
        const { client } = yield* clientWith(viewer);

        const result = yield* client.lookups.run({
          params: { channelId: onTikTok, name: "tiktokCreator", workspaceId },
          payload: {},
        });

        assert.deepStrictEqual(result, {
          _tag: "tiktokCreator",
          items: [
            {
              posting: {
                _tag: "ready",
                creator: {
                  avatarUrl: null,
                  commentDisabled: false,
                  duetDisabled: true,
                  maxVideoDurationMs: 600_000,
                  nickname: "Peal Example",
                  privacyLevels: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
                  stitchDisabled: false,
                  username: "peal_example",
                },
              },
              takesPhotos: false,
            },
          ],
          nextCursor: null,
        });
      })
  );

  it.effect(
    "answers a Pinterest account's boards, and a board's sections",
    () =>
      Effect.gen(function* pinterest() {
        const { asked, client } = yield* clientWith(viewer);
        const params = { channelId: onPinterest, workspaceId };

        const described = yield* client.lookups.list({ params });

        const boards = yield* client.lookups.run({
          params: { ...params, name: "pinterestBoards" },
          payload: { limit: 2 },
        });

        const sections = yield* client.lookups.run({
          params: { ...params, name: "pinterestBoardSections" },
          payload: { boardId: "549755885001" },
        });

        assert.deepStrictEqual(
          described.map(({ fills, input, name }) => ({
            fills,
            input: input.map((field) => [field.name, field.required]),
            name,
          })),
          [
            {
              fills: ["boardId"],
              input: [
                ["cursor", false],
                ["limit", false],
              ],
              name: "pinterestBoards",
            },
            {
              fills: ["boardSectionId"],
              input: [
                ["boardId", true],
                ["cursor", false],
                ["limit", false],
              ],
              name: "pinterestBoardSections",
            },
          ]
        );
        assert.deepStrictEqual(boards, {
          _tag: "pinterestBoards",
          items: [
            { id: "549755885001", name: "Summer recipes", privacy: "PUBLIC" },
            { id: "549755885002", name: "Drafts", privacy: null },
          ],
          nextCursor: "page-2",
        });
        assert.deepStrictEqual(sections, {
          _tag: "pinterestBoardSections",
          items: [{ id: "5000000000001", name: "Salads" }],
          nextCursor: null,
        });
        assert.deepStrictEqual(yield* asked, [
          { _tag: "pinterestBoards", cursor: Option.none(), limit: 2 },
          {
            _tag: "pinterestBoardSections",
            boardId: "549755885001",
            cursor: Option.none(),
            limit: 25,
          },
        ]);
      })
  );

  it.effect("refuses a board's sections asked without the board, unasked", () =>
    Effect.gen(function* withoutBoard() {
      const { asked, client } = yield* clientWith(viewer);

      const errors = yield* Effect.forEach(
        [{}, { boardId: "not-digits" }],
        (payload) =>
          client.lookups
            .run({
              params: {
                channelId: onPinterest,
                name: "pinterestBoardSections",
                workspaceId,
              },
              payload,
            })
            .pipe(Effect.flip)
      );

      // The contract refuses an id that is not digits before the handler.
      assert.instanceOf(errors[0], LookupInputInvalid);
      assert.lengthOf(errors, 2);
      assert.deepStrictEqual(yield* asked, []);
    })
  );

  it.effect(
    "has the lookup of pages to mention on a LinkedIn company page, which needs the page's name",
    () =>
      Effect.gen(function* page() {
        const { asked, client } = yield* clientWith(viewer);
        const params = { channelId: onLinkedInPage, workspaceId };
        const [described] = yield* client.lookups.list({ params });

        assert.strictEqual(described?.name, "linkedinOrganizations");
        assert.deepStrictEqual(described?.fills, ["mentions"]);
        assert.deepStrictEqual(
          described?.input.map(({ name, required }) => [name, required]),
          [["vanityName", true]]
        );

        const found = yield* client.lookups.run({
          params: { ...params, name: "linkedinOrganizations" },
          payload: { vanityName: "example-bakery" },
        });

        assert.strictEqual(found._tag, "linkedinOrganizations");
        assert.deepStrictEqual(yield* asked, [
          { _tag: "linkedinOrganizations", vanityName: "example-bakery" },
        ]);
      })
  );

  it.effect(
    "has no lookup on a LinkedIn profile, whose token reads no page",
    () =>
      Effect.gen(function* profile() {
        const { asked, client } = yield* clientWith(viewer);
        const params = { channelId: onLinkedInProfile, workspaceId };

        assert.deepStrictEqual(yield* client.lookups.list({ params }), []);

        const refused = yield* client.lookups
          .run({
            params: { ...params, name: "linkedinOrganizations" },
            payload: { vanityName: "example-bakery" },
          })
          .pipe(Effect.flip);

        assert.instanceOf(refused, LookupNotFound);
        assert.deepStrictEqual(yield* asked, []);
      })
  );

  it.effect("refuses a lookup the channel's platform has not, unasked", () =>
    Effect.gen(function* notFound() {
      const { asked, client } = yield* clientWith(viewer);

      const errors = yield* Effect.forEach(
        [
          { channelId: onTikTok, name: "youtubePlaylists" },
          { channelId: onYouTube, name: "boards" },
          { channelId: onMastodon, name: "tiktokCreator" },
        ],
        (params) =>
          client.lookups
            .run({ params: { ...params, workspaceId }, payload: {} })
            .pipe(Effect.flip)
      );

      assert.deepStrictEqual(
        errors.map((error) => error instanceof LookupNotFound),
        [true, true, true]
      );
      assert.deepStrictEqual(yield* asked, []);
    })
  );

  it.effect("refuses an input the lookup does not take, unasked", () =>
    Effect.gen(function* invalid() {
      const { asked, client } = yield* clientWith(viewer);

      const stray = yield* client.lookups
        .run({
          params: { ...youtube, name: "youtubePlaylists" },
          payload: { regionCode: "FR" },
        })
        .pipe(Effect.flip);

      const creatorPaged = yield* client.lookups
        .run({
          params: { channelId: onTikTok, name: "tiktokCreator", workspaceId },
          payload: { limit: 5 },
        })
        .pipe(Effect.flip);

      assert.instanceOf(stray, LookupInputInvalid);
      assert.instanceOf(creatorPaged, LookupInputInvalid);
      assert.deepStrictEqual(yield* asked, []);
    })
  );

  it.effect("tells why the platform gave no answer", () =>
    Effect.gen(function* failures() {
      const errors = yield* Effect.forEach(
        [
          new PlatformUnavailable(),
          new RateLimited({ retryAfter: Duration.millis(29_001) }),
          new RateLimited({}),
          new TokenExpired(),
          new BadRequest({ code: ownRefusalCodes.channelDisabled }),
          new BadRequest({ code: ownRefusalCodes.channelDisconnected }),
          new LookupInputRejected(),
        ],
        (failure) =>
          clientWith(viewer, failure).pipe(
            Effect.flatMap(({ client }) =>
              client.lookups.run({
                params: { ...youtube, name: "youtubePlaylists" },
                payload: {},
              })
            ),
            Effect.flip
          )
      );

      assert.deepStrictEqual(errors, [
        new PlatformUnreachable(),
        new PlatformRateLimited({ retryAfterSeconds: 30 }),
        new PlatformRateLimited({ retryAfterSeconds: null }),
        new ChannelCannotPost({ reason: "reconnect" }),
        new ChannelCannotPost({ reason: "disabled" }),
        new ChannelNotFound(),
        new LookupInputInvalid(),
      ]);
    })
  );

  it.effect("needs channel:read", () =>
    Effect.gen(function* refused() {
      const { asked, client } = yield* clientWith(stranger);

      const error = yield* client.lookups
        .run({
          params: { ...youtube, name: "youtubePlaylists" },
          payload: {},
        })
        .pipe(Effect.flip);

      assert.instanceOf(error, Forbidden);
      assert.deepStrictEqual(yield* asked, []);
    })
  );
});

const jsonSchemaOf = (schema: Schema.Top) =>
  Schema.toJsonSchemaDocument(schema).schema;

// The contract's one input struct holds every field any lookup takes, as
// the lookup's own schema reads it.
describe("the lookups and the contract's copy", () => {
  it("have the same names and page size", () => {
    assert.deepStrictEqual(ContractNameSchema.literals, lookupNames);
    assert.strictEqual(contractMaxPageSize, maxLookupPageSize);
  });

  it("take the same input, field by field", () => {
    const fields = lookupNames.flatMap((name) =>
      Object.entries(lookups[name].input.fields)
    );

    assert.deepStrictEqual(
      [...new Set(fields.map(([name]) => name))].toSorted(),
      Object.keys(ContractInputSchema.fields).toSorted()
    );

    const contractFields: Readonly<Record<string, Schema.Top>> =
      ContractInputSchema.fields;

    for (const [name, schema] of fields) {
      assert.deepStrictEqual(
        jsonSchemaOf(Schema.Struct({ [name]: schema })),
        jsonSchemaOf(
          Schema.Struct({ [name]: contractFields[name] ?? Schema.Never })
        )
      );
    }
  });
});
