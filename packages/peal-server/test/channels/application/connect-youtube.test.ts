import { createHash } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
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
  youtubeAuthorizerOn,
} from "#test/channels/connect-support.ts";
import {
  fakeGoogle,
  googleClient,
  otherYouTubeChannel,
  youtubeChannel,
} from "#test/channels/fakes/fake-google.ts";
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

const noHandle = {
  connection: Option.none(),
  handle: Option.none(),
  instance: Option.none(),
};

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

// Google, and the use case connecting its synthetic channel.
const onGoogle = Effect.fn("test.onGoogle")(function* onGoogle() {
  const google = yield* fakeGoogle();
  const authorizer = yield* youtubeAuthorizerOn(google.endpoints);
  const connect = yield* connectChannelOver(authorizer);

  return { authorizer, connect, google };
});

type OnGoogle = Effect.Success<ReturnType<typeof onGoogle>>;

const connected = Effect.fn("test.connected")(function* connected(
  on: OnGoogle,
  workspaceId: WorkspaceId
) {
  const url = yield* on.connect.start(
    manager(workspaceId),
    "youtube",
    noHandle
  );

  return yield* on.connect
    .complete(
      manager(workspaceId),
      "youtube",
      callbackOf(on.google.approve(url))
    )
    .pipe(Effect.flatMap(connectedChannel));
});

