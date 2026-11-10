import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Schema,
} from "effect";

import type { AdAccountFacts } from "#ads/domain/ad-account-facts.ts";
import { AdAccount } from "#ads/domain/ad-account.ts";
import { AdGrant } from "#ads/domain/ad-grant.ts";
import type { AdNetwork } from "#ads/domain/ad-network.ts";
import type { AdsMode } from "#ads/domain/ads-mode.ts";
import { AdAccountIdSchema, AdGrantIdSchema } from "#ads/domain/ids.ts";
import type { AdAccountId } from "#ads/domain/ids.ts";
import { PersonRequired } from "#ads/domain/person-required.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { UserId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { AdAccountBusy } from "./ad-account-busy.ts";
import { AdAccountNotFound } from "./ad-account-not-found.ts";
import { AdConnectionNotFound } from "./ad-connection-not-found.ts";
import { AdNetworkUnavailable } from "./ad-network-unavailable.ts";
import { AdSignInFailed } from "./ad-sign-in-failed.ts";
import { AdsUnavailable } from "./ads-unavailable.ts";
import { AccountStore } from "./ports/account-store.ts";
import type { AuthorizedAccount } from "./ports/account-store.ts";
import { AdAllowance } from "./ports/ad-allowance.ts";
import { AdNetworks } from "./ports/ad-network.ts";
import type { AdNetworkClient, ReadFailure } from "./ports/ad-network.ts";
import { AdNotices } from "./ports/ad-notices.ts";
import { BoostStore } from "./ports/boost-store.ts";
import { GrantSecrets } from "./ports/grant-secrets.ts";
import { GrantStore } from "./ports/grant-store.ts";

/** How long a sign-in may take between its start and its callback. */
export const signInLifetime = Duration.minutes(15);

/** The most ad accounts one request connects. */
export const maxAccountsPerRequest = 25;

/** What a server offers of ads, and on which networks. */
export interface AdsStatus {
  readonly mode: AdsMode;
  readonly networks: readonly AdNetwork[];
}

/**
 * An ad account a sign-in reaches, as offered to the member who signed in:
 * what the network says of it, whether the workspace already connects it,
 * and whether Peal can connect it (`unsupported` names why not).
 */
export interface OfferedAccount {
  readonly connected: boolean;
  readonly facts: AdAccountFacts;
  readonly unsupported: Option.Option<"timeZoneUnknown">;
}

/** A sign-in with the accounts it connects. */
export interface AdConnection {
  readonly grant: AdGrant;
  /** Whether its person allowed what making and running ads takes. */
  readonly maySpend: boolean;
}

const decodeGrantId = Schema.decodeUnknownOption(AdGrantIdSchema);
const decodeAccountId = Schema.decodeUnknownOption(AdAccountIdSchema);

const reading = (actor: Actor) =>
  Effect.fromResult(authorize(actor, "ads:read"));

/**
 * The member behind an actor that manages ad accounts in their own
 * session: signing in to an ad network hands Peal a person's access to
 * their ad accounts, which no key and no application does for them.
 */
const personManaging = (actor: Actor) =>
  Effect.gen(function* managing() {
    yield* Effect.fromResult(authorize(actor, "ads:manage"));

    const { subject } = actor;

    if (
      subject._tag !== "user" ||
      subject.clientId !== undefined ||
      Option.isSome(subject.impersonatedBy)
    ) {
      return yield* new PersonRequired();
    }

    return subject.userId;
  });

/**
 * Connecting ad accounts to a workspace, for someone acting in it. Each
 * use case checks the actor first, then works in the actor's workspace
 * only.
 *
 * | Use case                      | Needs                              |
 * | ----------------------------- | ---------------------------------- |
 * | `status`, `list`, `accounts`  | ads:read                           |
 * | `begin`, `complete`           | ads:manage, in person              |
 * | `reachable`, `connect`        | ads:manage, by who signed in       |
 * | `disconnect`, `removeAccount` | ads:manage                         |
 *
 * Disconnecting is refused while a boost of the account may still spend:
 * it is stopped first, so nothing runs that Peal no longer sees.
 */
