import { assert, layer } from "@effect/vitest";
import { Effect, Option, Redacted, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ConnectChannel } from "#channels/application/connect-channel.ts";
import type { AuthorizationCallback } from "#channels/application/platform-authorizer.ts";
import {
  EncryptedTokenSchema,
  TokenCipher,
} from "#channels/application/token-cipher.ts";
import { Actor } from "#shared/domain/access.ts";
import { ChannelIdSchema, UserIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import {
  connectedChannel,
  MastodonConnectTest,
  mastodonInstance,
} from "#test/channels/connect-support.ts";
import { mastodonAccount } from "#test/channels/fakes/fake-mastodon.ts";
import { actorIn, freshWorkspace } from "#test/channels/support.ts";

const manager = (workspaceId: WorkspaceId) =>
  actorIn(workspaceId, ["channel:read", "channel:connect"]);

// Another member of the same workspace, with the same permissions.
const colleague = (workspaceId: WorkspaceId) =>
  new Actor({
    permissions: ["channel:read", "channel:connect"],
    subject: {
      _tag: "user",
      impersonatedBy: Option.none(),
      userId: UserIdSchema.make("9c4b1d2e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"),
    },
    workspaceId,
  });

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

const Row = Schema.Struct({ value: Schema.String });

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(Row));

// A column of the channel's row, as stored.
const stored = (column: "access_token" | "refresh_token", channelId: string) =>
  SqlClient.SqlClient.use((sql) =>
    sql`SELECT ${sql(column)} AS value FROM channels.channels WHERE id = ${channelId}`.pipe(
      Effect.flatMap(decodeRows)
    )
  );

