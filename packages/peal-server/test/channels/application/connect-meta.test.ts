import { assert, layer } from "@effect/vitest";
import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Ref,
  Result,
  Schema,
} from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { Entitlements, unmetered } from "#billing/domain/entitlements.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { ConnectOutcome } from "#channels/application/connect-channel.ts";
import { DataDeletions } from "#channels/application/data-deletions.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import { RefreshChannelTokens } from "#channels/application/refresh-channel-tokens.ts";
import { TokenCipher } from "#channels/application/token-cipher.ts";
import type { Channel } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { DrizzleDataDeletions } from "#channels/infrastructure/drizzle-data-deletions.ts";
import { facebookAuthorizer } from "#channels/infrastructure/platforms/meta/facebook-authorizer.ts";
import { instagramAuthorizer } from "#channels/infrastructure/platforms/meta/instagram-authorizer.ts";
import { threadsAuthorizer } from "#channels/infrastructure/platforms/meta/threads-authorizer.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
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
  facebookUserId,
  fakeMeta,
  metaApp,
  pageToken,
  threadsAccount,
  threadsApp,
} from "#test/channels/fakes/fake-meta.ts";
import type { FakePage } from "#test/channels/fakes/fake-meta.ts";
import {
  actorIn,
  freshChannel,
  freshWorkspace,
  OpenOutboundGuard,
  RecordedNotices,
  syntheticCredentials,
} from "#test/channels/support.ts";

// One fake Meta for the file, whose Pages each test sets.
class FakeMeta extends Context.Service<
  FakeMeta,
  Effect.Success<ReturnType<typeof fakeMeta>>
>()("peal-server/test/channels/FakeMeta") {
  static readonly layer = Layer.effect(FakeMeta, fakeMeta({ pageSize: 2 }));
}