export class AdConnections extends Context.Service<
  AdConnections,
  {
    readonly status: (
      actor: Actor
    ) => Effect.Effect<AdsStatus, MissingPermission>;
    /** Where to send the member's browser to sign in to the network. */
    readonly begin: (
      actor: Actor,
      network: AdNetwork
    ) => Effect.Effect<
      string,
      AdsUnavailable | DatabaseError | MissingPermission | PersonRequired
    >;
    /**
     * Completes a sign-in with what the network's callback brought, and
     * answers the accounts it reaches. Nothing is connected yet.
     */
    readonly complete: (
      actor: Actor,
      returned: {
        readonly code: Option.Option<string>;
        readonly error: Option.Option<string>;
        readonly network: AdNetwork;
        readonly state: string;
      }
    ) => Effect.Effect<
      {
        readonly accounts: readonly OfferedAccount[];
        readonly connection: AdConnection;
      },
      | AdNetworkUnavailable
      | AdSignInFailed
      | AdsUnavailable
      | DatabaseError
      | MissingPermission
      | PersonRequired
    >;
    /** The accounts a sign-in of the member's reaches now. */
    readonly reachable: (
      actor: Actor,
      connectionId: string
    ) => Effect.Effect<
      readonly OfferedAccount[],
      | AdConnectionNotFound
      | AdNetworkUnavailable
      | AdsUnavailable
      | DatabaseError
      | MissingPermission
      | PersonRequired
    >;
    /** Connects some of the accounts a sign-in of the member's reaches. */
    readonly connect: (
      actor: Actor,
      connectionId: string,
      externalIds: readonly string[]
    ) => Effect.Effect<
      readonly AuthorizedAccount[],
      | AdAccountNotFound
      | AdConnectionNotFound
      | AdNetworkUnavailable
      | AdsUnavailable
      | DatabaseError
      | MissingPermission
      | PersonRequired
    >;
    readonly list: (
      actor: Actor
    ) => Effect.Effect<
      readonly AdConnection[],
      DatabaseError | MissingPermission
    >;
    readonly accounts: (
      actor: Actor
    ) => Effect.Effect<
      readonly AuthorizedAccount[],
      DatabaseError | MissingPermission
    >;
    readonly account: (
      actor: Actor,
      accountId: string
    ) => Effect.Effect<
      AuthorizedAccount,
      AdAccountNotFound | DatabaseError | MissingPermission
    >;
    /** Removes a sign-in, its token and the accounts it connects. */
    readonly disconnect: (
      actor: Actor,
      connectionId: string
    ) => Effect.Effect<
      void,
      AdAccountBusy | AdConnectionNotFound | DatabaseError | MissingPermission
    >;
    readonly removeAccount: (
      actor: Actor,
      accountId: string
    ) => Effect.Effect<
      void,
      AdAccountBusy | AdAccountNotFound | DatabaseError | MissingPermission
    >;
  }
