import { createHash } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { decryptTokens } from "#channels/application/channel-tokens.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type {
  AuthorizationCallback,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { renewToken } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import {
  authorizersOf,
  ConnectAdaptersTest,
  connectChannelOver,
  connectedChannel,
  xAuthorizerOn,
} from "#test/channels/connect-support.ts";
import { fakeX, xAccount, xClient } from "#test/channels/fakes/fake-x.ts";
import {
  actorIn,
  freshWorkspace,
  RecordedNotices,
  repositoryScopedTo,
} from "#test/channels/support.ts";

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

const AdaptersTest = Layer.mergeAll(ConnectAdaptersTest, RecordedNotices.layer);

// X, and the use case connecting its synthetic account.
const onX = Effect.fn("test.onX")(function* onX() {
  const x = yield* fakeX();
  const authorizer = yield* xAuthorizerOn(x.endpoints);
  const connect = yield* connectChannelOver(authorizer);

  return { authorizer, connect, x };
});

type OnX = Effect.Success<ReturnType<typeof onX>>;

const connected = Effect.fn("test.connected")(function* connected(
  on: OnX,
  workspaceId: WorkspaceId
) {
  const url = yield* on.connect.start(manager(workspaceId), "x", {
    connection: Option.none(),
    handle: Option.none(),
    instance: Option.none(),
  });

  return yield* on.connect
    .complete(manager(workspaceId), "x", callbackOf(on.x.approve(url)))
    .pipe(Effect.flatMap(connectedChannel));
});

