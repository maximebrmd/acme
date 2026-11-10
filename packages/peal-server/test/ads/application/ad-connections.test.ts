import { assert, layer } from "@effect/vitest";
import { Effect, Option } from "effect";

import { AdConnections } from "#ads/application/ad-connections.ts";
import { GrantStore } from "#ads/application/ports/grant-store.ts";
import { SpendAuthorizations } from "#ads/application/spend-authorizations.ts";
import { CurrencySchema, Money } from "#ads/domain/money.ts";
import type { Actor } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import {
  euroAccount,
  marketingError,
  yenAccount,
} from "#test/ads/fakes/fake-marketing-api.ts";
import type { fakeMarketingApi } from "#test/ads/fakes/fake-marketing-api.ts";
import {
  AdsTest,
  freshOwner,
  member,
  onMeta,
  tagOf,
  TestNetworks,
  through,
} from "#test/ads/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

type Api = Effect.Success<ReturnType<typeof fakeMarketingApi>>;

const stateOf = (url: string) => new URL(url).searchParams.get("state") ?? "";

// Signs the actor in to the fake, and answers what the sign-in reaches.
const signIn = Effect.fn("test.signIn")(function* signIn(actor: Actor) {
  const connections = yield* AdConnections;
  const url = yield* connections.begin(actor, "meta");

  return yield* connections.complete(actor, {
    code: Option.some("good-code"),
    error: Option.none(),
    network: "meta",
    state: stateOf(url),
  });
});

// The actor's sign-in with the account connected.
const connected = Effect.fn("test.connected")(function* connected(
  actor: Actor,
  externalIds: readonly string[] = ["1001"]
) {
  const connections = yield* AdConnections;
  const { connection } = yield* signIn(actor);

  const accounts = yield* connections.connect(
    actor,
    connection.grant.id,
    externalIds
  );

  return { accounts, connection };
});

// What the network's page sends back after a sign-in that went through.
const returnedWith = (url: string) => ({
  code: Option.some("good-code"),
  error: Option.none(),
  network: "meta" as const,
  state: stateOf(url),
});

const eur = (amount: number) =>
  new Money({ amount, currency: CurrencySchema.make("EUR") });