>()("peal-server/ads/application/AdConnections") {
  static readonly layer = Layer.effect(
    AdConnections,
    Effect.gen(function* AdConnectionsLive() {
      const networks = yield* AdNetworks;
      const grants = yield* GrantStore;
      const secrets = yield* GrantSecrets;
      const accounts = yield* AccountStore;
      const boosts = yield* BoostStore;
      const allowance = yield* AdAllowance;
      const notices = yield* AdNotices;
      const ids = yield* Effect.context<Ids>();

      const clientFor = (network: AdNetwork) =>
        networks.mode === "off"
          ? Effect.fail(new AdsUnavailable())
          : Effect.fromOption(networks.for(network)).pipe(
              Effect.mapError(() => new AdsUnavailable())
            );

      // What a failed read of the network means to a member: a refused
      // token marks the grant, and its person is told once.
      const readFailed =
        (grant: AdGrant) =>
        (
          failure: ReadFailure
        ): Effect.Effect<never, AdNetworkUnavailable | DatabaseError> =>
          Effect.gen(function* failing() {
            if (failure._tag === "TokenRejected") {
              const now = yield* DateTime.now;

              if (yield* grants.markRejected(grant.id, now)) {
                yield* notices.reconnectNeeded(grant);
              }
            }

            if (failure._tag === "AdNetworkRefused") {
              yield* Effect.logWarning("An ad network refused a read").pipe(
                Effect.annotateLogs({ code: failure.code, grantId: grant.id })
              );
            }

            return yield* new AdNetworkUnavailable(
              failure._tag === "RateLimited" && failure.retryAfter !== undefined
                ? { retryAfter: failure.retryAfter }
                : {}
            );
          });

      const offered = Effect.fn("AdConnections.offered")(function* offered(
        grant: AdGrant,
        facts: readonly AdAccountFacts[]
      ) {
        const connected = new Set(
          (yield* accounts.list(grant.workspaceId))
            .filter(({ account }) => account.network === grant.network)
            .map(({ account }) => account.externalId)
        );

        return facts.map((account): OfferedAccount => ({
          connected: connected.has(account.externalId),
          facts: account,
          unsupported: Option.isNone(account.timeZone)
            ? Option.some("timeZoneUnknown" as const)
            : Option.none(),
        }));
      });

      // The member's own grant, with its client and its token opened.
      const ownGrant = Effect.fn("AdConnections.ownGrant")(function* ownGrant(
        actor: Actor,
        userId: UserId,
        connectionId: string
      ) {
        const grantId = decodeGrantId(connectionId);

        const stored = Option.isNone(grantId)
          ? Option.none()
          : yield* grants.token(grantId.value);

        // Another member's sign-in reads as none: its accounts are theirs
        // to choose from.
        const own = stored.pipe(
          Option.filter(
            ({ grant }) =>
              grant.workspaceId === actor.workspaceId &&
              Option.contains(grant.grantedBy, userId)
          )
        );

        if (Option.isNone(own)) {
          return yield* new AdConnectionNotFound();
        }

        const { grant } = own.value;
        const client = yield* clientFor(grant.network);

        const token = yield* secrets
          .open(own.value.token, grant.id)
          .pipe(Effect.mapError(() => new AdConnectionNotFound()));

        return { client, grant, token };
      });

      const connection = (grant: AdGrant): AdConnection => ({
        grant,
        maySpend:
          networks.mode === "spend" &&
          Option.exists(
            networks.for(grant.network),
            (client: AdNetworkClient) => client.maySpend(grant.scopes)
          ),
      });

      // Refuses while a boost of one of the accounts may still spend, or
      // is being made.
      const ensureIdle = (accountIds: readonly AdAccountId[]) =>
        boosts
          .openOn(accountIds)
          .pipe(
            Effect.flatMap((open) =>
              open > 0
                ? Effect.fail(new AdAccountBusy({ boosts: open }))
                : Effect.void
            )
          );

      const foundAccount = Effect.fn("AdConnections.foundAccount")(
        function* foundAccount(actor: Actor, accountId: string) {
          const id = decodeAccountId(accountId);

          const found = Option.isSome(id)
            ? yield* accounts.findIn(actor.workspaceId, id.value)
            : Option.none<AuthorizedAccount>();

          return Option.isSome(found)
            ? found.value
            : yield* new AdAccountNotFound();
        }
      );

      const foundGrant = Effect.fn("AdConnections.foundGrant")(
        function* foundGrant(actor: Actor, connectionId: string) {
          const id = decodeGrantId(connectionId);

          const found = Option.isSome(id)
            ? yield* grants.findIn(actor.workspaceId, id.value)
            : Option.none<AdGrant>();

          return Option.isSome(found)
            ? found.value
            : yield* new AdConnectionNotFound();
        }
      );

      return AdConnections.of({
        account: Effect.fn("AdConnections.account")(
          function* account(actor, accountId) {
            yield* reading(actor);

            return yield* foundAccount(actor, accountId);
          }
        ),
        accounts: Effect.fn("AdConnections.accounts")(
          function* listAccounts(actor) {
            yield* reading(actor);

            return yield* accounts.list(actor.workspaceId);
          }
        ),
        begin: Effect.fn("AdConnections.begin")(
          function* begin(actor, network) {
            const userId = yield* personManaging(actor);
            const client = yield* clientFor(network);
            const { hash, state } = yield* secrets.newState;
            const now = yield* DateTime.now;

            yield* grants.saveAttempt({
              expiresAt: DateTime.addDuration(now, signInLifetime),
              network,
              startedBy: userId,
              stateHash: hash,
              workspaceId: actor.workspaceId,
            });

            return client.authorizationUrl(state);
          }
        ),
        complete: Effect.fn("AdConnections.complete")(
          function* complete(actor, returned) {
            const userId = yield* personManaging(actor);
            const client = yield* clientFor(returned.network);
            const now = yield* DateTime.now;

            const attempt = yield* grants.takeAttempt(
              yield* secrets.hashOf(returned.state),
              { startedBy: userId, workspaceId: actor.workspaceId }
            );

            if (
              Option.isNone(attempt) ||
              attempt.value.network !== returned.network ||
              DateTime.isGreaterThanOrEqualTo(now, attempt.value.expiresAt)
            ) {
              return yield* new AdSignInFailed({ reason: "expired" });
            }

            if (Option.isSome(returned.error) || Option.isNone(returned.code)) {
              return yield* new AdSignInFailed({ reason: "denied" });
            }

            const issued = yield* client
              .complete(returned.code.value)
              .pipe(
                Effect.catchTag("PlatformUnavailable", () =>
                  Effect.fail(new AdNetworkUnavailable({}))
                )
              );

            // The token is bound to the id the grant is stored under,
            // which is the earlier one's when the person signs in again.
            const sealing = (id: typeof AdGrantIdSchema.Type) =>
              secrets.seal(issued.token, id);

            const grant = yield* grants.upsert(
              new AdGrant({
                access: "working",
                createdAt: now,
                expiresAt: issued.expiresAt,
                grantedBy: Option.some(userId),
                id: yield* newId(AdGrantIdSchema).pipe(Effect.provide(ids)),
                network: returned.network,
                platformUserId: issued.platformUserId,
                scopes: issued.scopes.filter((scope) => scope !== ""),
                updatedAt: now,
                workspaceId: actor.workspaceId,
              }),
              sealing
            );

            const reached = yield* client
              .accounts(issued.token)
              .pipe(Effect.catch(readFailed(grant)));

            return {
              accounts: yield* offered(grant, reached),
              connection: connection(grant),
            };
          }
        ),
        connect: Effect.fn("AdConnections.connect")(
          function* connect(actor, connectionId, externalIds) {
            const userId = yield* personManaging(actor);

            const { client, grant, token } = yield* ownGrant(
              actor,
              userId,
              connectionId
            );

            const wanted = new Set(externalIds);

            // What the network says now, never what the request says: an
            // account the sign-in does not reach is not found.
            const reached = (yield* client
              .accounts(token)
              .pipe(Effect.catch(readFailed(grant)))).filter((facts) =>
              wanted.has(facts.externalId)
            );

            if (
              wanted.size === 0 ||
              wanted.size > maxAccountsPerRequest ||
              reached.length !== wanted.size ||
              reached.some((facts) => Option.isNone(facts.timeZone))
            ) {
              return yield* new AdAccountNotFound();
            }

            const now = yield* DateTime.now;

            return yield* accounts.addingTo(
              actor.workspaceId,
              Effect.gen(function* adding() {
                const held = yield* accounts.list(actor.workspaceId);

                const known = new Set(
                  held
                    .filter(({ account }) => account.network === grant.network)
                    .map(({ account }) => account.externalId)
                );

                const fresh = reached.filter(
                  (facts) => !known.has(facts.externalId)
                );

                // Connecting an account again adds nothing, so no limit
                // refuses it.
                if (fresh.length > 0) {
                  yield* allowance.ensureRoom({
                    adding: fresh.length,
                    used: held.length,
                    workspaceId: actor.workspaceId,
                  });
                }

                for (const facts of fresh) {
                  yield* accounts.insert(
                    new AdAccount({
                      access: "working",
                      amountSpent: facts.amountSpent,
                      connectedAt: now,
                      connectedBy: Option.some(userId),
                      currency: facts.currency,
                      externalId: facts.externalId,
                      grantId: grant.id,
                      id: yield* newId(AdAccountIdSchema).pipe(
                        Effect.provide(ids)
                      ),
                      name: facts.name,
                      network: grant.network,
                      spendCap: facts.spendCap,
                      status: facts.status,
                      syncedAt: Option.none(),
                      timeZone: Option.getOrThrow(facts.timeZone),
                      workspaceId: actor.workspaceId,
                    })
                  );
                }

                return (yield* accounts.list(actor.workspaceId)).filter(
                  ({ account }) =>
                    account.network === grant.network &&
                    wanted.has(account.externalId)
                );
              })
            );
          }
        ),
        disconnect: Effect.fn("AdConnections.disconnect")(
          function* disconnect(actor, connectionId) {
            yield* Effect.fromResult(authorize(actor, "ads:manage"));

            const grant = yield* foundGrant(actor, connectionId);
            const connected = yield* accounts.ofGrant(grant.id);

            yield* ensureIdle(connected.map(({ id }) => id));
            yield* grants.remove(actor.workspaceId, grant.id);
          }
        ),
        list: Effect.fn("AdConnections.list")(function* list(actor) {
          yield* reading(actor);

          return (yield* grants.list(actor.workspaceId)).map(connection);
        }),
        reachable: Effect.fn("AdConnections.reachable")(
          function* reachable(actor, connectionId) {
            const userId = yield* personManaging(actor);

            const { client, grant, token } = yield* ownGrant(
              actor,
              userId,
              connectionId
            );

            const reached = yield* client
              .accounts(token)
              .pipe(Effect.catch(readFailed(grant)));

            return yield* offered(grant, reached);
          }
        ),
        removeAccount: Effect.fn("AdConnections.removeAccount")(
          function* removeAccount(actor, accountId) {
            yield* Effect.fromResult(authorize(actor, "ads:manage"));

            const { account } = yield* foundAccount(actor, accountId);

            yield* ensureIdle([account.id]);
            yield* accounts.remove(actor.workspaceId, account.id);
          }
        ),
        status: Effect.fn("AdConnections.status")(function* status(actor) {
          yield* reading(actor);

          return {
            mode: networks.mode,
            networks: networks.mode === "off" ? [] : networks.available,
          };
        }),
      });
    })
  );
}