// The token jobs over the workspace's channels only, with the authorizer.
const tokenJobs = (workspaceId: WorkspaceId, authorizer: PlatformAuthorizer) =>
  Layer.mergeAll(RefreshChannelTokens.layer, ChannelAccess.layer).pipe(
    Layer.provide(repositoryScopedTo(workspaceId)),
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

// Makes the channel's token due for the sweep: unused for a month, X's
// keep-alive.
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

layer(AdaptersTest)("connecting an X account", (it) => {
  it.effect("connects the account with PKCE, for a refreshable token", () =>
    Effect.gen(function* connects() {
      const on = yield* onX();
      const workspaceId = yield* freshWorkspace;

      const authorizationUrl = yield* on.connect.start(
        manager(workspaceId),
        "x",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.none(),
        }
      );

      const url = new URL(authorizationUrl);

      assert.strictEqual(url.pathname, "/i/oauth2/authorize");
      assert.strictEqual(url.searchParams.get("client_id"), xClient.clientId);
      assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256");
      assert.match(
        url.searchParams.get("code_challenge") ?? "",
        /^[\w-]{43}$/u
      );
      assert.strictEqual(
        url.searchParams.get("scope"),
        "tweet.read tweet.write users.read media.write offline.access"
      );
      assert.strictEqual(
        url.searchParams.get("redirect_uri"),
        "https://peal.test/connect/x/callback"
      );

      const now = yield* DateTime.now;

      const channel = yield* on.connect
        .complete(
          manager(workspaceId),
          "x",
          callbackOf(on.x.approve(authorizationUrl))
        )
        .pipe(Effect.flatMap(connectedChannel));

      assert.strictEqual(channel.platform, "x");
      assert.strictEqual(channel.accountId, xAccount.id);
      assert.strictEqual(channel.handle, "@peal_example");
      assert.deepStrictEqual(channel.displayName, Option.some("Peal Example"));
      assert.deepStrictEqual(
        channel.avatarUrl.pipe(Option.map(String)),
        Option.some(xAccount.profile_image_url)
      );
      assert.deepStrictEqual(channel.token, {
        _tag: "refreshable",
        expiresAt: DateTime.addDuration(now, Duration.hours(2)),
      });
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "x-access-1",
        refresh: Option.some("x-refresh-1"),
      });
    }).pipe(Effect.scoped)
  );

  it.effect("sends the verifier whose challenge the page was given", () =>
    Effect.gen(function* verifier() {
      const on = yield* onX();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(manager(workspaceId), "x", {
        connection: Option.none(),
        handle: Option.none(),
        instance: Option.none(),
      });

      yield* on.connect.complete(
        manager(workspaceId),
        "x",
        callbackOf(on.x.approve(url))
      );

      const exchange = on.x
        .requests()
        .find(({ path }) => path === "/2/oauth2/token");

      const sent = new URLSearchParams(exchange?.body ?? "");
      const challenge = new URL(url).searchParams.get("code_challenge");

      assert.strictEqual(
        createHash("sha256")
          .update(sent.get("code_verifier") ?? "")
          .digest("base64url"),
        challenge
      );
      assert.strictEqual(sent.get("grant_type"), "authorization_code");
      assert.match(
        String(exchange?.headers["authorization"] ?? ""),
        /^Basic /u
      );
    }).pipe(Effect.scoped)
  );

  it.effect("takes a refusal on X as the owner refusing", () =>
    Effect.gen(function* denied() {
      const on = yield* onX();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(manager(workspaceId), "x", {
        connection: Option.none(),
        handle: Option.none(),
        instance: Option.none(),
      });

      const refused = yield* on.connect
        .complete(manager(workspaceId), "x", callbackOf(on.x.deny(url)))
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect("refreshes a due token, keeping each rotated refresh token", () =>
    Effect.gen(function* refreshes() {
      const on = yield* onX();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const jobs = tokenJobs(workspaceId, on.authorizer);

      const refresh = RefreshChannelTokens.use((tokens) =>
        tokens.refresh(channel.id)
      ).pipe(Effect.provide(jobs));

      // Not due: two hours left, and then renewed as posts need it.
      assert.strictEqual(yield* refresh, "skipped");

      yield* makeDue(channel);
      assert.strictEqual(yield* refresh, "refreshed");
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "x-access-2",
        refresh: Option.some("x-refresh-2"),
      });

      yield* makeDue(channel);
      assert.strictEqual(yield* refresh, "refreshed");

      // Each refresh token went to X once, in turn.
      assert.deepStrictEqual(on.x.usedRefreshTokens(), [
        "x-refresh-1",
        "x-refresh-2",
      ]);
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "x-access-3",
        refresh: Option.some("x-refresh-3"),
      });
    }).pipe(Effect.scoped)
  );

  it.effect("leaves an expired token to the next post, which renews it", () =>
    Effect.gen(function* onUse() {
      const on = yield* onX();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const jobs = tokenJobs(workspaceId, on.authorizer);
      const now = yield* DateTime.now;

      yield* ChannelRepository.use((channels) =>
        channels.update(
          renewToken(
            channel,
            {
              scopes: channel.scopes,
              token: {
                _tag: "refreshable",
                expiresAt: DateTime.subtractDuration(now, Duration.hours(5)),
              },
            },
            now
          ),
          Option.none()
        )
      );

      const swept = yield* RefreshChannelTokens.use((tokens) =>
        tokens.refresh(channel.id)
      ).pipe(Effect.provide(jobs));

      const used = yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, ({ accessToken }) =>
          Effect.succeed(Redacted.value(accessToken))
        )
      ).pipe(Effect.provide(jobs));

      assert.strictEqual(swept, "skipped");
      assert.strictEqual(used, "x-access-2");
      assert.deepStrictEqual(on.x.usedRefreshTokens(), ["x-refresh-1"]);
    }).pipe(Effect.scoped)
  );

  it.effect("renews a token X refused, then calls again with the new one", () =>
    Effect.gen(function* renews() {
      const on = yield* onX();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const calls: string[] = [];

      const result = yield* ChannelAccess.use((access) =>
        access.withToken(channel.id, ({ accessToken }) => {
          const token = Redacted.value(accessToken);

          calls.push(token);

          return token === "x-access-1"
            ? Effect.fail(new TokenRejected())
            : Effect.succeed("posted");
        })
      ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

      assert.strictEqual(result, "posted");
      assert.deepStrictEqual(calls, ["x-access-1", "x-access-2"]);
    }).pipe(Effect.scoped)
  );

  it.effect("asks to reconnect once X revoked the refresh token", () =>
    Effect.gen(function* revoked() {
      const on = yield* onX();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const notices = yield* RecordedNotices;

      on.x.revokeAll();
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
    "leaves the channel alone when X is down, refuses Peal's client or wants paying",
    () =>
      Effect.gen(function* unavailable() {
        const on = yield* onX();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connected(on, workspaceId);

        on.x.failNext("POST /2/oauth2/token", [
          { body: { title: "Service Unavailable" }, status: 503 },
          {
            body: {
              error: "unauthorized_client",
              error_description: "Missing valid authorization header",
            },
            status: 401,
          },
          { body: { title: "Payment Required" }, status: 402 },
        ]);
        yield* makeDue(channel);

        const refresh = RefreshChannelTokens.use((tokens) =>
          tokens.refresh(channel.id)
        ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

        assert.strictEqual(yield* refresh, "unavailable");
        assert.strictEqual(yield* refresh, "unavailable");
        assert.strictEqual(yield* refresh, "unavailable");
        assert.deepStrictEqual(yield* statusOf(channel), Option.some("active"));

        // X answered none: the refresh token still works.
        assert.strictEqual(yield* refresh, "refreshed");
      }).pipe(Effect.scoped)
  );
});