// The Meta authorizers as the server builds them, against the fake.
const MetaAuthorizersTest = Layer.effect(
  PlatformAuthorizers,
  Effect.gen(function* MetaAuthorizersTest() {
    const meta = yield* FakeMeta;
    const http = yield* publicHttpClient;

    const options = (app: typeof metaApp) => ({
      app,
      hosts: meta.hosts,
      http,
      publicUrl: testPublicUrl,
    });

    return authorizersOf(
      yield* facebookAuthorizer(options(metaApp)),
      yield* instagramAuthorizer(options(metaApp)),
      yield* threadsAuthorizer(options(threadsApp))
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

const MetaConnectTest = RefreshChannelTokens.layer.pipe(
  Layer.provideMerge(connectChannelWith(MetaAuthorizersTest)),
  Layer.provideMerge(RecordedNotices.layer),
  Layer.provideMerge(FakeMeta.layer)
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

const page = (id: string, fields: Partial<FakePage> = {}): FakePage => ({
  id,
  name: `Synthetic Page ${id}`,
  tasks: ["CREATE_CONTENT", "MANAGE"],
  username: `synthetic${id}`,
  ...fields,
});

// Signs in on the platform as the member would, and completes.
const signIn = Effect.fn("signIn")(function* signIn(
  workspaceId: WorkspaceId,
  platform: Platform
) {
  const meta = yield* FakeMeta;
  const connect = yield* ConnectChannel;

  const authorizationUrl = yield* connect.start(
    manager(workspaceId),
    platform,
    {
      connection: Option.none(),
      handle: Option.none(),
      instance: Option.none(),
    }
  );

  return yield* connect.complete(
    manager(workspaceId),
    platform,
    callbackOf(meta.approve(authorizationUrl))
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

layer(MetaConnectTest)("connecting Meta accounts", (it) => {
  it.effect(
    "sends the member to Facebook Login with the Pages permissions",
    () =>
      Effect.gen(function* dialog() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;

        const authorizationUrl = yield* ConnectChannel.use((connect) =>
          connect.start(manager(workspaceId), "facebook", {
            connection: Option.none(),
            handle: Option.none(),
            instance: Option.none(),
          })
        );

        const url = new URL(authorizationUrl);

        assert.strictEqual(url.origin, meta.url);
        assert.strictEqual(url.pathname, "/v27.0/dialog/oauth");
        assert.strictEqual(url.searchParams.get("client_id"), metaApp.appId);
        assert.strictEqual(
          url.searchParams.get("scope"),
          "pages_show_list,pages_read_engagement,pages_manage_posts"
        );
        assert.strictEqual(
          url.searchParams.get("redirect_uri"),
          "https://peal.test/connect/facebook/callback"
        );
        assert.strictEqual(url.searchParams.get("response_type"), "code");
      })
  );

  it.effect("connects the only Page the member manages, with its token", () =>
    Effect.gen(function* onlyPage() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;
      const only = page("101");

      meta.setPages([only]);

      const channel = yield* signIn(workspaceId, "facebook").pipe(
        Effect.flatMap(connectedChannel)
      );

      assert.strictEqual(channel.platform, "facebook");
      assert.strictEqual(channel.accountId, "101");
      assert.strictEqual(channel.handle, "@synthetic101");
      assert.deepStrictEqual(
        channel.displayName,
        Option.some("Synthetic Page 101")
      );
      assert.deepStrictEqual(channel.token, { _tag: "nonExpiring" });
      assert.include(channel.scopes, "pages_manage_posts");
      assert.strictEqual(yield* tokenOf(channel), pageToken(only));
      assert.strictEqual(yield* grantorOf(channel), facebookUserId);
    })
  );

  it.effect(
    "offers every Page the member may post on, then connects those chosen",
    () =>
      Effect.gen(function* choice() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        // Listed two at a time: all three come, but not the one where the
        // member may only read.
        meta.setPages([
          page("201"),
          page("202", { tasks: ["ANALYZE"] }),
          { id: "203", name: "Synthetic Page 203", tasks: ["CREATE_CONTENT"] },
          page("204"),
        ]);

        const offered = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        assert.deepStrictEqual(
          offered.accounts.map(({ accountId, connected, handle }) => ({
            accountId,
            connected,
            handle,
          })),
          [
            { accountId: "201", connected: false, handle: "@synthetic201" },
            {
              accountId: "203",
              connected: false,
              handle: "Synthetic Page 203",
            },
            { accountId: "204", connected: false, handle: "@synthetic204" },
          ]
        );

        const chosen = yield* connect.choose(manager(workspaceId), "facebook", {
          accountIds: ["204", "201"],
          selection: offered.selection,
        });

        assert.deepStrictEqual(
          chosen.map(({ accountId }) => accountId),
          ["204", "201"]
        );

        // A choice is made once.
        const again = yield* Effect.flip(
          connect.choose(manager(workspaceId), "facebook", {
            accountIds: ["203"],
            selection: offered.selection,
          })
        );

        assert.strictEqual(again._tag, "InvalidConnectState");

        // Signing in again marks the Pages the workspace has.
        const second = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        assert.deepStrictEqual(
          second.accounts.map(({ accountId, connected }) => [
            accountId,
            connected,
          ]),
          [
            ["201", true],
            ["203", false],
            ["204", true],
          ]
        );
      })
  );

  it.effect(
    "refuses a choice of accounts it did not offer, or not the member's",
    () =>
      Effect.gen(function* forged() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;

        meta.setPages([page("301"), page("302")]);

        const offered = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        const elsewhere = yield* Effect.flip(
          connect.choose(manager(yield* freshWorkspace), "facebook", {
            accountIds: ["301"],
            selection: offered.selection,
          })
        );

        assert.strictEqual(elsewhere._tag, "InvalidConnectState");

        const unknown = yield* Effect.flip(
          connect.choose(manager(workspaceId), "facebook", {
            accountIds: ["301", "999"],
            selection: offered.selection,
          })
        );

        assert.strictEqual(unknown._tag, "InvalidConnectState");

        const channels = yield* ChannelRepository.use((repository) =>
          repository.list(workspaceId)
        );

        assert.lengthOf(channels, 0);
      })
  );

  it.effect("lets a choice expire after a quarter of an hour", () =>
    Effect.gen(function* expires() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;

      meta.setPages([page("401"), page("402")]);

      const offered = yield* signIn(workspaceId, "facebook").pipe(
        Effect.flatMap(choiceOf)
      );

      yield* TestClock.adjust("16 minutes");

      const late = yield* Effect.flip(
        ConnectChannel.use((connect) =>
          connect.choose(manager(workspaceId), "facebook", {
            accountIds: ["401"],
            selection: offered.selection,
          })
        )
      );

      assert.strictEqual(late._tag, "InvalidConnectState");
    })
  );

  it.effect(
    "connects the Instagram accounts linked to the member's Pages",
    () =>
      Effect.gen(function* instagram() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;

        const linked = page("501", {
          instagram: {
            id: "17841400000000501",
            name: "Alice",
            username: "alice",
          },
        });

        meta.setPages([page("500"), linked]);

        const channel = yield* signIn(workspaceId, "instagram").pipe(
          Effect.flatMap(connectedChannel)
        );

        assert.strictEqual(channel.platform, "instagram");
        assert.strictEqual(channel.accountId, "17841400000000501");
        assert.strictEqual(channel.handle, "@alice");
        assert.deepStrictEqual(channel.token, { _tag: "nonExpiring" });
        // It publishes with its Page's token.
        assert.strictEqual(yield* tokenOf(channel), pageToken(linked));
        assert.strictEqual(yield* grantorOf(channel), facebookUserId);
      })
  );

  it.effect("says when the member's Pages reach no Instagram account", () =>
    Effect.gen(function* none() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;

      meta.setPages([page("601")]);

      const failure = yield* Effect.flip(signIn(workspaceId, "instagram"));

      assert.strictEqual(failure._tag, "NoAccountsToConnect");
    })
  );

  it.effect("takes a declined permission as the member refusing", () =>
    Effect.gen(function* declined() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;

      meta.setPages([page("701")]);
      meta.setDeclined(["pages_manage_posts"]);

      const failure = yield* Effect.flip(signIn(workspaceId, "facebook")).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            meta.setDeclined([]);
          })
        )
      );

      assert.strictEqual(failure._tag, "AuthorizationDenied");
    })
  );

  it.effect("connects nothing when the member cancels the dialog", () =>
    Effect.gen(function* cancelled() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      const authorizationUrl = yield* connect.start(
        manager(workspaceId),
        "facebook",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.none(),
        }
      );

      const failure = yield* Effect.flip(
        connect.complete(
          manager(workspaceId),
          "facebook",
          callbackOf(meta.deny(authorizationUrl))
        )
      );

      assert.strictEqual(failure._tag, "AuthorizationDenied");
    })
  );

  it.effect("reconnects a Page's channel to that Page, among several", () =>
    Effect.gen(function* reconnects() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      meta.setPages([page("801")]);

      const channel = yield* signIn(workspaceId, "facebook").pipe(
        Effect.flatMap(connectedChannel)
      );

      meta.setPages([page("800"), page("801"), page("802")]);

      const reconnect = (target: Channel) =>
        connect
          .reconnect(manager(workspaceId), target.id)
          .pipe(
            Effect.flatMap((authorizationUrl) =>
              connect.complete(
                manager(workspaceId),
                "facebook",
                callbackOf(meta.approve(authorizationUrl))
              )
            )
          );

      const reconnected = yield* reconnect(channel).pipe(
        Effect.flatMap(connectedChannel)
      );

      assert.strictEqual(reconnected.id, channel.id);

      // The member lost the Page meanwhile: it cannot be reconnected.
      meta.setPages([page("800")]);

      const lost = yield* Effect.flip(reconnect(channel));

      assert.strictEqual(lost._tag, "ReconnectAccountMismatch");
    })
  );

  it.effect("connects a Threads account with a long-lived token", () =>
    Effect.gen(function* threads() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      const authorizationUrl = yield* connect.start(
        manager(workspaceId),
        "threads",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.none(),
        }
      );

      const url = new URL(authorizationUrl);

      assert.strictEqual(url.pathname, "/oauth/authorize");
      assert.strictEqual(url.searchParams.get("client_id"), threadsApp.appId);
      assert.strictEqual(
        url.searchParams.get("scope"),
        "threads_basic,threads_content_publish"
      );
      assert.strictEqual(
        url.searchParams.get("redirect_uri"),
        "https://peal.test/connect/threads/callback"
      );

      const channel = yield* connect
        .complete(
          manager(workspaceId),
          "threads",
          callbackOf(meta.approve(authorizationUrl))
        )
        .pipe(Effect.flatMap(connectedChannel));

      assert.strictEqual(channel.accountId, threadsAccount.id);
      assert.strictEqual(channel.handle, "@alice_example");
      assert.deepStrictEqual(channel.displayName, Option.some("Alice Example"));
      assert.strictEqual(channel.token._tag, "refreshable");
      assert.match(yield* tokenOf(channel), /^threads-long-/u);
      assert.isNull(yield* grantorOf(channel));
    })
  );

  it.effect("renews a Threads token a week before it expires", () =>
    Effect.gen(function* renews() {
      const meta = yield* FakeMeta;
      const workspaceId = yield* freshWorkspace;
      const refresh = yield* RefreshChannelTokens;

      const channel = yield* signIn(workspaceId, "threads").pipe(
        Effect.flatMap(connectedChannel)
      );

      const issued = yield* tokenOf(channel);

      assert.strictEqual(yield* refresh.refresh(channel.id), "skipped");

      yield* TestClock.adjust(Duration.days(54));

      assert.strictEqual(yield* refresh.refresh(channel.id), "refreshed");

      const renewed = yield* tokenOf(channel);

      assert.notStrictEqual(renewed, issued);
      assert.match(renewed, /^threads-refreshed-/u);

      const refreshCall = meta
        .requests()
        .findLast(({ path }) => path === "/refresh_access_token");

      assert.strictEqual(refreshCall?.query.get("access_token"), issued);
    })
  );

  it.effect(
    "asks to reconnect a Threads account whose token Meta revoked",
    () =>
      Effect.gen(function* revoked() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;
        const refresh = yield* RefreshChannelTokens;

        const channel = yield* signIn(workspaceId, "threads").pipe(
          Effect.flatMap(connectedChannel)
        );

        meta.revoke(yield* tokenOf(channel));

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

  it.effect("lists the platforms this server connects", () =>
    Effect.gen(function* connectable() {
      const workspaceId = yield* freshWorkspace;

      const platforms = yield* ConnectChannel.use((connect) =>
        connect.connectable(manager(workspaceId))
      );

      assert.deepStrictEqual(platforms, {
        instagramConnections: ["facebookLogin"],
        linkedinConnections: [],
        platforms: ["threads", "instagram", "facebook"],
      });

      const refused = yield* Effect.flip(
        ConnectChannel.use((connect) =>
          connect.connectable(actorIn(workspaceId, ["channel:read"]))
        )
      );

      assert.strictEqual(refused._tag, "MissingPermission");
    })
  );
});

