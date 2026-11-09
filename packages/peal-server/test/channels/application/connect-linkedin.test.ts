import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option, Redacted } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { reconnectWarningFrom } from "#channels/domain/channel.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import {
  authorizersOf,
  ConnectAdaptersTest,
  connectChannelOver,
  connectedChannel,
  linkedinAuthorizerOn,
} from "#test/channels/connect-support.ts";
import {
  fakeLinkedIn,
  linkedinClient,
  linkedinMember,
} from "#test/channels/fakes/fake-linkedin.ts";
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

// LinkedIn, and the use case connecting its synthetic member.
const onLinkedIn = Effect.fn("test.onLinkedIn")(function* onLinkedIn() {
  const linkedin = yield* fakeLinkedIn();
  const authorizer = yield* linkedinAuthorizerOn(linkedin.endpoints);
  const connect = yield* connectChannelOver(authorizer);

  return { authorizer, connect, linkedin };
});

const startAndApprove = Effect.fn("test.startAndApprove")(
  function* startAndApprove(
    on: Effect.Success<ReturnType<typeof onLinkedIn>>,
    workspaceId: WorkspaceId
  ) {
    const url = yield* on.connect.start(manager(workspaceId), "linkedin", {
      handle: Option.none(),
      instance: Option.none(),
    });

    return yield* on.connect
      .complete(
        manager(workspaceId),
        "linkedin",
        callbackOf(on.linkedin.approve(url))
      )
      .pipe(Effect.flatMap(connectedChannel));
  }
);

// The use case's adapters, and notices recorded rather than sent.
const AdaptersTest = Layer.mergeAll(ConnectAdaptersTest, RecordedNotices.layer);

