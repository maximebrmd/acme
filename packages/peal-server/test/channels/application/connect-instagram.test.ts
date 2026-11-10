import { assert, layer } from "@effect/vitest";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
} from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { ConnectOutcome } from "#channels/application/connect-channel.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { instagramAuthorizer } from "#channels/infrastructure/platforms/meta/instagram-authorizer.ts";
import { instagramLoginAuthorizer } from "#channels/infrastructure/platforms/meta/instagram-login-authorizer.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { InstagramConnection } from "#shared/domain/instagram-connection.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";
import {
  authorizersOf,
  connectChannelWith,
  connectedChannel,
  testPublicUrl,
} from "#test/channels/connect-support.ts";
import {
  fakeInstagram,
  instagramAccount,
  instagramPermissions,
} from "#test/channels/fakes/fake-instagram.ts";
import {
  fakeMeta,
  instagramApp,
  metaApp,
} from "#test/channels/fakes/fake-meta.ts";
import {
  actorIn,
  freshChannel,
  freshWorkspace,
  OpenOutboundGuard,
  RecordedNotices,
  syntheticCredentials,
} from "#test/channels/support.ts";

// One fake Instagram and one fake Facebook for each block.
class Fakes extends Context.Service<
  Fakes,
  {
    readonly instagram: Effect.Success<ReturnType<typeof fakeInstagram>>;
    readonly meta: Effect.Success<ReturnType<typeof fakeMeta>>;
  }
>()("peal-server/test/channels/InstagramFakes") {}

const fakesWith = (options: { readonly flatGrant?: boolean }) =>
  Layer.effect(
    Fakes,
    Effect.all({ instagram: fakeInstagram(options), meta: fakeMeta() })
  );

// Instagram's two ways in as the server builds them, Instagram Login
// first, or only the ones given.
const authorizersWith = (ways: readonly InstagramConnection[]) =>
  Layer.effect(
    PlatformAuthorizers,
    Effect.gen(function* InstagramAuthorizersTest() {
      const { instagram, meta } = yield* Fakes;
      const http = yield* publicHttpClient;
      const hosts = instagram.hostsOver(meta.hosts);

      const options = (app: typeof metaApp) => ({
        app,
        hosts,
        http,
        publicUrl: testPublicUrl,
      });

      return authorizersOf(
        ...(yield* Effect.all(
          ways.map((way) =>
            way === "instagramLogin"
              ? instagramLoginAuthorizer(options(instagramApp))
              : instagramAuthorizer(options(metaApp))
          )
        ))
      );
    })
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        FetchHttpClient.layer,
        OpenOutboundGuard,
        Mac.layerWebCrypto
      ).pipe(Layer.provideMerge(SecureRandom.layerWebCrypto))
    )
  );

const connectTest = (
  ways: readonly InstagramConnection[],
  options: {
    readonly entitlements?: Parameters<typeof connectChannelWith>[1];
    readonly flatGrant?: boolean;
  } = {}
) =>
  RefreshChannelTokens.layer.pipe(
    Layer.provideMerge(
      connectChannelWith(authorizersWith(ways), options.entitlements)
    ),
    Layer.provideMerge(RecordedNotices.layer),
    Layer.provideMerge(fakesWith(options))
  );

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

const callbackOf = (back: {
  readonly code?: string;
  readonly error?: string;
  readonly state: string;
}): AuthorizationCallback => ({
  code: Option.fromUndefinedOr(back.code),
  error: Option.fromUndefinedOr(back.error),
  issuer: Option.none(),
  state: back.state,
});

const request = (connection: Option.Option<InstagramConnection>) => ({
  connection,
  handle: Option.none(),
  instance: Option.none(),
});

// Signs in through Instagram Login as the member would, and completes.
const signIn = Effect.fn("signIn")(function* signIn(
  workspaceId: WorkspaceId,
  connection: Option.Option<InstagramConnection> = Option.none()
) {
  const { instagram, meta } = yield* Fakes;
  const connect = yield* ConnectChannel;

  const authorizationUrl = yield* connect.start(
    manager(workspaceId),
    "instagram",
    request(connection)
  );

  const back = Option.contains(connection, "facebookLogin")
    ? meta.approve(authorizationUrl)
    : instagram.approve(authorizationUrl);

  return yield* connect.complete(
    manager(workspaceId),
    "instagram",
    callbackOf(back)
  );
});

