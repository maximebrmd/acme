import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { decryptTokens } from "#channels/application/channel-tokens.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type {
  AuthorizationCallback,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { renewToken } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  authorizersOf,
  ConnectAdaptersTest,
  connectChannelOver,
  connectedChannel,
  tiktokAuthorizerOn,
} from "#test/channels/connect-support.ts";
import {
  fakeTikTok,
  tiktokClient,
  tiktokCreator,
} from "#test/channels/fakes/fake-tiktok.ts";
import {
  actorIn,
  freshWorkspace,
  RecordedNotices,
  repositoryScopedTo,
} from "#test/channels/support.ts";

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, [
    "channel:read",
    "channel:connect",
    "channel:disconnect",
  ]);

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

const AdaptersTest = Layer.mergeAll(ConnectAdaptersTest, RecordedNotices.layer);

// TikTok, and the use case connecting its synthetic creator.
const onTikTok = Effect.fn("test.onTikTok")(function* onTikTok(
  openId?: string
) {
  const tiktok = yield* fakeTikTok(openId);
  const authorizer = yield* tiktokAuthorizerOn(tiktok.hosts);
  const connect = yield* connectChannelOver(authorizer);

  return { authorizer, connect, tiktok };
});

type OnTikTok = Effect.Success<ReturnType<typeof onTikTok>>;

const connected = Effect.fn("test.connected")(function* connected(
  on: OnTikTok,
  workspaceId: WorkspaceId
) {
  const url = yield* on.connect.start(manager(workspaceId), "tiktok", {
    connection: Option.none(),
    handle: Option.none(),
    instance: Option.none(),
  });

  return yield* on.connect
    .complete(
      manager(workspaceId),
      "tiktok",
      callbackOf(on.tiktok.approve(url))
    )
    .pipe(Effect.flatMap(connectedChannel));
});

// The token jobs over the workspace's channels only, with the authorizer.
const tokenJobs = (workspaceId: WorkspaceId, authorizer: PlatformAuthorizer) =>
  RefreshChannelTokens.layer.pipe(
    Layer.provide(repositoryScopedTo(workspaceId)),
    Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf(authorizer)))
  );

const disconnecting = (authorizer: PlatformAuthorizer) =>
  DisconnectChannel.layer.pipe(
    Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf(authorizer)))
  );

// The channel's tokens as stored, decrypted.
const storedTokens = (channel: Channel) =>
  ChannelRepository.use((channels) => channels.credentials(channel.id)).pipe(
    Effect.map(Option.getOrThrow),
    Effect.flatMap((stored) => decryptTokens(stored, channel.id)),
    Effect.map(({ accessToken, refreshToken }) => ({
      access: Redacted.value(accessToken),
      refresh: refreshToken.pipe(Option.map(Redacted.value)),
    }))
  );

// Makes the channel's token due for the sweep: unused for a month, TikTok's
// tokens being renewed when a call needs them.
const makeDue = (channel: Channel) =>
  Effect.gen(function* due() {
    const now = yield* DateTime.now;

    const aged = renewToken(
      channel,
      {
        scopes: channel.scopes,
        token: {
          _tag: "refreshable",
          expiresAt: DateTime.subtractDuration(now, Duration.days(31)),
        },
      },
      now
    );

    yield* ChannelRepository.use((channels) =>
      channels.update(aged, Option.none())
    );
  });

const statusOf = (channel: Channel) =>
  ChannelRepository.use((channels) => channels.get(channel.id)).pipe(
    Effect.map(Option.map(({ status }) => status._tag))
  );