// The token jobs over the workspace's channels only, with the authorizer.
const tokenJobs = (workspaceId: WorkspaceId, authorizer: PlatformAuthorizer) =>
  Layer.mergeAll(RefreshChannelTokens.layer, ChannelAccess.layer).pipe(
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

// Makes the channel's token due for a refresh, as it would be within the
// sweep's quarter of an hour.
const makeDue = (channel: Channel) =>
  Effect.gen(function* due() {
    const now = yield* DateTime.now;

    const aged = renewToken(
      channel,
      {
        scopes: channel.scopes,
        token: {
          _tag: "refreshable",
          expiresAt: DateTime.addDuration(now, Duration.minutes(5)),
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

layer(AdaptersTest)("connecting a YouTube channel", (it) => {
  it.effect(
    "asks Google for offline access with PKCE, and keeps a refreshable token",
    () =>
      Effect.gen(function* connects() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;

        const authorizationUrl = yield* on.connect.start(
          manager(workspaceId),
          "youtube",
          noHandle
        );

        const url = new URL(authorizationUrl);

        assert.strictEqual(url.pathname, "/o/oauth2/v2/auth");
        assert.deepStrictEqual(
          Object.fromEntries(
            [
              "access_type",
              "client_id",
              "code_challenge_method",
              "prompt",
              "redirect_uri",
              "response_type",
              "scope",
            ].map((name) => [name, url.searchParams.get(name)])
          ),
          {
            access_type: "offline",
            client_id: googleClient.clientId,
            code_challenge_method: "S256",
            prompt: "select_account consent",
            redirect_uri: "https://peal.test/connect/youtube/callback",
            response_type: "code",
            scope:
              "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
          }
        );
        assert.match(
          url.searchParams.get("code_challenge") ?? "",
          /^[\w-]{43}$/u
        );
        assert.isNull(url.searchParams.get("include_granted_scopes"));

        const now = yield* DateTime.now;

        const channel = yield* on.connect
          .complete(
            manager(workspaceId),
            "youtube",
            callbackOf(on.google.approve(authorizationUrl))
          )
          .pipe(Effect.flatMap(connectedChannel));

        assert.strictEqual(channel.platform, "youtube");
        assert.strictEqual(channel.accountId, youtubeChannel.id);
        assert.strictEqual(channel.handle, "@pealexample");
        assert.deepStrictEqual(
          channel.displayName,
          Option.some("Peal Example")
        );
        assert.deepStrictEqual(
          channel.avatarUrl.pipe(Option.map(String)),
          Option.some(youtubeChannel.snippet.thumbnails.default.url)
        );
        assert.deepStrictEqual(channel.token, {
          _tag: "refreshable",
          expiresAt: DateTime.addDuration(now, Duration.seconds(3599)),
        });
        assert.deepStrictEqual(yield* storedTokens(channel), {
          access: "ya29.synthetic-1",
          refresh: Option.some("1//synthetic-refresh-1"),
        });

        // The verifier whose challenge the page was given, and the
        // client's secret, in the form.
        const exchange = on.google
          .requests()
          .find(({ path }) => path === "/token");

        const sent = new URLSearchParams(exchange?.body ?? "");

        assert.strictEqual(
          createHash("sha256")
            .update(sent.get("code_verifier") ?? "")
            .digest("base64url"),
          url.searchParams.get("code_challenge")
        );
        assert.strictEqual(
          sent.get("client_secret"),
          googleClient.clientSecret
        );
        assert.strictEqual(sent.get("grant_type"), "authorization_code");
      }).pipe(Effect.scoped)
  );

  it.effect("names a channel without a handle by its title", () =>
    Effect.gen(function* titled() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;

      on.google.setChannels([otherYouTubeChannel]);

      const channel = yield* connected(on, workspaceId);

      assert.strictEqual(channel.handle, "Peal Example Clips");
      assert.deepStrictEqual(channel.avatarUrl, Option.none());
    }).pipe(Effect.scoped)
  );

  it.effect("refuses a sign-in that withheld the upload scope", () =>
    Effect.gen(function* withheld() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(
        manager(workspaceId),
        "youtube",
        noHandle
      );

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "youtube",
          callbackOf(
            on.google.approve(url, [
              "https://www.googleapis.com/auth/youtube.readonly",
            ])
          )
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect("takes a cancel on Google as the owner refusing", () =>
    Effect.gen(function* denied() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(
        manager(workspaceId),
        "youtube",
        noHandle
      );

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "youtube",
          callbackOf(on.google.deny(url))
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect(
    "connects nothing for a Google account without a channel, and offers a choice of several",
    () =>
      Effect.gen(function* reached() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;

        on.google.setChannels([]);

        const none = yield* connected(on, workspaceId).pipe(Effect.flip);

        assert.strictEqual(none._tag, "NoAccountsToConnect");

        on.google.setChannels([youtubeChannel, otherYouTubeChannel]);

        const url = yield* on.connect.start(
          manager(workspaceId),
          "youtube",
          noHandle
        );

        const outcome = yield* on.connect.complete(
          manager(workspaceId),
          "youtube",
          callbackOf(on.google.approve(url))
        );

        assert(outcome._tag === "choose");
        assert.deepStrictEqual(
          outcome.accounts.map(({ accountId }) => accountId),
          [youtubeChannel.id, otherYouTubeChannel.id]
        );
      }).pipe(Effect.scoped)
  );

  it.effect("refreshes a due token, keeping the refresh token", () =>
    Effect.gen(function* refreshes() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const jobs = tokenJobs(workspaceId, on.authorizer);

      const refresh = RefreshChannelTokens.use((tokens) =>
        tokens.refresh(channel.id)
      ).pipe(Effect.provide(jobs));

      // Not due: an hour left.
      assert.strictEqual(yield* refresh, "skipped");

      yield* makeDue(channel);
      assert.strictEqual(yield* refresh, "refreshed");
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "ya29.synthetic-2",
        refresh: Option.some("1//synthetic-refresh-1"),
      });
    }).pipe(Effect.scoped)
  );

  it.effect("asks to reconnect once Google refuses the refresh token", () =>
    Effect.gen(function* expired() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const notices = yield* RecordedNotices;

      // As after the seven days of a project in testing.
      on.google.revokeAll();
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
    "leaves the channel alone when Google is down or refuses Peal's client",
    () =>
      Effect.gen(function* unavailable() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connected(on, workspaceId);

        on.google.failNext("POST /token", [
          { body: { error: "internal_failure" }, status: 503 },
          { body: { error: "invalid_client" }, status: 401 },
        ]);
        yield* makeDue(channel);

        const refresh = RefreshChannelTokens.use((tokens) =>
          tokens.refresh(channel.id)
        ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

        assert.strictEqual(yield* refresh, "unavailable");
        assert.strictEqual(yield* refresh, "unavailable");
        assert.deepStrictEqual(yield* statusOf(channel), Option.some("active"));
        assert.strictEqual(yield* refresh, "refreshed");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "revokes the grant on disconnect, once no workspace connects the channel",
    () =>
      Effect.gen(function* revokes() {
        const on = yield* onGoogle();
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;

        // A channel of its own: other tests leave theirs connected.
        on.google.setChannels([
          { ...youtubeChannel, id: `UC${first.replaceAll("-", "")}` },
        ]);

        const kept = yield* connected(on, first);
        const shared = yield* connected(on, second);

        const disconnect = (workspaceId: WorkspaceId, channel: Channel) =>
          DisconnectChannel.use((useCase) =>
            useCase.disconnect(manager(workspaceId), channel.id)
          ).pipe(Effect.provide(disconnecting(on.authorizer)));

        // The other workspace still posts as the channel: its grant stays.
        yield* disconnect(second, shared);
        assert.deepStrictEqual(on.google.revoked(), []);

        yield* disconnect(first, kept);
        assert.deepStrictEqual(on.google.revoked(), ["1//synthetic-refresh-1"]);
        assert.deepStrictEqual(yield* statusOf(kept), Option.none());
      }).pipe(Effect.scoped)
  );

  it.effect("disconnects even when Google does not answer the revocation", () =>
    Effect.gen(function* disconnects() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);

      on.google.failNext("POST /revoke", [
        { body: { error: "backend_error" }, status: 503 },
      ]);

      yield* DisconnectChannel.use((useCase) =>
        useCase.disconnect(manager(workspaceId), channel.id)
      ).pipe(Effect.provide(disconnecting(on.authorizer)));

      assert.deepStrictEqual(yield* statusOf(channel), Option.none());
    }).pipe(Effect.scoped)
  );
});