const choiceOf = (outcome: ConnectOutcome) =>
  outcome._tag === "choose"
    ? Effect.succeed(outcome)
    : Effect.die(new Error("Expected a choice of accounts"));

const Row = Schema.Struct({ grantedBy: Schema.NullOr(Schema.String) });

const grantorOf = (channel: Channel) =>
  SqlClient.SqlClient.use((sql) =>
    sql`SELECT granted_by AS "grantedBy" FROM channels.channels WHERE id = ${channel.id}`.pipe(
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Row))),
      Effect.map(([row]) => row?.grantedBy ?? null)
    )
  );

const tokenOf = Effect.fn("tokenOf")(function* tokenOf(channel: Channel) {
  const stored = yield* ChannelRepository.use((channels) =>
    channels.credentials(channel.id)
  );

  assert(Option.isSome(stored));

  return Redacted.value(
    yield* TokenCipher.use((cipher) =>
      cipher.decrypt(stored.value.accessToken, channel.id)
    )
  );
});

layer(connectTest(["instagramLogin", "facebookLogin"]))(
  "connecting Instagram through Instagram Login",
  (it) => {
    it.effect(
      "sends the member to Instagram's sign-in by default, for publishing and insights",
      () =>
        Effect.gen(function* authorize() {
          const { instagram } = yield* Fakes;
          const workspaceId = yield* freshWorkspace;

          const authorizationUrl = yield* ConnectChannel.use((connect) =>
            connect.start(
              manager(workspaceId),
              "instagram",
              request(Option.none())
            )
          );

          const url = new URL(authorizationUrl);

          assert.strictEqual(url.origin, instagram.url);
          assert.strictEqual(url.pathname, "/oauth/authorize");
          assert.strictEqual(
            url.searchParams.get("client_id"),
            instagramApp.appId
          );
          assert.strictEqual(url.searchParams.get("response_type"), "code");
          assert.strictEqual(url.searchParams.get("force_reauth"), "true");
          assert.strictEqual(
            url.searchParams.get("scope"),
            instagramPermissions.join(",")
          );
          assert.strictEqual(
            url.searchParams.get("redirect_uri"),
            "https://peal.test/connect/instagram/callback"
          );
          assert.isNotEmpty(url.searchParams.get("state"));
        })
    );

    it.effect(
      "connects the professional account with a 60-day token that renews itself",
      () =>
        Effect.gen(function* connects() {
          const workspaceId = yield* freshWorkspace;
          const now = yield* DateTime.now;

          const channel = yield* signIn(workspaceId).pipe(
            Effect.flatMap(connectedChannel)
          );

          assert.strictEqual(channel.platform, "instagram");
          assert.deepStrictEqual(
            channel.connection,
            Option.some("instagramLogin")
          );
          assert.strictEqual(channel.accountId, instagramAccount.user_id);
          assert.strictEqual(channel.handle, "@studio_example");
          assert.deepStrictEqual(
            channel.displayName,
            Option.some("Studio Example")
          );
          assert.deepStrictEqual(
            channel.avatarUrl.pipe(Option.map(String)),
            Option.some(instagramAccount.profile_picture_url)
          );
          assert.deepStrictEqual(channel.scopes, [...instagramPermissions]);
          assert.deepStrictEqual(channel.token, {
            _tag: "refreshable",
            expiresAt: DateTime.addDuration(now, Duration.seconds(5_183_944)),
          });
          assert.match(yield* tokenOf(channel), /^ig-long-/u);
          // The app-scoped id, which a data deletion request may name.
          assert.strictEqual(yield* grantorOf(channel), instagramAccount.id);

          const listed = yield* ChannelRepository.use((channels) =>
            channels.findById(workspaceId, channel.id)
          );

          assert.deepStrictEqual(listed, Option.some(channel));
        })
    );

    it.effect("connects without insights when the member declines them", () =>
      Effect.gen(function* noInsights() {
        const { instagram } = yield* Fakes;
        const workspaceId = yield* freshWorkspace;

        instagram.setGranted([
          "instagram_business_basic",
          "instagram_business_content_publish",
        ]);

        const channel = yield* signIn(workspaceId).pipe(
          Effect.flatMap(connectedChannel),
          Effect.ensuring(
            Effect.sync(() => {
              instagram.setGranted(instagramPermissions);
            })
          )
        );

        assert.deepStrictEqual(channel.scopes, [
          "instagram_business_basic",
          "instagram_business_content_publish",
        ]);
      })
    );

    it.effect("takes declining publishing as the member refusing", () =>
      Effect.gen(function* declined() {
        const { instagram } = yield* Fakes;
        const workspaceId = yield* freshWorkspace;

        instagram.setGranted(["instagram_business_basic"]);

        const failure = yield* Effect.flip(signIn(workspaceId)).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              instagram.setGranted(instagramPermissions);
            })
          )
        );

        assert.strictEqual(failure._tag, "AuthorizationDenied");
        assert.lengthOf(
          yield* ChannelRepository.use((channels) =>
            channels.list(workspaceId)
          ),
          0
        );
      })
    );

    it.effect("connects nothing when the member cancels on Instagram", () =>
      Effect.gen(function* cancelled() {
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        const authorizationUrl = yield* connect.start(
          manager(workspaceId),
          "instagram",
          request(Option.none())
        );

        const failure = yield* Effect.flip(
          connect.complete(
            manager(workspaceId),
            "instagram",
            callbackOf({
              error: "access_denied",
              state: new URL(authorizationUrl).searchParams.get("state") ?? "",
            })
          )
        );

        assert.strictEqual(failure._tag, "AuthorizationDenied");
      })
    );

    it.effect("still connects through a Facebook Page when asked to", () =>
      Effect.gen(function* viaPage() {
        const { meta } = yield* Fakes;
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        meta.setPages([
          {
            id: "901",
            instagram: { id: "17841400000000901", username: "page_example" },
            name: "Synthetic Page 901",
          },
          {
            id: "902",
            instagram: { id: "17841400000000902", username: "other_example" },
            name: "Synthetic Page 902",
          },
        ]);

        const authorizationUrl = yield* connect.start(
          manager(workspaceId),
          "instagram",
          request(Option.some("facebookLogin"))
        );

        assert.strictEqual(
          new URL(authorizationUrl).pathname,
          "/v27.0/dialog/oauth"
        );

        const offered = yield* connect
          .complete(
            manager(workspaceId),
            "instagram",
            callbackOf(meta.approve(authorizationUrl))
          )
          .pipe(Effect.flatMap(choiceOf));

        const [channel] = yield* connect.choose(
          manager(workspaceId),
          "instagram",
          { accountIds: ["17841400000000902"], selection: offered.selection }
        );

        assert.deepStrictEqual(
          channel?.connection,
          Option.some("facebookLogin")
        );
        assert.strictEqual(channel?.token._tag, "nonExpiring");
      })
    );

    it.effect(
      "moves a Page's Instagram channel to Instagram Login when its account signs in there",
      () =>
        Effect.gen(function* moves() {
          const { meta } = yield* Fakes;
          const workspaceId = yield* freshWorkspace;

          meta.setPages([
            {
              id: "903",
              instagram: {
                id: instagramAccount.user_id,
                username: "studio_example",
              },
              name: "Synthetic Page 903",
            },
          ]);

          const viaPage = yield* signIn(
            workspaceId,
            Option.some("facebookLogin")
          ).pipe(Effect.flatMap(connectedChannel));

          const direct = yield* signIn(workspaceId).pipe(
            Effect.flatMap(connectedChannel)
          );

          assert.strictEqual(direct.id, viaPage.id);
          assert.deepStrictEqual(
            direct.connection,
            Option.some("instagramLogin")
          );
          assert.strictEqual(direct.token._tag, "refreshable");
          assert.strictEqual(yield* grantorOf(direct), instagramAccount.id);
          assert.lengthOf(
            yield* ChannelRepository.use((channels) =>
              channels.list(workspaceId)
            ),
            1
          );
        })
    );

    it.effect("reconnects an Instagram Login channel through Instagram", () =>
      Effect.gen(function* reconnects() {
        const { instagram } = yield* Fakes;
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        const channel = yield* signIn(workspaceId).pipe(
          Effect.flatMap(connectedChannel)
        );

        const first = yield* tokenOf(channel);

        const authorizationUrl = yield* connect.reconnect(
          manager(workspaceId),
          channel.id
        );

        assert.strictEqual(new URL(authorizationUrl).origin, instagram.url);

        const reconnected = yield* connect
          .complete(
            manager(workspaceId),
            "instagram",
            callbackOf(instagram.approve(authorizationUrl))
          )
          .pipe(Effect.flatMap(connectedChannel));

        assert.strictEqual(reconnected.id, channel.id);
        assert.notStrictEqual(yield* tokenOf(reconnected), first);
      })
    );

    it.effect(
      "renews the token a week before it expires, keeping its grant",
      () =>
        Effect.gen(function* renews() {
          const { instagram } = yield* Fakes;
          const workspaceId = yield* freshWorkspace;
          const refresh = yield* RefreshChannelTokens;

          const channel = yield* signIn(workspaceId).pipe(
            Effect.flatMap(connectedChannel)
          );

          const issued = yield* tokenOf(channel);

          // A token renews once a day old; the sweep waits for its last
          // week.
          assert.strictEqual(yield* refresh.refresh(channel.id), "skipped");

          yield* TestClock.adjust(Duration.days(52));

          assert.strictEqual(yield* refresh.refresh(channel.id), "skipped");

          yield* TestClock.adjust(Duration.days(2));

          assert.strictEqual(yield* refresh.refresh(channel.id), "refreshed");

          const renewed = yield* tokenOf(channel);

          assert.match(renewed, /^ig-refreshed-/u);
          assert.strictEqual(yield* grantorOf(channel), instagramAccount.id);

          const refreshCall = instagram
            .requests()
            .findLast(({ path }) => path === "/refresh_access_token");

          assert.strictEqual(refreshCall?.query.get("access_token"), issued);
          assert.strictEqual(
            refreshCall?.query.get("grant_type"),
            "ig_refresh_token"
          );

          const stored = yield* ChannelRepository.use((channels) =>
            channels.get(channel.id)
          );

          assert(Option.isSome(stored));
          assert.deepStrictEqual(stored.value.token, {
            _tag: "refreshable",
            expiresAt: DateTime.addDuration(
              yield* DateTime.now,
              Duration.seconds(5_183_944)
            ),
          });
          assert.deepStrictEqual(stored.value.scopes, channel.scopes);
        })
    );

    it.effect(
      "asks to reconnect an account whose token Instagram stopped taking",
      () =>
        Effect.gen(function* revoked() {
          const { instagram } = yield* Fakes;
          const workspaceId = yield* freshWorkspace;
          const refresh = yield* RefreshChannelTokens;

          const channel = yield* signIn(workspaceId).pipe(
            Effect.flatMap(connectedChannel)
          );

          instagram.revoke(yield* tokenOf(channel));

          yield* TestClock.adjust(Duration.days(54));

          assert.strictEqual(
            yield* refresh.refresh(channel.id),
            "reconnectRequired"
          );

          const notices = yield* RecordedNotices.use((recorded) =>
            recorded.of(workspaceId)
          );

          assert.deepStrictEqual(
            notices.map(({ channelId, kind }) => ({ channelId, kind })),
            [{ channelId: channel.id, kind: "reconnectRequired" }]
          );
        })
    );

    it.effect("lists both ways in, Instagram Login first", () =>
      Effect.gen(function* connectable() {
        const workspaceId = yield* freshWorkspace;

        const reachable = yield* ConnectChannel.use((connect) =>
          connect.connectable(manager(workspaceId))
        );

        assert.deepStrictEqual(reachable, {
          instagramConnections: ["instagramLogin", "facebookLogin"],
          linkedinConnections: [],
          platforms: ["instagram"],
        });
      })
    );
  }
);

