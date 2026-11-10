import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type {
  AuthorizationCallback,
  PlatformAuthorizer,
} from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { renewToken } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { googleBusinessReach } from "#channels/infrastructure/platforms/google-business/google-business-authorizer.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  authorizersOf,
  ConnectAdaptersTest,
  connectChannelOver,
  connectedChannel,
  googleBusinessAuthorizerOn,
} from "#test/channels/connect-support.ts";
import {
  businessAccount,
  businessLocation,
  fakeGoogle,
  googleClient,
  otherBusinessLocation,
  unverifiedBusinessLocation,
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

const businessManage = "https://www.googleapis.com/auth/business.manage";

const AdaptersTest = Layer.mergeAll(ConnectAdaptersTest, RecordedNotices.layer);

// Google, and the use case connecting its synthetic locations.
const onGoogle = Effect.fn("test.onGoogle")(function* onGoogle() {
  const google = yield* fakeGoogle();

  const authorizer = yield* googleBusinessAuthorizerOn(
    google.businessEndpoints
  );

  const connect = yield* connectChannelOver(authorizer);

  return { authorizer, connect, google };
});

type OnGoogle = Effect.Success<ReturnType<typeof onGoogle>>;

// Signs in, and answers what the sign-in came to.
const signedIn = Effect.fn("test.signedIn")(function* signedIn(
  on: OnGoogle,
  workspaceId: WorkspaceId
) {
  const url = yield* on.connect.start(
    manager(workspaceId),
    "googleBusiness",
    noHandle
  );

  return yield* on.connect.complete(
    manager(workspaceId),
    "googleBusiness",
    callbackOf(on.google.approve(url))
  );
});

const connected = (on: OnGoogle, workspaceId: WorkspaceId) =>
  signedIn(on, workspaceId).pipe(Effect.flatMap(connectedChannel));

const tokenJobs = (workspaceId: WorkspaceId, authorizer: PlatformAuthorizer) =>
  Layer.mergeAll(RefreshChannelTokens.layer, ChannelAccess.layer).pipe(
    Layer.provide(repositoryScopedTo(workspaceId)),
    Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf(authorizer)))
  );

// Makes the channel's token due for the sweep: unused for a month, as
// YouTube's, Google's refresh token being the same.
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

// `count` synthetic locations of the account numbered `account`.
const locations = (account: number, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...otherBusinessLocation,
    name: `locations/3${String(account).padStart(4, "0")}${String(index).padStart(6, "0")}`,
  }));

// A location of its own, under the synthetic account: other tests leave
// theirs connected.
const locationOf = (workspaceId: WorkspaceId) => ({
  ...businessLocation,
  name: `locations/${workspaceId.replaceAll("-", "")}`,
});