layer(AdsTest, { excludeTestServices: true })(
  "connecting ad accounts",
  (it) => {
    it.effect("offers nothing on a server whose operator left ads off", () =>
      Effect.gen(function* off() {
        const owner = yield* freshOwner;
        const connections = yield* AdConnections;

        yield* onMeta({}, "off");

        assert.deepStrictEqual(yield* connections.status(owner), {
          mode: "off",
          networks: [],
        });
        assert.strictEqual(
          yield* tagOf(connections.begin(owner, "meta")),
          "AdsUnavailable"
        );
      }).pipe(Effect.scoped)
    );

    it.effect(
      "lists what a sign-in reaches, and connects only what is chosen",
      () =>
        Effect.gen(function* choosing() {
          const owner = yield* freshOwner;
          const connections = yield* AdConnections;

          yield* onMeta({ accounts: [euroAccount(), yenAccount()] });

          const { accounts: offered, connection } = yield* signIn(owner);

          assert.deepStrictEqual(
            offered.map(({ connected: held, facts }) => [
              facts.externalId,
              facts.currency,
              held,
            ]),
            [
              ["1001", "EUR", false],
              ["1002", "JPY", false],
            ]
          );
          assert.isTrue(connection.maySpend);
          assert.lengthOf(yield* connections.accounts(owner), 0);

          const [account] = yield* connections.connect(
            owner,
            connection.grant.id,
            ["1002"]
          );

          assert.strictEqual(account?.account.currency, "JPY");
          assert.strictEqual(account?.account.timeZone, "Asia/Tokyo");
          assert.deepStrictEqual(
            account?.account.spendCap,
            Option.some(500_000)
          );
          // Spending is off until an owner says otherwise.
          assert.deepStrictEqual(account?.authorization, { _tag: "off" });
          assert.lengthOf(yield* connections.accounts(owner), 1);

          const again = yield* connections.reachable(
            owner,
            connection.grant.id
          );

          assert.deepStrictEqual(
            again.map(({ connected: held }) => held),
            [false, true]
          );
        }).pipe(Effect.scoped)
    );

    it.effect("keeps the token encrypted, bound to its grant", () =>
      Effect.gen(function* sealed() {
        const owner = yield* freshOwner;
        const grants = yield* GrantStore;

        yield* onMeta();

        const { connection } = yield* signIn(owner);
        const stored = yield* grants.token(connection.grant.id);

        assert.isTrue(
          Option.exists(
            stored,
            ({ token }) =>
              token.startsWith("test-key.") && !token.includes("synthetic-ads")
          )
        );
      }).pipe(Effect.scoped)
    );

    it.effect(
      "connects an account once, and signing in again keeps the grant",
      () =>
        Effect.gen(function* again() {
          const owner = yield* freshOwner;
          const connections = yield* AdConnections;

          yield* onMeta();

          const first = yield* connected(owner);
          const second = yield* connected(owner);

          assert.strictEqual(
            first.connection.grant.id,
            second.connection.grant.id
          );
          assert.strictEqual(
            first.accounts[0]?.account.id,
            second.accounts[0]?.account.id
          );
          assert.lengthOf(yield* connections.accounts(owner), 1);
          assert.lengthOf(yield* connections.list(owner), 1);
        }).pipe(Effect.scoped)
    );

    it.effect(
      "refuses an account the sign-in does not reach, or whose zone is unknown",
      () =>
        Effect.gen(function* unreachable() {
          const owner = yield* freshOwner;
          const connections = yield* AdConnections;

          yield* onMeta({
            accounts: [{ ...euroAccount(), timezone_name: "Mars/Olympus" }],
          });

          const { accounts: offered, connection } = yield* signIn(owner);

          assert.deepStrictEqual(
            offered[0]?.unsupported,
            Option.some("timeZoneUnknown")
          );

          for (const ids of [["9999"], ["1001"], []]) {
            assert.strictEqual(
              yield* tagOf(
                connections.connect(owner, connection.grant.id, ids)
              ),
              "AdAccountNotFound"
            );
          }
        }).pipe(Effect.scoped)
    );

    it.effect(
      "completes a sign-in once, for who started it, in their workspace",
      () =>
        Effect.gen(function* once() {
          const owner = yield* freshOwner;
          const connections = yield* AdConnections;

          yield* onMeta();

          const other = member(
            owner.workspaceId,
            "admin",
            UserIdSchema.make("3f2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d")
          );

          const stolen = yield* connections.begin(owner, "meta");

          assert.strictEqual(
            yield* tagOf(connections.complete(other, returnedWith(stolen))),
            "AdSignInFailed"
          );

          // The attempt is still the owner's, and works once.
          yield* connections.complete(owner, returnedWith(stolen));

          assert.strictEqual(
            yield* tagOf(connections.complete(owner, returnedWith(stolen))),
            "AdSignInFailed"
          );

          const refused = yield* connections.begin(owner, "meta");

          assert.strictEqual(
            yield* tagOf(
              connections.complete(owner, {
                ...returnedWith(refused),
                code: Option.none(),
                error: Option.some("access_denied"),
              })
            ),
            "AdSignInFailed"
          );
        }).pipe(Effect.scoped)
    );

    it.effect("leaves another member's sign-in to them", () =>
      Effect.gen(function* theirs() {
        const owner = yield* freshOwner;
        const connections = yield* AdConnections;

        yield* onMeta({ accounts: [euroAccount(), yenAccount()] });

        const { connection } = yield* connected(owner);

        const admin = member(
          owner.workspaceId,
          "admin",
          UserIdSchema.make("3f2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d")
        );

        assert.strictEqual(
          yield* tagOf(connections.reachable(admin, connection.grant.id)),
          "AdConnectionNotFound"
        );
        assert.strictEqual(
          yield* tagOf(
            connections.connect(admin, connection.grant.id, ["1002"])
          ),
          "AdConnectionNotFound"
        );
        // They read what is connected, and may disconnect it.
        assert.lengthOf(yield* connections.accounts(admin), 1);
      }).pipe(Effect.scoped)
    );

    it.effect(
      "signs in only a person, in their own session, who manages ad accounts",
      () =>
        Effect.gen(function* persons() {
          const owner = yield* freshOwner;
          const connections = yield* AdConnections;

          yield* onMeta();

          const everything = permissionsFor("owner");

          assert.strictEqual(
            yield* tagOf(
              connections.begin(
                through(owner, { _tag: "apiKey", permissions: everything }),
                "meta"
              )
            ),
            "PersonRequired"
          );
          assert.strictEqual(
            yield* tagOf(
              connections.begin(
                through(owner, {
                  _tag: "application",
                  permissions: everything,
                }),
                "meta"
              )
            ),
            "PersonRequired"
          );
          assert.strictEqual(
            yield* tagOf(
              connections.begin(through(owner, { _tag: "staff" }), "meta")
            ),
            "PersonRequired"
          );

          for (const role of ["editor", "contributor", "viewer"] as const) {
            assert.strictEqual(
              yield* tagOf(
                connections.begin(member(owner.workspaceId, role), "meta")
              ),
              "MissingPermission"
            );
          }

          // Editors read ads; contributors and viewers do not.
          assert.strictEqual(
            yield* tagOf(
              connections.accounts(member(owner.workspaceId, "editor"))
            ),
            "succeeded"
          );
          assert.strictEqual(
            yield* tagOf(
              connections.accounts(member(owner.workspaceId, "viewer"))
            ),
            "MissingPermission"
          );
        }).pipe(Effect.scoped)
    );

    it.effect(
      "marks a sign-in whose token the network refuses, and tells once",
      () =>
        Effect.gen(function* refused() {
          const owner = yield* freshOwner;
          const connections = yield* AdConnections;
          const api: Api = yield* onMeta();
          const { connection } = yield* connected(owner);

          api.expectToken("another-token");

          for (const _ of [1, 2]) {
            assert.strictEqual(
              yield* tagOf(connections.reachable(owner, connection.grant.id)),
              "AdNetworkUnavailable"
            );
          }

          const [grant] = yield* connections.list(owner);
          const [account] = yield* connections.accounts(owner);

          assert.strictEqual(grant?.grant.access, "reconnectNeeded");
          assert.strictEqual(account?.account.access, "reconnectNeeded");
          assert.deepStrictEqual(
            (yield* TestNetworks.use((networks) =>
              networks.told(owner.workspaceId)
            )).map(({ news }) => news),
            ["reconnectNeeded"]
          );

          // Signing in again makes it work.
          api.expectToken("synthetic-ads-user-token");
          yield* signIn(owner);

          assert.strictEqual(
            (yield* connections.accounts(owner))[0]?.account.access,
            "working"
          );
        }).pipe(Effect.scoped)
    );

    it.effect(
      "answers a limit of the network as unavailable, with the wait",
      () =>
        Effect.gen(function* limited() {
          const owner = yield* freshOwner;
          const connections = yield* AdConnections;
          const api: Api = yield* onMeta();
          const { connection } = yield* connected(owner);

          api.script({
            answer: marketingError(17, 2_446_079, 400, {
              "retry-after": "90",
            }),
            when: ({ path }) => path.endsWith("/me/adaccounts"),
          });

          const failure = yield* Effect.flip(
            connections.reachable(owner, connection.grant.id)
          );

          assert.strictEqual(failure._tag, "AdNetworkUnavailable");
          // The grant still works: a limit is not a refusal of the token.
          assert.strictEqual(
            (yield* connections.list(owner))[0]?.grant.access,
            "working"
          );
        }).pipe(Effect.scoped)
    );

    it.effect("removes an account, and a sign-in with all it connects", () =>
      Effect.gen(function* removing() {
        const owner = yield* freshOwner;
        const connections = yield* AdConnections;

        yield* onMeta({ accounts: [euroAccount(), yenAccount()] });

        const { accounts, connection } = yield* connected(owner, [
          "1001",
          "1002",
        ]);

        yield* connections.removeAccount(owner, accounts[0]?.account.id ?? "");

        assert.lengthOf(yield* connections.accounts(owner), 1);
        assert.strictEqual(
          yield* tagOf(connections.removeAccount(owner, "not-an-id")),
          "AdAccountNotFound"
        );

        yield* connections.disconnect(owner, connection.grant.id);

        assert.lengthOf(yield* connections.accounts(owner), 0);
        assert.lengthOf(yield* connections.list(owner), 0);
      }).pipe(Effect.scoped)
    );
  }
);