layer(connectTest(["instagramLogin"], { flatGrant: true }))(
  "a server with Instagram Login only",
  (it) => {
    it.effect("reads a code exchange answered flat", () =>
      Effect.gen(function* flat() {
        const workspaceId = yield* freshWorkspace;

        const channel = yield* signIn(workspaceId).pipe(
          Effect.flatMap(connectedChannel)
        );

        assert.strictEqual(channel.accountId, instagramAccount.user_id);
        assert.deepStrictEqual(channel.scopes, [...instagramPermissions]);
      })
    );

    it.effect("refuses Facebook Login as not configured", () =>
      Effect.gen(function* unconfigured() {
        const workspaceId = yield* freshWorkspace;

        const failure = yield* Effect.flip(
          ConnectChannel.use((connect) =>
            connect.start(
              manager(workspaceId),
              "instagram",
              request(Option.some("facebookLogin"))
            )
          )
        );

        assert.strictEqual(failure._tag, "PlatformNotConnectable");
        assert.strictEqual(
          failure._tag === "PlatformNotConnectable" ? failure.reason : "",
          "notConfigured"
        );
      })
    );
  }
);

// The free plan, which allows 3 channels.
const freeChannels = 3;

// Synthetic channels on another platform, connected without it.
const fill = Effect.fn("fill")(function* fill(
  workspaceId: WorkspaceId,
  count: number
) {
  const repository = yield* ChannelRepository;

  for (let added = 0; added < count; added += 1) {
    const channel = yield* freshChannel(workspaceId);

    yield* repository.insert(channel, syntheticCredentials(channel));
  }
});

