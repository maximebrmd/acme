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
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import { everyWorkspaceOn } from "#test/billing/support.ts";
import {
  authorizersOf,
  ConnectAdaptersTest,
  connectChannelOver,
  connectedChannel,
  pinterestAuthorizerOn,
  connectAdaptersOn,
} from "#test/channels/connect-support.ts";
import {
  fakePinterest,
  pinterestAccount,
  pinterestClient,
} from "#test/channels/fakes/fake-pinterest.ts";
import {
  actorIn,
  freshWorkspace,
  RecordedNotices,
  repositoryScopedTo,
  freshChannel,
  syntheticCredentials,
} from "#test/channels/support.ts";

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

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

// Pinterest, and the use case connecting its synthetic account.
const onPinterest = Effect.fn("test.onPinterest")(function* onPinterest() {
  const pinterest = yield* fakePinterest();
  const authorizer = yield* pinterestAuthorizerOn(pinterest.hosts);
  const connect = yield* connectChannelOver(authorizer);

  return { authorizer, connect, pinterest };
});

type OnPinterest = Effect.Success<ReturnType<typeof onPinterest>>;

const connected = Effect.fn("test.connected")(function* connected(
  on: OnPinterest,
  workspaceId: WorkspaceId
) {
  const url = yield* on.connect.start(
    manager(workspaceId),
    "pinterest",
    noHandle
  );

  return yield* on.connect
    .complete(
      manager(workspaceId),
      "pinterest",
      callbackOf(on.pinterest.approve(url))
    )
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

// Makes the channel's token due for the sweep: six days left of its 30.
const makeDue = (channel: Channel) =>
  Effect.gen(function* due() {
    const now = yield* DateTime.now;

    const aged = renewToken(
      channel,
      {
        scopes: channel.scopes,
        token: {
          _tag: "refreshable",
          expiresAt: DateTime.addDuration(now, Duration.days(6)),
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

layer(AdaptersTest)("connecting a Pinterest account", (it) => {
  it.effect("connects the account, for a token renewed without its owner", () =>
    Effect.gen(function* connects() {
      const on = yield* onPinterest();
      const workspaceId = yield* freshWorkspace;

      const authorizationUrl = yield* on.connect.start(
        manager(workspaceId),
        "pinterest",
        noHandle
      );

      const url = new URL(authorizationUrl);

      assert.strictEqual(url.pathname, "/oauth/");
      assert.strictEqual(
        url.searchParams.get("client_id"),
        pinterestClient.appId
      );
      assert.strictEqual(url.searchParams.get("response_type"), "code");
      assert.strictEqual(
        url.searchParams.get("scope"),
        "boards:read,boards:write,pins:read,pins:write,user_accounts:read"
      );
      assert.strictEqual(
        url.searchParams.get("redirect_uri"),
        "https://peal.test/connect/pinterest/callback"
      );
      assert.match(url.searchParams.get("state") ?? "", /^[\w-]{43}$/u);

      const now = yield* DateTime.now;

      const channel = yield* on.connect
        .complete(
          manager(workspaceId),
          "pinterest",
          callbackOf(on.pinterest.approve(authorizationUrl))
        )
        .pipe(Effect.flatMap(connectedChannel));

      assert.strictEqual(channel.platform, "pinterest");
      assert.strictEqual(channel.accountId, pinterestAccount.id);
      assert.strictEqual(channel.handle, "@pealexample");
      assert.deepStrictEqual(channel.displayName, Option.some("Peal Example"));
      assert.deepStrictEqual(
        channel.avatarUrl.pipe(Option.map(String)),
        Option.some(pinterestAccount.profile_image)
      );
      assert.deepStrictEqual(channel.token, {
        _tag: "refreshable",
        expiresAt: DateTime.addDuration(now, Duration.days(30)),
      });
      assert.deepStrictEqual(channel.scopes, [
        "boards:read",
        "boards:write",
        "pins:read",
        "pins:write",
        "user_accounts:read",
      ]);
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "pina_synthetic_1",
        refresh: Option.some("pinr_synthetic_1"),
      });
    }).pipe(Effect.scoped)
  );

  it.effect("exchanges the code with the app's Basic credentials", () =>
    Effect.gen(function* exchanges() {
      const on = yield* onPinterest();
      const workspaceId = yield* freshWorkspace;

      yield* connected(on, workspaceId);

      const exchange = on.pinterest
        .requests()
        .find(({ path }) => path === "/v5/oauth/token");

      const sent = new URLSearchParams(exchange?.body ?? "");

      assert.strictEqual(sent.get("grant_type"), "authorization_code");
      assert.strictEqual(
        sent.get("redirect_uri"),
        "https://peal.test/connect/pinterest/callback"
      );
      // The secret goes in the header, never in the form.
      assert.isNull(sent.get("client_secret"));
      assert.strictEqual(
        String(exchange?.headers["authorization"] ?? ""),
        `Basic ${Buffer.from(
          `${pinterestClient.appId}:${pinterestClient.appSecret}`
        ).toString("base64")}`
      );
    }).pipe(Effect.scoped)
  );

  it.effect("takes a refusal on Pinterest as the owner refusing", () =>
    Effect.gen(function* denied() {
      const on = yield* onPinterest();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(
        manager(workspaceId),
        "pinterest",
        noHandle
      );

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "pinterest",
          callbackOf(on.pinterest.deny(url))
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect("refuses a sign-in that withheld a scope Peal needs", () =>
    Effect.gen(function* withheld() {
      const on = yield* onPinterest();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(
        manager(workspaceId),
        "pinterest",
        noHandle
      );

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "pinterest",
          callbackOf(
            on.pinterest.approve(
              url,
              "boards:read,pins:read,user_accounts:read"
            )
          )
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect("refreshes a due token, keeping each new refresh token", () =>
    Effect.gen(function* refreshes() {
      const on = yield* onPinterest();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const jobs = tokenJobs(workspaceId, on.authorizer);

      const refresh = RefreshChannelTokens.use((tokens) =>
        tokens.refresh(channel.id)
      ).pipe(Effect.provide(jobs));

      // Not due: 30 days left.
      assert.strictEqual(yield* refresh, "skipped");

      yield* makeDue(channel);

      const now = yield* DateTime.now;

      assert.strictEqual(yield* refresh, "refreshed");
      assert.deepStrictEqual(yield* storedTokens(channel), {
        access: "pina_synthetic_2",
        refresh: Option.some("pinr_synthetic_2"),
      });

      const renewed = yield* ChannelRepository.use((channels) =>
        channels.get(channel.id)
      ).pipe(Effect.map(Option.getOrThrow));

      assert(renewed.token._tag === "refreshable");
      assert.isTrue(
        DateTime.isGreaterThanOrEqualTo(
          renewed.token.expiresAt,
          DateTime.addDuration(now, Duration.days(30))
        )
      );

      yield* makeDue(channel);
      assert.strictEqual(yield* refresh, "refreshed");
      assert.deepStrictEqual(on.pinterest.usedRefreshTokens(), [
        "pinr_synthetic_1",
        "pinr_synthetic_2",
      ]);
    }).pipe(Effect.scoped)
  );

  it.effect(
    "renews a token Pinterest refused, then calls again with the new one",
    () =>
      Effect.gen(function* renews() {
        const on = yield* onPinterest();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connected(on, workspaceId);
        const calls: string[] = [];

        const result = yield* ChannelAccess.use((access) =>
          access.withToken(channel.id, ({ accessToken }) => {
            const token = Redacted.value(accessToken);

            calls.push(token);

            return token === "pina_synthetic_1"
              ? Effect.fail(new TokenRejected())
              : Effect.succeed("pinned");
          })
        ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

        assert.strictEqual(result, "pinned");
        assert.deepStrictEqual(calls, ["pina_synthetic_1", "pina_synthetic_2"]);
      }).pipe(Effect.scoped)
  );

  it.effect("asks to reconnect once the refresh token no longer works", () =>
    Effect.gen(function* revoked() {
      const on = yield* onPinterest();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* connected(on, workspaceId);
      const notices = yield* RecordedNotices;

      on.pinterest.revokeAll();
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
    "leaves the channel alone when Pinterest is down, slows Peal or refuses its app",
    () =>
      Effect.gen(function* unavailable() {
        const on = yield* onPinterest();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* connected(on, workspaceId);

        on.pinterest.failNext("POST /v5/oauth/token", [
          { body: { code: 0, message: "Service unavailable" }, status: 503 },
          { body: { code: 8, message: "Rate limit exceeded" }, status: 429 },
          // The app's own credentials refused: the operator's to fix.
          { body: { code: 2, message: "Authentication failed." }, status: 401 },
          // Pages of a server on the way, which say nothing of the token.
          { body: { error: "Forbidden" }, status: 403 },
          { body: { error: "Not found" }, status: 404 },
        ]);
        yield* makeDue(channel);

        const refresh = RefreshChannelTokens.use((tokens) =>
          tokens.refresh(channel.id)
        ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

        for (const _answer of [503, 429, 401, 403, 404]) {
          assert.strictEqual(yield* refresh, "unavailable");
        }

        assert.deepStrictEqual(yield* statusOf(channel), Option.some("active"));

        // Pinterest answered none: the refresh token still works.
        assert.strictEqual(yield* refresh, "refreshed");
      }).pipe(Effect.scoped)
  );
});

// Synthetic channels, connected without the platform.
const fill = Effect.fn("test.fill")(function* fill(
  workspaceId: WorkspaceId,
  count: number
) {
  const repository = yield* ChannelRepository;

  for (let added = 0; added < count; added += 1) {
    const channel = yield* freshChannel(workspaceId, {
      accountId: `synthetic-${String(added)}`,
    });

    yield* repository.insert(channel, syntheticCredentials(channel));
  }
});

// The free plan, which allows 3 channels.
const FreePlanTest = Layer.mergeAll(
  connectAdaptersOn(everyWorkspaceOn("free")),
  RecordedNotices.layer
);

layer(FreePlanTest)("connecting a Pinterest account on the free plan", (it) => {
  it.effect(
    "refuses a new account once the plan's channels are taken, saying what the plan allows",
    () =>
      Effect.gen(function* full() {
        const on = yield* onPinterest();
        const workspaceId = yield* freshWorkspace;

        yield* fill(workspaceId, 3);

        assert.deepStrictEqual(
          yield* Effect.flip(
            on.connect.start(manager(workspaceId), "pinterest", noHandle)
          ),
          new PlanLimitReached({
            allowed: 3,
            limit: "channels",
            needed: 4,
            used: 3,
          })
        );
      }).pipe(Effect.scoped)
  );
});