layer(AdaptersTest)("connecting a Google Business Profile location", (it) => {
  it.effect(
    "asks Google for business.manage, offline, with PKCE, and connects the one location that can post",
    () =>
      Effect.gen(function* connects() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;
        const location = locationOf(workspaceId);

        on.google.setBusinessAccounts([
          {
            ...businessAccount,
            locations: [location, unverifiedBusinessLocation],
          },
        ]);

        const authorizationUrl = yield* on.connect.start(
          manager(workspaceId),
          "googleBusiness",
          noHandle
        );

        const url = new URL(authorizationUrl);

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
            redirect_uri: "https://peal.test/connect/googleBusiness/callback",
            response_type: "code",
            scope: businessManage,
          }
        );

        const now = yield* DateTime.now;

        const channel = yield* on.connect
          .complete(
            manager(workspaceId),
            "googleBusiness",
            callbackOf(on.google.approve(authorizationUrl))
          )
          .pipe(Effect.flatMap(connectedChannel));

        assert.strictEqual(channel.platform, "googleBusiness");
        // The location's name in the My Business API v4, under its account.
        assert.strictEqual(
          channel.accountId,
          `${businessAccount.name}/${location.name}`
        );
        assert.strictEqual(channel.handle, "1 Synthetic Street, Exampleville");
        assert.deepStrictEqual(
          channel.displayName,
          Option.some("Peal Example Bakery")
        );
        assert.deepStrictEqual(channel.avatarUrl, Option.none());
        assert.deepStrictEqual(channel.scopes, [businessManage]);
        assert.deepStrictEqual(channel.token, {
          _tag: "refreshable",
          expiresAt: DateTime.addDuration(now, Duration.seconds(3599)),
        });

        // Every location is asked for with the read mask Google requires.
        const listing = on.google
          .requests()
          .find(({ path }) => path.endsWith("/locations"));

        assert.strictEqual(
          listing?.query.get("readMask"),
          "name,title,storeCode,storefrontAddress,metadata"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "offers the locations of every account as a choice, each named apart",
    () =>
      Effect.gen(function* chooses() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;

        on.google.setBusinessAccounts([
          businessAccount,
          {
            locations: [otherBusinessLocation, unverifiedBusinessLocation],
            name: "accounts/200000000000000002",
          },
        ]);

        const outcome = yield* signedIn(on, workspaceId);

        assert(outcome._tag === "choose");
        assert.deepStrictEqual(
          outcome.accounts.map(({ accountId, displayName, handle }) => ({
            accountId,
            displayName: Option.getOrNull(displayName),
            handle,
          })),
          [
            {
              accountId: `${businessAccount.name}/${businessLocation.name}`,
              displayName: "Peal Example Bakery",
              handle: "1 Synthetic Street, Exampleville",
            },
            {
              accountId: `accounts/200000000000000002/${otherBusinessLocation.name}`,
              displayName: "Peal Example Bakery",
              // Without an address, the store's code.
              handle: "PEAL-002",
            },
          ]
        );
      }).pipe(Effect.scoped)
  );

  it.effect("reads every page of accounts and locations, up to its reach", () =>
    Effect.gen(function* pages() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;

      // 21 accounts take two pages; the first holds 150 locations, two
      // pages too, and the others 3 each: 210 in all.
      on.google.setBusinessAccounts(
        Array.from({ length: 21 }, (_, index) => ({
          locations: locations(index, index === 0 ? 150 : 3),
          name: `accounts/4${String(index).padStart(6, "0")}`,
        }))
      );

      const outcome = yield* signedIn(on, workspaceId);

      assert(outcome._tag === "choose");
      assert.strictEqual(
        outcome.accounts.length,
        googleBusinessReach.locations
      );
      assert.strictEqual(
        new Set(outcome.accounts.map(({ accountId }) => accountId)).size,
        googleBusinessReach.locations
      );
      assert.strictEqual(
        on.google.requests().filter(({ path }) => path === "/v1/accounts")
          .length,
        2
      );
    }).pipe(Effect.scoped)
  );

  it.effect(
    "connects nothing when no location is verified, or the account manages none",
    () =>
      Effect.gen(function* none() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;

        on.google.setBusinessAccounts([
          { ...businessAccount, locations: [unverifiedBusinessLocation] },
        ]);

        const unverified = yield* signedIn(on, workspaceId).pipe(Effect.flip);

        assert.strictEqual(unverified._tag, "NoAccountsToConnect");

        on.google.setBusinessAccounts([]);

        const empty = yield* signedIn(on, workspaceId).pipe(Effect.flip);

        assert.strictEqual(empty._tag, "NoAccountsToConnect");
      }).pipe(Effect.scoped)
  );

  it.effect("refuses a sign-in that withheld business.manage", () =>
    Effect.gen(function* withheld() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;

      const url = yield* on.connect.start(
        manager(workspaceId),
        "googleBusiness",
        noHandle
      );

      const refused = yield* on.connect
        .complete(
          manager(workspaceId),
          "googleBusiness",
          callbackOf(on.google.approve(url, ["openid"]))
        )
        .pipe(Effect.flip);

      assert.strictEqual(refused._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect(
    "fails as unavailable while Google's project has no access to the APIs",
    () =>
      Effect.gen(function* noAccess() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;

        // A project not yet approved has a quota of 0 requests a minute.
        on.google.failNext("GET /v1/accounts", [
          {
            body: {
              error: {
                code: 429,
                message: "Quota exceeded for quota metric 'Requests'",
                status: "RESOURCE_EXHAUSTED",
              },
            },
            status: 429,
          },
          {
            body: {
              error: {
                code: 403,
                message: "My Business Account Management API has not been used",
                status: "PERMISSION_DENIED",
              },
            },
            status: 403,
          },
        ]);

        const limited = yield* signedIn(on, workspaceId).pipe(Effect.flip);

        assert.strictEqual(limited._tag, "PlatformUnavailable");

        const disabled = yield* signedIn(on, workspaceId).pipe(Effect.flip);

        assert.strictEqual(disabled._tag, "AuthorizationFailed");
      }).pipe(Effect.scoped)
  );

  it.effect(
    "refreshes a due token with the grant's scope, and asks to reconnect once Google refuses",
    () =>
      Effect.gen(function* refreshes() {
        const on = yield* onGoogle();
        const workspaceId = yield* freshWorkspace;

        on.google.setBusinessAccounts([
          { ...businessAccount, locations: [locationOf(workspaceId)] },
        ]);

        const channel = yield* connected(on, workspaceId);
        const notices = yield* RecordedNotices;

        const refresh = RefreshChannelTokens.use((tokens) =>
          tokens.refresh(channel.id)
        ).pipe(Effect.provide(tokenJobs(workspaceId, on.authorizer)));

        assert.strictEqual(yield* refresh, "skipped");

        yield* makeDue(channel);
        assert.strictEqual(yield* refresh, "refreshed");

        const renewed = yield* ChannelRepository.use((channels) =>
          channels.get(channel.id)
        ).pipe(Effect.map(Option.getOrThrow));

        assert.deepStrictEqual(renewed.scopes, [businessManage]);

        on.google.revokeAll();
        yield* makeDue(renewed);

        assert.strictEqual(yield* refresh, "reconnectRequired");
        assert.deepStrictEqual(
          (yield* notices.of(workspaceId)).map(({ kind }) => kind),
          ["reconnectRequired"]
        );
      }).pipe(Effect.scoped)
  );

  it.effect("revokes the grant on disconnect", () =>
    Effect.gen(function* revokes() {
      const on = yield* onGoogle();
      const workspaceId = yield* freshWorkspace;

      on.google.setBusinessAccounts([
        { ...businessAccount, locations: [locationOf(workspaceId)] },
      ]);

      const channel = yield* connected(on, workspaceId);

      yield* DisconnectChannel.use((useCase) =>
        useCase.disconnect(manager(workspaceId), channel.id)
      ).pipe(
        Effect.provide(
          DisconnectChannel.layer.pipe(
            Layer.provide(
              Layer.succeed(PlatformAuthorizers, authorizersOf(on.authorizer))
            )
          )
        )
      );

      assert.deepStrictEqual(on.google.revoked(), ["1//synthetic-refresh-1"]);
    }).pipe(Effect.scoped)
  );
});
