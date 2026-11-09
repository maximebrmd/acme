import { JoseKey } from "@atproto/oauth-client-node";
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
import { FetchHttpClient } from "effect/http";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import {
  EncryptedTokenSchema,
  TokenCipher,
} from "#channels/application/token-cipher.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleConnectAttempts } from "#channels/infrastructure/drizzle-connect-attempts.ts";
import { DrizzleConnectChoices } from "#channels/infrastructure/drizzle-connect-choices.ts";
import { blueskyAuthorizer } from "#channels/infrastructure/platforms/bluesky/bluesky-authorizer.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { publicFetch } from "#shared/infrastructure/platforms/public-http.ts";
import {
  authorizersOf,
  connectedChannel,
  testPublicUrl,
} from "#test/channels/connect-support.ts";
import {
  blueskyAccount,
  fakeAtproto,
} from "#test/channels/fakes/fake-atproto.ts";
import {
  actorIn,
  DatabaseTest,
  freshWorkspace,
  OpenOutboundGuard,
  RecordedNotices,
  repositoryScopedTo,
  TokenCipherTest,
} from "#test/channels/support.ts";

// One fake AT Protocol network for the file: handle resolver, PLC directory,
// PDS, authorization server and app view.
class FakeNetwork extends Context.Service<
  FakeNetwork,
  Effect.Success<ReturnType<typeof fakeAtproto>>
>()("acme-server/test/channels/FakeNetwork") {
  static readonly layer = Layer.effect(FakeNetwork, fakeAtproto());
}

// Acme's confidential client, with a key made for the run, against the fake.
const BlueskyAuthorizersTest = Layer.effect(
  PlatformAuthorizers,
  Effect.gen(function* BlueskyAuthorizersTest() {
    const network = yield* FakeNetwork;

    const key = yield* Effect.promise(
      async () => await JoseKey.generate(["ES256"], "test-key-1")
    );

    const authorizer = yield* blueskyAuthorizer(
      {
        allowHttp: true,
        appViewUrl: network.url,
        defaultService: network.url,
        handleResolver: Option.some(network.url),
        mode: { _tag: "confidential", keys: [key] },
        plcDirectoryUrl: network.url,
        publicUrl: testPublicUrl,
      },
      yield* publicFetch
    );

    return authorizersOf(authorizer);
  })
).pipe(Layer.provide(Layer.mergeAll(OpenOutboundGuard, FetchHttpClient.layer)));

const BlueskyTest = Layer.mergeAll(
  ConnectChannel.layer,
  RefreshChannelTokens.layer
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleChannelRepository,
      DrizzleConnectAttempts,
      DrizzleConnectChoices,
      SqlChannelLocks,
      BlueskyAuthorizersTest,
      RecordedNotices.layer
    )
  ),
  Layer.provideMerge(FakeNetwork.layer),
  Layer.provideMerge(TokenCipherTest),
  Layer.provideMerge(DatabaseTest)
);

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

// Signs in as the account, as the member would on the platform's page.
const connected = Effect.fn("connected")(function* connected(
  workspaceId: WorkspaceId
) {
  const network = yield* FakeNetwork;
  const connect = yield* ConnectChannel;

  const authorizationUrl = yield* connect.start(
    manager(workspaceId),
    "bluesky",
    {
      handle: Option.some("@bob.test"),
      instance: Option.none(),
    }
  );

  const back = network.approve(authorizationUrl);

  return yield* connect
    .complete(manager(workspaceId), "bluesky", {
      code: Option.some(back.code),
      error: Option.none(),
      issuer: Option.some(back.iss),
      state: back.state,
    })
    .pipe(Effect.flatMap(connectedChannel));
});

const decodeToken = Schema.decodeUnknownEffect(EncryptedTokenSchema);

// The session the channel holds, decrypted.
const sessionOf = Effect.fn("sessionOf")(function* sessionOf(channel: Channel) {
  const sql = yield* SqlClient.SqlClient;
  const cipher = yield* TokenCipher;

  const [row] = yield* sql<{
    readonly value: string;
  }>`SELECT access_token AS value FROM channels.channels WHERE id = ${channel.id}`;

  const encrypted = yield* decodeToken(row?.value);

  return {
    encrypted,
    session: Redacted.value(yield* cipher.decrypt(encrypted, channel.id)),
  };
});