// The free plan, which allows 3 channels.
const FreePlanMetaTest = connectChannelWith(
  MetaAuthorizersTest,
  everyWorkspaceOn("free")
).pipe(Layer.provideMerge(FakeMeta.layer));

layer(FreePlanMetaTest)("choosing Meta accounts on the free plan", (it) => {
  it.effect(
    "connects none of the accounts chosen when the plan has no room for all, and lets the member choose fewer",
    () =>
      Effect.gen(function* tooMany() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;
        const repository = yield* ChannelRepository;

        const mastodon = yield* freshChannel(workspaceId);

        yield* repository.insert(mastodon, syntheticCredentials(mastodon));

        meta.setPages([page("701"), page("702"), page("703"), page("704")]);

        const offered = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        // One channel and three Pages would make four.
        const refused = yield* Effect.flip(
          connect.choose(manager(workspaceId), "facebook", {
            accountIds: ["701", "702", "703"],
            selection: offered.selection,
          })
        );

        assert.deepStrictEqual(
          refused,
          new PlanLimitReached({ allowed: 3, limit: "channels" })
        );
        assert.lengthOf(yield* repository.list(workspaceId), 1);

        // The choice is still there, for fewer accounts.
        const chosen = yield* connect.choose(manager(workspaceId), "facebook", {
          accountIds: ["701", "702"],
          selection: offered.selection,
        });

        assert.deepStrictEqual(
          chosen.map(({ accountId }) => accountId),
          ["701", "702"]
        );
        assert.lengthOf(yield* repository.list(workspaceId), 3);
      })
  );

  it.effect(
    "lets in no more channels than the plan allows when two choices are made at once",
    () =>
      Effect.gen(function* together() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;
        const repository = yield* ChannelRepository;

        meta.setPages([page("801"), page("802")]);

        const first = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        const second = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        for (const added of [1, 2]) {
          const channel = yield* freshChannel(workspaceId, {
            accountId: `synthetic-${added}`,
          });

          yield* repository.insert(channel, syntheticCredentials(channel));
        }

        // From two tabs: each finds room for one more before either adds.
        const results = yield* Effect.all(
          [
            connect.choose(manager(workspaceId), "facebook", {
              accountIds: ["801"],
              selection: first.selection,
            }),
            connect.choose(manager(workspaceId), "facebook", {
              accountIds: ["802"],
              selection: second.selection,
            }),
          ].map(Effect.result),
          { concurrency: "unbounded" }
        );

        assert.strictEqual(results.filter(Result.isSuccess).length, 1);
        assert.lengthOf(yield* repository.list(workspaceId), 3);
      })
  );
});