layer(MastodonConnectTest)("connecting a Mastodon account", (it) => {
  it.effect("connects the account the member approves", () =>
    Effect.gen(function* connects() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      const authorizationUrl = yield* connect.start(
        manager(workspaceId),
        "mastodon",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        }
      );

      const url = new URL(authorizationUrl);

      assert.strictEqual(url.origin, instance.url);
      assert.strictEqual(url.pathname, "/oauth/authorize");
      assert.strictEqual(url.searchParams.get("code_challenge_method"), "S256");
      assert.strictEqual(
        url.searchParams.get("scope"),
        "profile read:statuses write:statuses write:media"
      );
      assert.strictEqual(
        url.searchParams.get("redirect_uri"),
        "https://peal.test/connect/mastodon/callback"
      );

      const channel = yield* connect
        .complete(
          manager(workspaceId),
          "mastodon",
          callbackOf(instance.approve(authorizationUrl))
        )
        .pipe(Effect.flatMap(connectedChannel));

      const { host } = new URL(instance.url);

      assert.strictEqual(channel.accountId, `${mastodonAccount.id}@${host}`);
      assert.strictEqual(channel.handle, `@alice@${host}`);
      assert.deepStrictEqual(channel.displayName, Option.some("Alice Example"));
      assert.deepStrictEqual(
        channel.avatarUrl.pipe(Option.map(String)),
        Option.some(mastodonAccount.avatar_static)
      );
      assert.deepStrictEqual(channel.status, { _tag: "active" });
      assert.deepStrictEqual(channel.token, { _tag: "nonExpiring" });
      assert.deepStrictEqual(channel.scopes, [
        "profile",
        "read:statuses",
        "write:statuses",
        "write:media",
      ]);
      assert.strictEqual(channel.workspaceId, workspaceId);
    }).pipe(Effect.scoped)
  );

  it.effect("keeps the token and the app's secret encrypted at rest", () =>
    Effect.gen(function* encrypts() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;
      const cipher = yield* TokenCipher;
      const sql = yield* SqlClient.SqlClient;

      const authorizationUrl = yield* connect.start(
        manager(workspaceId),
        "mastodon",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        }
      );

      // The attempt keeps only the state's hash, and its verifier sealed.
      const state = new URL(authorizationUrl).searchParams.get("state") ?? "";

      const attempts =
        yield* sql`SELECT state_hash AS value FROM channels.connect_attempts WHERE workspace_id = ${workspaceId}`.pipe(
          Effect.flatMap(decodeRows)
        );

      assert.lengthOf(attempts, 1);
      assert.notStrictEqual(attempts[0]?.value, state);
      assert.match(attempts[0]?.value ?? "", /^[\da-f]{64}$/u);

      const channel = yield* connect
        .complete(
          manager(workspaceId),
          "mastodon",
          callbackOf(instance.approve(authorizationUrl))
        )
        .pipe(Effect.flatMap(connectedChannel));

      const [row] = yield* stored("access_token", channel.id);

      const accessToken = yield* Schema.decodeUnknownEffect(
        EncryptedTokenSchema
      )(row?.value);

      assert.notInclude(accessToken, "token-");
      assert.match(accessToken, /^test-key\./u);
      assert.strictEqual(
        Redacted.value(yield* cipher.decrypt(accessToken, channel.id)),
        "token-1"
      );

      // Bound to the channel: it opens for no other.
      const elsewhere = yield* cipher
        .decrypt(
          accessToken,
          ChannelIdSchema.make("00000000-0000-7000-8000-0000000000ff")
        )
        .pipe(Effect.flip);

      assert.strictEqual(elsewhere._tag, "TokenAuthenticationFailed");

      const secrets =
        yield* sql`SELECT client_secret AS value FROM channels.mastodon_apps WHERE instance = ${instance.url}`.pipe(
          Effect.flatMap(decodeRows)
        );

      assert.lengthOf(secrets, 1);
      assert.notInclude(secrets[0]?.value ?? "", "secret-");
      assert.match(secrets[0]?.value ?? "", /^test-key\./u);
    }).pipe(Effect.scoped)
  );

  it.effect("registers Peal's app once per instance", () =>
    Effect.gen(function* registersOnce() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      for (const actor of [manager(workspaceId), colleague(workspaceId)]) {
        yield* connect.start(actor, "mastodon", {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        });
      }

      assert.strictEqual(instance.registeredApps(), 1);
    }).pipe(Effect.scoped)
  );

  it.effect("registers again where its app cannot read statuses", () =>
    Effect.gen(function* registersAgain() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;
      const sql = yield* SqlClient.SqlClient;

      const start = connect.start(manager(workspaceId), "mastodon", {
        connection: Option.none(),
        handle: Option.none(),
        instance: Option.some(instance.url),
      });

      yield* start;

      // As an app Peal registered before it asked to read statuses.
      yield* sql`UPDATE channels.mastodon_apps SET scopes = 'profile write:statuses write:media' WHERE instance = ${instance.url}`;

      const authorizationUrl = yield* start;

      assert.strictEqual(instance.registeredApps(), 2);
      assert.strictEqual(
        new URL(authorizationUrl).searchParams.get("scope"),
        "profile read:statuses write:statuses write:media"
      );

      const channel = yield* connect
        .complete(
          manager(workspaceId),
          "mastodon",
          callbackOf(instance.approve(authorizationUrl))
        )
        .pipe(Effect.flatMap(connectedChannel));

      assert.include(channel.scopes, "read:statuses");
    }).pipe(Effect.scoped)
  );

  it.effect("asks older instances for read:accounts instead of profile", () =>
    Effect.gen(function* legacyScopes() {
      const instance = yield* mastodonInstance({ modern: false });
      const workspaceId = yield* freshWorkspace;

      const authorizationUrl = yield* ConnectChannel.use((connect) =>
        connect.start(manager(workspaceId), "mastodon", {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        })
      );

      assert.strictEqual(
        new URL(authorizationUrl).searchParams.get("scope"),
        "read:accounts read:statuses write:statuses write:media"
      );
    }).pipe(Effect.scoped)
  );

  it.effect("refuses callbacks whose state is not the member's own", () =>
    Effect.gen(function* badState() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;
      const member = manager(workspaceId);

      const authorizationUrl = yield* connect.start(member, "mastodon", {
        connection: Option.none(),
        handle: Option.none(),
        instance: Option.some(instance.url),
      });

      const back = callbackOf(instance.approve(authorizationUrl));

      const refusals = [
        // Made up.
        connect.complete(member, "mastodon", { ...back, state: "forged" }),
        // Someone else in the workspace, as with a link sent to them.
        connect.complete(colleague(workspaceId), "mastodon", back),
        // The same member, acting in another workspace.
        connect.complete(manager(yield* freshWorkspace), "mastodon", back),
        // Sent back to another platform's callback.
        connect.complete(member, "bluesky", back),
      ];

      for (const refusal of refusals) {
        const failure = yield* Effect.flip(refusal);

        assert.strictEqual(failure._tag, "InvalidConnectState");
      }

      // None of these used the attempt up: its member completes it, once.
      const channel = yield* connect
        .complete(member, "mastodon", back)
        .pipe(Effect.flatMap(connectedChannel));

      assert.strictEqual(channel.workspaceId, workspaceId);

      const replayed = yield* Effect.flip(
        connect.complete(member, "mastodon", back)
      );

      assert.strictEqual(replayed._tag, "InvalidConnectState");
    }).pipe(Effect.scoped)
  );

  it.effect("refuses a callback after the attempt expired", () =>
    Effect.gen(function* expired() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      const authorizationUrl = yield* connect.start(
        manager(workspaceId),
        "mastodon",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        }
      );

      yield* TestClock.adjust("16 minutes");

      const failure = yield* Effect.flip(
        connect.complete(
          manager(workspaceId),
          "mastodon",
          callbackOf(instance.approve(authorizationUrl))
        )
      );

      assert.strictEqual(failure._tag, "InvalidConnectState");
    }).pipe(Effect.scoped)
  );

  it.effect("connects nothing when the member refuses", () =>
    Effect.gen(function* denied() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      const authorizationUrl = yield* connect.start(
        manager(workspaceId),
        "mastodon",
        {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some(instance.url),
        }
      );

      const failure = yield* Effect.flip(
        connect.complete(
          manager(workspaceId),
          "mastodon",
          callbackOf(instance.deny(authorizationUrl))
        )
      );

      assert.strictEqual(failure._tag, "AuthorizationDenied");
    }).pipe(Effect.scoped)
  );

  it.effect("reconnects an account the workspace already has", () =>
    Effect.gen(function* again() {
      const instance = yield* mastodonInstance();
      const workspaceId = yield* freshWorkspace;
      const connect = yield* ConnectChannel;

      const connectOnce = Effect.gen(function* connecting() {
        const authorizationUrl = yield* connect.start(
          manager(workspaceId),
          "mastodon",
          {
            connection: Option.none(),
            handle: Option.none(),
            instance: Option.some(instance.url),
          }
        );

        return yield* connect
          .complete(
            manager(workspaceId),
            "mastodon",
            callbackOf(instance.approve(authorizationUrl))
          )
          .pipe(Effect.flatMap(connectedChannel));
      });

      const first = yield* connectOnce;
      const second = yield* connectOnce;

      assert.strictEqual(second.id, first.id);

      const [row] = yield* stored("access_token", first.id);
      const cipher = yield* TokenCipher;

      const token = yield* Schema.decodeUnknownEffect(EncryptedTokenSchema)(
        row?.value
      );

      assert.strictEqual(
        Redacted.value(yield* cipher.decrypt(token, first.id)),
        "token-2"
      );
    }).pipe(Effect.scoped)
  );

  it.effect("needs channel:connect", () =>
    Effect.gen(function* forbidden() {
      const workspaceId = yield* freshWorkspace;

      const failure = yield* ConnectChannel.use((connect) =>
        connect.start(actorIn(workspaceId, ["channel:read"]), "mastodon", {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.some("mastodon.example"),
        })
      ).pipe(Effect.flip);

      assert.strictEqual(failure._tag, "MissingPermission");
    })
  );

  it.effect("cannot connect a platform without a flow", () =>
    Effect.gen(function* unsupported() {
      const workspaceId = yield* freshWorkspace;

      const failure = yield* ConnectChannel.use((connect) =>
        connect.start(manager(workspaceId), "linkedin", {
          connection: Option.none(),
          handle: Option.none(),
          instance: Option.none(),
        })
      ).pipe(Effect.flip);

      assert.deepStrictEqual(failure._tag, "PlatformNotConnectable");
    })
  );
});