const current = (channel: Channel) =>
  ChannelRepository.use((channels) =>
    channels.findById(channel.workspaceId, channel.id)
  ).pipe(Effect.map(Option.getOrThrow));

// The refresh sweep, seeing only the test's workspace. Fresh, since the
// file's layer already built the use case over the whole repository.
const sweepIn = (workspaceId: WorkspaceId) =>
  RefreshChannelTokens.use((refresh) => refresh.sweep).pipe(
    Effect.provide(
      Layer.fresh(RefreshChannelTokens.layer).pipe(
        Layer.provide(repositoryScopedTo(workspaceId))
      )
    )
  );

layer(BlueskyTest)("connecting a Bluesky account", (it) => {
  it.effect("connects through the official OAuth client", () =>
    Effect.gen(function* connects() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const now = yield* DateTime.now;

      assert.strictEqual(channel.accountId, blueskyAccount.did);
      assert.strictEqual(channel.handle, "@bob.test");
      assert.deepStrictEqual(channel.displayName, Option.some("Bob Example"));
      assert.deepStrictEqual(
        channel.avatarUrl.pipe(Option.map(String)),
        Option.some(blueskyAccount.avatar)
      );
      assert.deepStrictEqual(channel.scopes, ["atproto", "transition:generic"]);
      // The session is renewed by refreshing it within 90 days.
      assert.deepStrictEqual(channel.token, {
        _tag: "refreshable",
        expiresAt: DateTime.addDuration(now, Duration.days(90)),
      });

      // Pushed to the authorization server, with PKCE, and signed by the
      // client's key.
      const network = yield* FakeNetwork;

      const par = network
        .requests()
        .find((request) => request.path === "/oauth/par");

      const form = new URLSearchParams(par?.body ?? "");

      assert.strictEqual(form.get("code_challenge_method"), "S256");
      assert.strictEqual(
        form.get("client_id"),
        "https://acme.test/api/channels/oauth/bluesky/client-metadata.json"
      );
      assert.strictEqual(
        form.get("client_assertion_type"),
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
      );
      assert.isDefined(par?.headers["dpop"]);
    })
  );

  it.effect("keeps the session encrypted at rest", () =>
    Effect.gen(function* encrypted() {
      const channel = yield* connected(yield* freshWorkspace);
      const { encrypted: stored, session } = yield* sessionOf(channel);

      assert.notInclude(stored, "refresh-");
      assert.notInclude(stored, "access-");
      assert.include(session, '"refresh_token":"refresh-');
      assert.include(session, blueskyAccount.did);
    })
  );

  it.effect("refreshes the session once it is due, and saves the new one", () =>
    Effect.gen(function* refreshes() {
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(workspaceId);
      const before = yield* sessionOf(channel);

      // A month after connecting, nothing is due yet.
      yield* TestClock.adjust(Duration.days(30));
      assert.strictEqual(
        yield* RefreshChannelTokens.use((refresh) =>
          refresh.refresh(channel.id)
        ),
        "skipped"
      );

      // Within 30 days of the 90 the refresh token lasts unused.
      yield* TestClock.adjust(Duration.days(31));

      const report = yield* sweepIn(workspaceId);
      const now = yield* DateTime.now;
      const after = yield* sessionOf(channel);
      const renewed = yield* current(channel);

      assert.deepStrictEqual(report, {
        due: 1,
        failed: 0,
        reconnectRequired: 0,
        refreshed: 1,
        unavailable: 0,
      });
      assert.notStrictEqual(after.session, before.session);
      assert.deepStrictEqual(renewed.token, {
        _tag: "refreshable",
        expiresAt: DateTime.addDuration(now, Duration.days(90)),
      });
      assert.deepStrictEqual(renewed.status, { _tag: "active" });
    })
  );

  it.effect("asks for a reconnect, once, when the session is refused", () =>
    Effect.gen(function* refused() {
      const workspaceId = yield* freshWorkspace;
      const network = yield* FakeNetwork;
      const channel = yield* connected(workspaceId);

      yield* TestClock.adjust(Duration.days(61));
      network.refreshWith("refuse");

      const first = yield* RefreshChannelTokens.use((refresh) =>
        refresh.refresh(channel.id)
      );

      const second = yield* RefreshChannelTokens.use((refresh) =>
        refresh.refresh(channel.id)
      );

      network.refreshWith("rotate");

      assert.strictEqual(first, "reconnectRequired");
      assert.strictEqual(second, "skipped");
      assert.deepStrictEqual((yield* current(channel)).status, {
        _tag: "refreshNeeded",
      });

      const notices = yield* RecordedNotices.use((recorded) =>
        recorded.of(workspaceId)
      );

      assert.deepStrictEqual(
        notices.map(({ channelId, kind }) => ({ channelId, kind })),
        [{ channelId: channel.id, kind: "reconnectRequired" }]
      );
    })
  );

  it.effect("keeps the channel as it is when the server is down", () =>
    Effect.gen(function* unavailable() {
      const workspaceId = yield* freshWorkspace;
      const network = yield* FakeNetwork;
      const channel = yield* connected(workspaceId);
      const before = yield* sessionOf(channel);

      yield* TestClock.adjust(Duration.days(61));
      network.refreshWith("fail");

      const outcome = yield* RefreshChannelTokens.use((refresh) =>
        refresh.refresh(channel.id)
      );

      network.refreshWith("rotate");

      assert.strictEqual(outcome, "unavailable");
      assert.deepStrictEqual((yield* current(channel)).status, {
        _tag: "active",
      });
      assert.strictEqual((yield* sessionOf(channel)).session, before.session);
      assert.lengthOf(
        yield* RecordedNotices.use((recorded) => recorded.of(workspaceId)),
        0
      );
    })
  );

  // A refresh reads the DID document and the authorization server's
  // metadata before it presents the refresh token: either answering 503 is
  // the platform being down, not the session being refused.
  it.effect.each(["directoryDown", "metadataDown"] as const)(
    "keeps the channel as it is when %s",
    (outage) =>
      Effect.gen(function* lookupsDown() {
        const workspaceId = yield* freshWorkspace;
        const network = yield* FakeNetwork;
        const channel = yield* connected(workspaceId);
        const before = yield* sessionOf(channel);

        yield* TestClock.adjust(Duration.days(61));
        network.refreshWith(outage);

        const outcome = yield* RefreshChannelTokens.use((refresh) =>
          refresh.refresh(channel.id)
        );

        network.refreshWith("rotate");

        assert.strictEqual(outcome, "unavailable");
        assert.deepStrictEqual((yield* current(channel)).status, {
          _tag: "active",
        });
        assert.strictEqual((yield* sessionOf(channel)).session, before.session);
        assert.lengthOf(
          yield* RecordedNotices.use((recorded) => recorded.of(workspaceId)),
          0
        );
      })
  );

  it.effect("says the platform is down when the directory is, at sign-in", () =>
    Effect.gen(function* signInDown() {
      const workspaceId = yield* freshWorkspace;
      const network = yield* FakeNetwork;

      network.refreshWith("directoryDown");

      const failure = yield* ConnectChannel.use((connect) =>
        connect.start(manager(workspaceId), "bluesky", {
          handle: Option.some("@bob.test"),
          instance: Option.none(),
        })
      ).pipe(Effect.flip);

      network.refreshWith("rotate");

      assert.strictEqual(failure._tag, "PlatformUnavailable");
    })
  );

  it.effect("reconnects the channel to the same account", () =>
    Effect.gen(function* reconnects() {
      const workspaceId = yield* freshWorkspace;
      const network = yield* FakeNetwork;
      const connect = yield* ConnectChannel;
      const channel = yield* connected(workspaceId);
      const before = yield* sessionOf(channel);

      const authorizationUrl = yield* connect.reconnect(
        manager(workspaceId),
        channel.id
      );

      const back = network.approve(authorizationUrl);

      const reconnected = yield* connect
        .complete(manager(workspaceId), "bluesky", {
          code: Option.some(back.code),
          error: Option.none(),
          issuer: Option.some(back.iss),
          state: back.state,
        })
        .pipe(Effect.flatMap(connectedChannel));

      assert.strictEqual(reconnected.id, channel.id);
      assert.notStrictEqual(
        (yield* sessionOf(channel)).session,
        before.session
      );
    })
  );
});