// How many more reads of the plan find it limiting nothing: after them, the
// workspace is on the free plan, as when a smaller plan lands while a
// member chooses.
const unmeteredReads = Ref.makeUnsafe(Number.POSITIVE_INFINITY);

const DowngradingTest = Layer.succeed(
  WorkspaceEntitlements,
  WorkspaceEntitlements.of({
    of: () =>
      Ref.getAndUpdate(unmeteredReads, (left) => left - 1).pipe(
        Effect.map((left) =>
          left > 0
            ? unmetered
            : new Entitlements({
                plan: Option.some("free"),
                subscription: Option.none(),
              })
        )
      ),
  })
);

const DowngradingMetaTest = connectChannelWith(
  MetaAuthorizersTest,
  DowngradingTest
).pipe(Layer.provideMerge(FakeMeta.layer));

layer(DowngradingMetaTest)(
  "choosing Meta accounts as the plan shrinks",
  (it) => {
    it.effect(
      "keeps a choice that connected nothing for another try, and spends one that connected an account",
      () =>
        Effect.gen(function* retried() {
          const meta = yield* FakeMeta;
          const workspaceId = yield* freshWorkspace;
          const connect = yield* ConnectChannel;
          const repository = yield* ChannelRepository;

          // As many channels as the free plan allows.
          for (const added of [1, 2, 3]) {
            const channel = yield* freshChannel(workspaceId, {
              accountId: `synthetic-${added}`,
            });

            yield* repository.insert(channel, syntheticCredentials(channel));
          }

          meta.setPages([page("1101"), page("1102"), page("1103")]);

          const offered = yield* signIn(workspaceId, "facebook").pipe(
            Effect.flatMap(choiceOf)
          );

          // The choice has room when it is checked, and none once taken.
          yield* Ref.set(unmeteredReads, 1);

          const refused = yield* Effect.flip(
            connect.choose(manager(workspaceId), "facebook", {
              accountIds: ["1101"],
              selection: offered.selection,
            })
          );

          assert.deepStrictEqual(
            refused,
            new PlanLimitReached({ allowed: 3, limit: "channels" })
          );
          assert.lengthOf(yield* repository.list(workspaceId), 3);

          // Room for one more, then none: the first goes, and the choice with
          // it.
          yield* Ref.set(unmeteredReads, 2);

          const partly = yield* Effect.flip(
            connect.choose(manager(workspaceId), "facebook", {
              accountIds: ["1101", "1102"],
              selection: offered.selection,
            })
          );

          assert.strictEqual(partly._tag, "PlanLimitReached");
          assert.lengthOf(yield* repository.list(workspaceId), 4);

          yield* Ref.set(unmeteredReads, Number.POSITIVE_INFINITY);

          const spent = yield* Effect.flip(
            connect.choose(manager(workspaceId), "facebook", {
              accountIds: ["1103"],
              selection: offered.selection,
            })
          );

          assert.strictEqual(spent._tag, "InvalidConnectState");
        })
    );
  }
);