layer(
  connectTest(["instagramLogin", "facebookLogin"], {
    entitlements: everyWorkspaceOn("free"),
  })
)("connecting Instagram on a full plan", (it) => {
  it.effect(
    "moves a Page's Instagram channel to Instagram Login though the plan is full",
    () =>
      Effect.gen(function* moves() {
        const { meta } = yield* Fakes;
        const workspaceId = yield* freshWorkspace;

        meta.setPages([
          {
            id: "905",
            instagram: {
              id: instagramAccount.user_id,
              username: "studio_example",
            },
            name: "Synthetic Page 905",
          },
        ]);

        yield* fill(workspaceId, freeChannels - 1);

        const viaPage = yield* signIn(
          workspaceId,
          Option.some("facebookLogin")
        ).pipe(Effect.flatMap(connectedChannel));

        const direct = yield* signIn(workspaceId).pipe(
          Effect.flatMap(connectedChannel)
        );

        assert.strictEqual(direct.id, viaPage.id);
        assert.deepStrictEqual(
          direct.connection,
          Option.some("instagramLogin")
        );
        assert.lengthOf(
          yield* ChannelRepository.use((channels) =>
            channels.list(workspaceId)
          ),
          freeChannels
        );
      })
  );

  it.effect(
    "refuses a new Instagram account once the plan's channels are taken",
    () =>
      Effect.gen(function* full() {
        const workspaceId = yield* freshWorkspace;

        yield* fill(workspaceId, freeChannels);

        const refused = yield* Effect.flip(
          ConnectChannel.use((connect) =>
            connect.start(
              manager(workspaceId),
              "instagram",
              request(Option.none())
            )
          )
        );

        assert.deepStrictEqual(
          refused,
          new PlanLimitReached({ allowed: freeChannels, limit: "channels" })
        );
      })
  );

  it.effect(
    "still refuses a new account signed in through Instagram while another moves",
    () =>
      Effect.gen(function* stillFull() {
        const workspaceId = yield* freshWorkspace;
        const repository = yield* ChannelRepository;

        yield* fill(workspaceId, freeChannels - 1);

        // An Instagram account connected through a Page, other than the
        // one that signs in.
        const other = yield* freshChannel(workspaceId, {
          accountId: "17841400000000999",
          connection: "facebookLogin",
          platform: "instagram",
        });

        yield* repository.insert(other, syntheticCredentials(other));

        const refused = yield* Effect.flip(signIn(workspaceId));

        assert.deepStrictEqual(
          refused,
          new PlanLimitReached({ allowed: freeChannels, limit: "channels" })
        );
        assert.lengthOf(yield* repository.list(workspaceId), freeChannels);
      })
  );
});