layer(AdaptersTest)("connecting a TikTok account", (it) => {
  it.effect("sends the creator to Login Kit's page with Peal's scopes", () =>
    Effect.gen(function* starts() {
      const on = yield* onTikTok();
      const workspaceId = yield* freshWorkspace;

      const url = new URL(
        yield* on.connect.start(manager(workspaceId), "tiktok", {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.none(),
        })
      );

      assert.strictEqual(url.pathname, "/v2/auth/authorize/");
      assert.strictEqual(
        url.searchParams.get("client_key"),
        tiktokClient.clientKey
      );
      assert.strictEqual(
        url.searchParams.get("scope"),
        "user.info.basic,user.info.profile,video.publish,video.list"
      );
      assert.strictEqual(url.searchParams.get("response_type"), "code");
      assert.strictEqual(url.searchParams.get("disable_auto_auth"), "1");
      assert.strictEqual(
        url.searchParams.get("redirect_uri"),
        "https://peal.test/connect/tiktok/callback"
      );
      assert.match(url.searchParams.get("state") ?? "", /^[\w-]{43}$/u);
      // TikTok's web flow takes no PKCE.
      assert.isNull(url.searchParams.get("code_challenge"));
    }).pipe(Effect.scoped)
  );

  it.effect("connects the creator by open_id, for a refreshable token", () =>
    Effect.gen(function* connects() {
      const on = yield* onTikTok();
      const workspaceId = yield* freshWorkspace;
      const now = yield* DateTime.now;
      const channel = yield* connected(on, workspaceId);

      assert.strictEqual(channel.platform, "tiktok");
      assert.strictEqual(channel.accountId, tiktokCreator.open_id);
      assert.strictEqual(channel.handle, "@peal_example");
      assert.deepStrictEqual(channel.displayName, Option.some("Peal Example"));
      assert.deepStrictEqual(
        channel.avatarUrl.pipe(Option.map(String)),
        Option.some(tiktokCreator.avatar_url)
      );
      assert.deepStrictEqual(channel.scopes, [
        "user.info.basic",
        "user.info.profile",
        "video.publish",
        "video.list",
      ]);
      // expires_in says a day here, which wins over the policy's two hours.
      assert.deepStrictEqual(channel.token, {
        _tag: "refreshable",
        expiresAt: DateTime.addDuration(now, Duration.days(1)),
      });
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "act.tiktok-access-1",
        refresh: Option.some("rft.tiktok-refresh-1"),
      });

      const exchange = on.tiktok
        .requests()
        .find(({ path }) => path === "/v2/oauth/token/");

      const sent = new URLSearchParams(exchange?.body ?? "");

      assert.strictEqual(sent.get("grant_type"), "authorization_code");
      assert.strictEqual(sent.get("client_key"), tiktokClient.clientKey);
      assert.strictEqual(sent.get("client_secret"), tiktokClient.clientSecret);
      assert.isNull(sent.get("code_verifier"));
    }).pipe(Effect.scoped)
  );

  it.effect("names a creator without their username by their name", () =>
    Effect.gen(function* withoutUsername() {
      const on = yield* onTikTok();
      const workspaceId = yield* freshWorkspace;

      on.tiktok.grantOnly(["user.info.basic", "video.publish"]);

      const channel = yield* connected(on, workspaceId);

      assert.strictEqual(channel.handle, "Peal Example");
      assert.deepStrictEqual(channel.scopes, [
        "user.info.basic",
        "video.publish",
      ]);
    }).pipe(Effect.scoped)
  );

  it.effect("takes a refusal on TikTok as the creator refusing", () =>
    Effect.gen(function* denied() {
      const on = yield* onTikTok();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(manager(workspaceId), "tiktok", {
        connection: Option.none(),
        handle: Option.none(),
        instance: Option.none(),
      });

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "tiktok",
          callbackOf(on.tiktok.deny(url))
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect("fails on an exchange TikTok refuses, even in a 200", () =>
    Effect.gen(function* refusedExchange() {
      const on = yield* onTikTok();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(manager(workspaceId), "tiktok", {
        connection: Option.none(),
        handle: Option.none(),
        instance: Option.none(),
      });

      on.tiktok.failNext("POST /v2/oauth/token/", [
        {
          body: { error: "invalid_grant", error_description: "Synthetic." },
          status: 200,
        },
      ]);

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "tiktok",
          callbackOf(on.tiktok.approve(url))
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationFailed");
    }).pipe(Effect.scoped)
  );

  it.effect("refreshes a due token, keeping each rotated refresh token", () =>
    Effect.gen(function* refreshes() {
      const on = yield* onTikTok();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);

      const refresh = RefreshChannelTokens.use((tokens) =>
        tokens.refresh(channel.id)
      ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

      assert.strictEqual(yield* refresh, "skipped");

      yield* makeDue(channel);
      assert.strictEqual(yield* refresh, "refreshed");
      yield* makeDue(channel);
      assert.strictEqual(yield* refresh, "refreshed");

      assert.deepStrictEqual(on.tiktok.usedRefreshTokens(), [
        "rft.tiktok-refresh-1",
        "rft.tiktok-refresh-2",
      ]);
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "act.tiktok-access-3",
        refresh: Option.some("rft.tiktok-refresh-3"),
      });

      const sent = new URLSearchParams(
        on.tiktok.requests().findLast(({ path }) => path === "/v2/oauth/token/")
          ?.body ?? ""
      );

      assert.strictEqual(sent.get("grant_type"), "refresh_token");
      assert.strictEqual(sent.get("client_secret"), tiktokClient.clientSecret);
    }).pipe(Effect.scoped)
  );

  it.effect("asks to reconnect once TikTok refuses the refresh token", () =>
    Effect.gen(function* revoked() {
      const on = yield* onTikTok();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const notices = yield* RecordedNotices;

      on.tiktok.revokeAll();
      yield* makeDue(channel);

      const outcome = yield* RefreshChannelTokens.use((tokens) =>
        tokens.refresh(channel.id)
      ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

      assert.strictEqual(outcome, "reconnectRequired");
      assert.deepStrictEqual(
        yield* statusOf(channel),
        Option.some("refreshNeeded")
      );
      assert.deepStrictEqual(
        (yield* notices.of(workspaceId)).map(({ kind }) => kind),
        ["reconnectRequired"]
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "leaves the channel alone when TikTok is down or refuses Peal's client",
    () =>
      Effect.gen(function* unavailable() {
        const on = yield* onTikTok();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connected(on, workspaceId);

        on.tiktok.failNext("POST /v2/oauth/token/", [
          { body: { error: "temporarily_unavailable" }, status: 503 },
          { body: { error: "invalid_client" }, status: 401 },
          { body: { error: "server_error" }, status: 200 },
        ]);
        yield* makeDue(channel);

        const refresh = RefreshChannelTokens.use((tokens) =>
          tokens.refresh(channel.id)
        ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

        assert.strictEqual(yield* refresh, "unavailable");
        assert.strictEqual(yield* refresh, "unavailable");
        assert.strictEqual(yield* refresh, "unavailable");
        assert.deepStrictEqual(yield* statusOf(channel), Option.some("active"));
        assert.strictEqual(yield* refresh, "refreshed");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "revokes the creator's token when the channel is disconnected",
    () =>
      Effect.gen(function* revokes() {
        const workspaceId = yield* freshWorkspace;
        // A creator no other test's channel connects.
        const on = yield* onTikTok(`-000synthetic-open-id-${workspaceId}`);
        const channel = yield* connected(on, workspaceId);

        yield* DisconnectChannel.use((useCase) =>
          useCase.disconnect(manager(workspaceId), channel.id)
        ).pipe(Effect.provide(disconnecting(on.authorizer)));

        assert.deepStrictEqual(on.tiktok.revoked(), ["act.tiktok-access-1"]);
        assert.deepStrictEqual(
          yield* ChannelRepository.use((channels) => channels.get(channel.id)),
          Option.none()
        );

        const sent = new URLSearchParams(
          on.tiktok.requests().find(({ path }) => path === "/v2/oauth/revoke/")
            ?.body ?? ""
        );

        assert.strictEqual(sent.get("client_key"), tiktokClient.clientKey);
        assert.strictEqual(
          sent.get("client_secret"),
          tiktokClient.clientSecret
        );
      }).pipe(Effect.scoped)
  );

  it.effect("disconnects the channel when TikTok does not revoke", () =>
    Effect.gen(function* stillDisconnects() {
      const workspaceId = yield* freshWorkspace;
      const on = yield* onTikTok(`-000synthetic-open-id-${workspaceId}`);
      const channel = yield* connected(on, workspaceId);

      on.tiktok.failNext("POST /v2/oauth/revoke/", [
        { body: { error: "server_error" }, status: 503 },
      ]);

      yield* DisconnectChannel.use((useCase) =>
        useCase.disconnect(manager(workspaceId), channel.id)
      ).pipe(Effect.provide(disconnecting(on.authorizer)));

      assert.deepStrictEqual(on.tiktok.revoked(), []);
      assert.deepStrictEqual(
        yield* ChannelRepository.use((channels) => channels.get(channel.id)),
        Option.none()
      );
    }).pipe(Effect.scoped)
  );
});