// Connecting, with Meta's data deletion requests carried out meanwhile.
const DeletionsMetaTest = DrizzleDataDeletions.pipe(
  Layer.provideMerge(MetaConnectTest)
);

layer(DeletionsMetaTest)("Meta's data deletion requests", (it) => {
  it.effect(
    "remove the accounts a user's sign-in offers, with their Page tokens, and no one else's",
    () =>
      Effect.gen(function* offered() {
        const meta = yield* FakeMeta;
        const workspaceId = yield* freshWorkspace;
        const connect = yield* ConnectChannel;
        // A user of this run only, from the random end of the workspace id.
        const userId = `1022${workspaceId.replaceAll("-", "").slice(-12)}`;

        meta.setPages([page("1001"), page("1002")]);
        meta.setUser(`${userId}9`);

        const colleagues = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        meta.setUser(userId);

        const theirs = yield* signIn(workspaceId, "facebook").pipe(
          Effect.flatMap(choiceOf)
        );

        const now = yield* DateTime.now;

        yield* DataDeletions.use((deletions) =>
          deletions.erase({
            app: "facebook",
            code: workspaceId.replaceAll("-", ""),
            now,
            signedRequest: `synthetic.${workspaceId}`,
            userId,
          })
        );

        const gone = yield* Effect.flip(
          connect.choose(manager(workspaceId), "facebook", {
            accountIds: ["1001"],
            selection: theirs.selection,
          })
        );

        assert.strictEqual(gone._tag, "InvalidConnectState");

        const kept = yield* connect.choose(manager(workspaceId), "facebook", {
          accountIds: ["1001"],
          selection: colleagues.selection,
        });

        const [channel] = kept;

        assert.strictEqual(channel?.accountId, "1001");
        assert(channel !== undefined);
        assert.strictEqual(yield* grantorOf(channel), `${userId}9`);
      })
  );
});