layer(AdaptersTest)("connecting a LinkedIn member", (it) => {
  it.effect("connects the member who approves, for 60 days", () =>
    Effect.gen(function* connects() {
      const on = yield* onLinkedIn();
      const workspaceId = yield* freshWorkspace;

      const authorizationUrl = yield* on.connect.start(
        manager(workspaceId),
        "linkedin",
        { handle: Option.none(), instance: Option.none() }
      );

      const url = new URL(authorizationUrl);

      assert.strictEqual(url.pathname, "/oauth/v2/authorization");
      assert.strictEqual(
        url.searchParams.get("client_id"),
        linkedinClient.clientId
      );
      assert.strictEqual(url.searchParams.get("response_type"), "code");
      assert.strictEqual(
        url.searchParams.get("scope"),
        "openid profile w_member_social"
      );
      assert.strictEqual(
        url.searchParams.get("redirect_uri"),
        "https://acme.test/connect/linkedin/callback"
      );
      assert.isNull(url.searchParams.get("code_challenge"));

      const before = yield* DateTime.now;

      const channel = yield* on.connect
        .complete(
          manager(workspaceId),
          "linkedin",
          callbackOf(on.linkedin.approve(authorizationUrl))
        )
        .pipe(Effect.flatMap(connectedChannel));

      assert.strictEqual(channel.platform, "linkedin");
      assert.strictEqual(channel.accountId, linkedinMember.sub);
      assert.strictEqual(channel.handle, "Alice Example");
      assert.deepStrictEqual(
        channel.avatarUrl.pipe(Option.map(String)),
        Option.some(linkedinMember.picture)
      );
      assert.deepStrictEqual(channel.scopes, [
        "openid",
        "profile",
        "w_member_social",
      ]);
      assert(channel.token._tag === "nonRefreshable");

      // The 60 days LinkedIn gave, from the exchange.
      const lifetime = DateTime.distance(before, channel.token.expiresAt);

      assert.isTrue(
        Duration.isGreaterThanOrEqualTo(lifetime, Duration.days(60)) &&
          Duration.isLessThan(
            lifetime,
            Duration.sum(Duration.days(60), Duration.minutes(1))
          )
      );
    }).pipe(Effect.scoped)
  );

  it.effect("asks to reconnect a week before the token runs out", () =>
    Effect.gen(function* warns() {
      const on = yield* onLinkedIn();
      const channel = yield* startAndApprove(on, yield* freshWorkspace);

      assert(channel.token._tag === "nonRefreshable");
      assert.deepStrictEqual(
        reconnectWarningFrom(channel.token),
        Option.some(
          DateTime.subtractDuration(channel.token.expiresAt, Duration.days(7))
        )
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "reconnects the channel with a new token, for the same member",
    () =>
      Effect.gen(function* reconnects() {
        const on = yield* onLinkedIn();
        const workspaceId = yield* freshWorkspace;
        const channel = yield* startAndApprove(on, workspaceId);

        const url = yield* on.connect.reconnect(
          manager(workspaceId),
          channel.id
        );

        const again = yield* on.connect
          .complete(
            manager(workspaceId),
            "linkedin",
            callbackOf(on.linkedin.approve(url))
          )
          .pipe(Effect.flatMap(connectedChannel));

        assert.strictEqual(again.id, channel.id);
        assert.deepStrictEqual(again.status, { _tag: "active" });

        // Another member, signed in on the reconnect, is refused.
        on.linkedin.addMember({
          ...linkedinMember,
          name: "Bob Example",
          sub: "zY9xW8vU7t",
        });

        const other = yield* on.connect.reconnect(
          manager(workspaceId),
          channel.id
        );

        const refused = yield* on.connect
          .complete(
            manager(workspaceId),
            "linkedin",
            callbackOf(on.linkedin.approve(other, "zY9xW8vU7t"))
          )
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "ReconnectAccountMismatch");
      }).pipe(Effect.scoped)
  );

  it.effect("takes LinkedIn's cancellation as the member refusing", () =>
    Effect.gen(function* cancelled() {
      const on = yield* onLinkedIn();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(manager(workspaceId), "linkedin", {
        handle: Option.none(),
        instance: Option.none(),
      });

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "linkedin",
          callbackOf(on.linkedin.cancel(url))
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect("tells a refused code from LinkedIn being down", () =>
    Effect.gen(function* failures() {
      const on = yield* onLinkedIn();
      const workspaceId = yield* freshWorkspace;

      const start = on.connect.start(manager(workspaceId), "linkedin", {
        handle: Option.none(),
        instance: Option.none(),
      });

      // A code LinkedIn never issued.
      const forged = yield* start;

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "linkedin",
          callbackOf({
            code: "linkedin-code-forged",
            state: new URL(forged).searchParams.get("state") ?? "",
          })
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationFailed");

      on.linkedin.failNext("POST /oauth/v2/accessToken", [
        { body: { message: "Service unavailable" }, status: 503 },
      ]);

      const url = yield* start;

      const down = yield* on.connect
        .complete(
          manager(workspaceId),
          "linkedin",
          callbackOf(on.linkedin.approve(url))
        )
        .pipe(Effect.flip);

      assert.strictEqual(down._tag, "PlatformUnavailable");
    }).pipe(Effect.scoped)
  );

  // LinkedIn renews no token: one it refuses can only be replaced by the
  // member signing in again.
  it.effect("asks the workspace to reconnect a token LinkedIn refuses", () =>
    Effect.gen(function* refused() {
      const on = yield* onLinkedIn();
      const workspaceId = yield* freshWorkspace;
      const channel = yield* startAndApprove(on, workspaceId);
      const notices = yield* RecordedNotices;

      const access = ChannelAccess.layer.pipe(
        Layer.provide(repositoryScopedTo(workspaceId)),
        Layer.provide(
          Layer.succeed(PlatformAuthorizers, authorizersOf(on.authorizer))
        )
      );

      const calls: string[] = [];

      const failure = yield* ChannelAccess.use((channels) =>
        channels.withToken(channel.id, ({ accessToken }) => {
          calls.push(Redacted.value(accessToken));

          return Effect.fail(new TokenRejected());
        })
      ).pipe(Effect.provide(access), Effect.flip);

      const marked = yield* ChannelRepository.use((channels) =>
        channels.get(channel.id)
      );

      assert.strictEqual(failure._tag, "TokenExpired");
      assert.deepStrictEqual(calls, ["linkedin-token-1"]);
      assert.deepStrictEqual(
        marked.pipe(Option.map(({ status }) => status._tag)),
        Option.some("refreshNeeded")
      );
      assert.deepStrictEqual(
        (yield* notices.of(workspaceId)).map(({ kind }) => kind),
        ["reconnectRequired"]
      );
    }).pipe(Effect.scoped)
  );
});