layer(AdsTest, { excludeTestServices: true })(
  "allowing an ad account to spend",
  (it) => {
    it.effect(
      "is the owner's alone, in their own session, with a ceiling in the account's currency",
      () =>
        Effect.gen(function* deciding() {
          const owner = yield* freshOwner;
          const spending = yield* SpendAuthorizations;

          yield* onMeta();

          const { accounts } = yield* connected(owner);
          const accountId = accounts[0]?.account.id ?? "";
          const on = { _tag: "on" as const, monthlyCeiling: eur(50_000) };

          assert.strictEqual(
            yield* tagOf(
              spending.decide(member(owner.workspaceId, "admin"), accountId, on)
            ),
            "MissingPermission"
          );
          assert.strictEqual(
            yield* tagOf(
              spending.decide(
                through(owner, {
                  _tag: "apiKey",
                  permissions: permissionsFor("owner"),
                }),
                accountId,
                on
              )
            ),
            "PersonRequired"
          );
          assert.strictEqual(
            yield* tagOf(
              spending.decide(
                through(owner, {
                  _tag: "application",
                  permissions: permissionsFor("owner"),
                }),
                accountId,
                on
              )
            ),
            "PersonRequired"
          );
          assert.strictEqual(
            yield* tagOf(
              spending.decide(owner, accountId, {
                _tag: "on",
                monthlyCeiling: new Money({
                  amount: 50_000,
                  currency: CurrencySchema.make("USD"),
                }),
              })
            ),
            "CeilingCurrencyMismatch"
          );

          const standing = yield* spending.decide(owner, accountId, on);

          assert.strictEqual(standing.account.authorization._tag, "on");
          assert.strictEqual(standing.committedThisMonth, 0);

          const lowered = yield* spending.decide(owner, accountId, {
            _tag: "on",
            monthlyCeiling: eur(10_000),
          });

          assert.deepStrictEqual(
            lowered.account.authorization._tag === "on"
              ? lowered.account.authorization.monthlyCeiling
              : 0,
            10_000
          );

          const off = yield* spending.decide(owner, accountId, { _tag: "off" });

          assert.deepStrictEqual(off.account.authorization, { _tag: "off" });
        }).pipe(Effect.scoped)
    );

    it.effect("is refused on a server whose operator offers reading only", () =>
      Effect.gen(function* readOnly() {
        const owner = yield* freshOwner;
        const spending = yield* SpendAuthorizations;

        yield* onMeta({}, "read");

        const { accounts, connection } = yield* connected(owner);

        assert.isFalse(connection.maySpend);
        assert.strictEqual(
          yield* tagOf(
            spending.decide(owner, accounts[0]?.account.id ?? "", {
              _tag: "on",
              monthlyCeiling: eur(50_000),
            })
          ),
          "SpendingUnavailable"
        );
      }).pipe(Effect.scoped)
    );
  }
);
