import { Context, DateTime, Effect, Layer, Option, Ref, Schema } from "effect";
import type { DateTime as DateTimeType } from "effect";

import type { AvatarUrl } from "#channels/domain/avatar-url.ts";
import {
  connectChannel,
  reconnect as reconnectChannel,
} from "#channels/domain/channel.ts";
import type { Channel, ConnectedAccount } from "#channels/domain/channel.ts";
import {
  completableBy,
  startAttempt,
  starterOf,
} from "#channels/domain/connect-attempt.ts";
import { choosableBy, offerChoice } from "#channels/domain/connect-choice.ts";
import { InvalidConnectState } from "#channels/domain/invalid-connect-state.ts";
import { platforms } from "#channels/domain/platform.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { tokenLifetimeOf } from "#channels/domain/token-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import { roomFor, roomForOneMore } from "#shared/domain/allowance.ts";
import { authorize } from "#shared/domain/authorize.ts";
import {
  connectionOf,
  hasConnections,
} from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import type { InstagramConnection } from "#shared/domain/instagram-connection.ts";
import type { LinkedInConnection } from "#shared/domain/linkedin-connection.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

import { AuthorizationDenied } from "./authorization-denied.ts";
import { AuthorizationFailed } from "./authorization-failed.ts";
import { ChannelAllowance } from "./channel-allowance.ts";
import { ChannelEvents } from "./channel-events.ts";
import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotFound } from "./channel-not-found.ts";
import { ChannelRepository } from "./channel-repository.ts";
import { encryptTokens } from "./channel-tokens.ts";
import { ConnectAttempts } from "./connect-attempts.ts";
import { ConnectChoices } from "./connect-choices.ts";
import type { MissingTokenKey } from "./missing-token-key.ts";
import { NoAccountsToConnect } from "./no-accounts-to-connect.ts";
import { openOffered, sealOffered } from "./offered-accounts.ts";
import {
  PlatformAuthorizers,
  storableAuthorized,
} from "./platform-authorizer.ts";
import type {
  AuthorizationCallback,
  AuthorizedAccount,
  BeginFailure,
  CompleteFailure,
  PendingAuthorization,
  PlatformAuthorizer,
} from "./platform-authorizer.ts";
import { PlatformNotConnectable } from "./platform-not-connectable.ts";
import { ReconnectAccountMismatch } from "./reconnect-account-mismatch.ts";
import {
  choiceContext,
  connectAttemptContext,
  TokenCipher,
} from "./token-cipher.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

// The errors platforms send back when the user refuses: OAuth's own
// (RFC 6749, 4.1.2.1), and LinkedIn's, for a member who cancelled signing
// in or refused the permissions.
const denials: ReadonlySet<string> = new Set([
  "access_denied",
  "user_cancelled_authorize",
  "user_cancelled_login",
]);

/** How starting to reconnect a channel fails: as starting, but for the plan. */
export type ReconnectFailure =
  | BeginFailure
  | ChannelNotFound
  | DatabaseError
  | MissingPermission
  | MissingTokenKey
  | PlatformNotConnectable;

export type StartFailure =
  | AllowanceReached
  | Exclude<ReconnectFailure, ChannelNotFound>
  | PlanLimitReached;

export type CompleteConnectFailure =
  | AllowanceReached
  | ChannelNotFound
  | CompleteFailure
  | DatabaseError
  | InvalidConnectState
  | MissingPermission
  | MissingTokenKey
  | NoAccountsToConnect
  | PlanLimitReached
  | PlatformNotConnectable
  | ReconnectAccountMismatch;

export type ChooseFailure =
  | AllowanceReached
  | AuthorizationFailed
  | ChannelNotFound
  | DatabaseError
  | InvalidConnectState
  | MissingPermission
  | MissingTokenKey
  | PlanLimitReached
  | PlatformNotConnectable
  | ReconnectAccountMismatch;

/** What a member asked to connect. */
export interface ConnectRequest {
  /**
   * The way in, for Instagram and LinkedIn: none takes the server's first
   * (`instagramConnections`', `linkedinConnections`').
   */
  readonly connection: Option.Option<ChannelConnection>;
  readonly handle: Option.Option<string>;
  readonly instance: Option.Option<string>;
}

/** What this server can connect, as `connectable` answers it. */
export interface Connectable {
  /**
   * The ways it connects Instagram accounts, the preferred one first;
   * empty when it connects none.
   */
  readonly instagramConnections: readonly InstagramConnection[];
  /** What it connects on LinkedIn: profiles, pages, or both. */
  readonly linkedinConnections: readonly LinkedInConnection[];
  /** The platforms, in Peal's order. */
  readonly platforms: readonly Platform[];
}

/** An account a member may choose to connect, as the member sees it. */
export interface ChoosableAccount {
  readonly accountId: string;
  readonly avatarUrl: Option.Option<AvatarUrl>;
  /** Whether the workspace has it already: choosing it reconnects it. */
  readonly connected: boolean;
  readonly displayName: Option.Option<string>;
  readonly handle: string;
}

/**
 * How completing a sign-in ended: the account became a channel, or the
 * sign-in reached several accounts, which the member chooses among with
 * `selection` before `expiresAt`.
 */
export type ConnectOutcome =
  | { readonly _tag: "connected"; readonly channel: Channel }
  | {
      readonly _tag: "choose";
      readonly accounts: readonly ChoosableAccount[];
      readonly expiresAt: DateTimeType.Utc;
      readonly selection: string;
    };

// What the platform told about the account, as the channel keeps it.
const connectedOf = (
  authorizer: PlatformAuthorizer,
  account: AuthorizedAccount,
  now: DateTimeType.Utc
): ConnectedAccount => ({
  avatarUrl: account.avatarUrl,
  connection: Option.fromUndefinedOr(authorizer.connection),
  displayName: account.displayName,
  handle: account.handle,
  scopes: account.tokens.scopes,
  token: tokenLifetimeOf(authorizer.policy, account.tokens, now),
});

const connectedTo = (channel: Channel): ConnectOutcome => ({
  _tag: "connected",
  channel,
});

/**
 * Connects social accounts to the actor's workspace, in two steps around the
 * platform's sign-in page: `start` (or `reconnect`, for a channel that has
 * one) says where to send the browser, and `complete` takes what the
 * platform sent back. Each needs channel:connect.
 *
 * The attempt between them is bound to the actor and the workspace, expires
 * after a quarter of an hour, and completes once. Its secret, like the
 * channel's tokens, is stored encrypted. A sign-in that reaches several
 * accounts (a Facebook user's Pages) ends with a choice, kept the same way,
 * which `choose` completes.
 *
 * A new account needs room in the workspace's plan (`ChannelAllowance`),
 * which the workspaces of a partner share, their channels counted
 * together: checked when the connection starts, and again before each channel is
 * added. Accounts chosen together need room for all of them, checked before
 * the choice is taken, so a choice too large connects none and can be made
 * again with fewer; a choice that fails for any other reason before an
 * account is connected is kept for another try too. Reconnecting adds
 * nothing, so it needs none, nor does moving an Instagram account from one
 * way in to the other, which is checked once the account is known.
 */
export class ConnectChannel extends Context.Service<
  ConnectChannel,
  {
    /** The platform's sign-in page for a new account. */
    readonly start: (
      actor: Actor,
      platform: Platform,
      request: ConnectRequest
    ) => Effect.Effect<string, StartFailure>;
    /** The platform's sign-in page for the account of a channel. */
    readonly reconnect: (
      actor: Actor,
      channelId: string,
      // `messages`: the sign-in also asks for the account's direct
      // messages, where the platform asks for them apart.
      options?: { readonly messages?: boolean; readonly reposts?: boolean }
    ) => Effect.Effect<string, ReconnectFailure>;
    /**
     * The channel the account became, or the one it reconnected, or the
     * accounts to choose from. An account the workspace already has is
     * reconnected rather than added twice.
     */
    readonly complete: (
      actor: Actor,
      platform: Platform,
      callback: AuthorizationCallback
    ) => Effect.Effect<ConnectOutcome, CompleteConnectFailure>;
    /**
     * Connects the accounts the member chose among those a sign-in
     * reached, once: the channels they became or reconnected, in order. A
     * choice that fails before connecting any stays to make again.
     */
    readonly choose: (
      actor: Actor,
      platform: Platform,
      choice: {
        readonly accountIds: readonly string[];
        readonly selection: string;
      }
    ) => Effect.Effect<readonly Channel[], ChooseFailure>;
    /**
     * The platforms this server can connect, in Peal's order: those with a
     * sign-in flow and the settings it needs. Needs channel:connect, as only
     * those who connect need them.
     */
    readonly connectable: (
      actor: Actor
    ) => Effect.Effect<Connectable, MissingPermission>;
    /**
     * Forgets the attempts and choices nobody completed in time, and says
     * how many.
     */
    readonly purgeExpired: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/channels/application/ConnectChannel") {
  static readonly layer = Layer.effect(
    ConnectChannel,
    Effect.gen(function* ConnectChannelLive() {
      const authorizers = yield* PlatformAuthorizers;
      const attempts = yield* ConnectAttempts;
      const choices = yield* ConnectChoices;
      const channels = yield* ChannelRepository;
      const cipher = yield* TokenCipher;
      const locks = yield* ChannelLocks;
      const events = yield* ChannelEvents;
      const allowance = yield* ChannelAllowance;
      const ids = yield* Ids;
      const tokenServices = Effect.provideService(TokenCipher, cipher);

      // The platform's authorizer, for Instagram the connection's: one the
      // server lacks the settings for is not configured.
      const authorizerFor = (
        platform: Platform,
        connection: Option.Option<ChannelConnection> = Option.none()
      ): Effect.Effect<PlatformAuthorizer, PlatformNotConnectable> =>
        Option.match(authorizers.for(platform, connection), {
          onNone: () =>
            Effect.fail(
              new PlatformNotConnectable({
                platform,
                reason:
                  authorizers.unconfigured.has(platform) ||
                  (hasConnections(platform) && Option.isSome(connection))
                    ? "notConfigured"
                    : "notSupported",
              })
            ),
          onSome: Effect.succeed,
        });

      // The channels the workspaces sharing the workspace's plan hold,
      // which count against its allowance with its own: a partner's
      // workspaces hold theirs together. Read inside `addingTo`, the
      // workspaces stay held until the channel is added.
      const heldElsewhere = Effect.fn("ConnectChannel.heldElsewhere")(
        function* heldElsewhere(workspaceId: WorkspaceId) {
          const shared = yield* allowance.sharedWith(workspaceId);

          if (shared.length === 0) {
            return 0;
          }

          const held = yield* channels.countIn(shared);

          return [...held.values()].reduce((sum, count) => sum + count, 0);
        }
      );

      // The channels the workspace's pool holds: its own and those that
      // count with them.
      const pooledCount = Effect.fn("ConnectChannel.pooledCount")(
        function* pooledCount(workspaceId: WorkspaceId) {
          const own = yield* channels.countIn([workspaceId]);

          return (
            (own.get(workspaceId) ?? 0) + (yield* heldElsewhere(workspaceId))
          );
        }
      );

      // Room for one more channel in the workspace's plan.
      const roomForChannel = Effect.fn("ConnectChannel.roomForChannel")(
        function* roomForChannel(workspaceId: WorkspaceId) {
          const allowed = yield* allowance.channels(workspaceId);

          if (Option.isNone(allowed)) {
            return;
          }

          const connected = yield* channels.list(workspaceId);
          const elsewhere = yield* heldElsewhere(workspaceId);

          yield* Effect.fromResult(
            roomForOneMore("channels", allowed, connected.length + elsewhere)
          );
        }
      );

      // A platform whose calls the billing account pays at the platform's
      // rates (X) needs per-account pricing before an account of it is
      // connected: refused before the platform is asked.
      const paidFor = (workspaceId: WorkspaceId, platform: Platform) =>
        allowance.passedThrough(workspaceId, platform).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.void,
              onSome: ({ meter, reason }) =>
                DateTime.now.pipe(
                  Effect.flatMap((now) =>
                    Effect.fail(
                      new AllowanceReached({
                        allowed: 0,
                        meter,
                        reason,
                        resetsAt: DateTime.add(DateTime.startOf(now, "month"), {
                          months: 1,
                        }),
                        used: 0,
                      })
                    )
                  )
                ),
            })
          ),
          Effect.withSpan("ConnectChannel.paidFor")
        );

      // Room for one more channel when a connection starts, unless it may
      // move an Instagram account the workspace has the other way in: that
      // adds no channel, and a new account is still checked before it is
      // added.
      const roomToStart = Effect.fn("ConnectChannel.roomToStart")(
        function* roomToStart(
          workspaceId: WorkspaceId,
          authorizer: PlatformAuthorizer
        ) {
          const { connection, platform } = authorizer;

          yield* paidFor(workspaceId, platform);

          if (platform === "instagram" && connection !== undefined) {
            const connected = yield* channels.list(workspaceId);

            const movable = connected.some(
              (channel) =>
                channel.platform === "instagram" &&
                Option.getOrUndefined(
                  connectionOf(channel.platform, channel.connection)
                ) !== connection
            );

            if (movable) {
              return;
            }
          }

          yield* roomForChannel(workspaceId);
        }
      );

      // Room for every new account among those chosen, at once: a choice
      // the plan cannot hold whole connects none of them, rather than the
      // first few, and can be made again with fewer.
      const roomForChosen = Effect.fn("ConnectChannel.roomForChosen")(
        function* roomForChosen(
          workspaceId: WorkspaceId,
          platform: Platform,
          accountIds: readonly string[]
        ) {
          const allowed = yield* allowance.channels(workspaceId);

          if (Option.isNone(allowed)) {
            return;
          }

          const connected = yield* channels.list(workspaceId);

          const known = new Set(
            connected.flatMap((channel) =>
              channel.platform === platform ? [channel.accountId] : []
            )
          );

          const added = [...new Set(accountIds)].filter(
            (accountId) => !known.has(accountId)
          ).length;

          if (added === 0) {
            return;
          }

          const elsewhere = yield* heldElsewhere(workspaceId);

          yield* Effect.fromResult(
            roomFor("channels", allowed, connected.length + elsewhere, added)
          );
        }
      );

      const saveAttempt = Effect.fn("ConnectChannel.saveAttempt")(
        function* saveAttempt(
          actor: Actor,
          authorizer: PlatformAuthorizer,
          pending: PendingAuthorization,
          channelId: Option.Option<ChannelId>
        ) {
          const now = yield* DateTime.now;

          const attempt = startAttempt(
            {
              actor,
              channelId,
              connection: Option.fromUndefinedOr(authorizer.connection),
              instance: pending.instance,
              platform: authorizer.platform,
              state: pending.state,
            },
            now
          );

          const secret = yield* cipher.encryptSecret(
            pending.secret,
            connectAttemptContext(pending.state)
          );

          yield* attempts.save(attempt, secret);

          return pending.authorizationUrl;
        }
      );

      const start = Effect.fn("ConnectChannel.start")(function* start(
        actor: Actor,
        platform: Platform,
        request: ConnectRequest
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        const authorizer = yield* authorizerFor(platform, request.connection);

        yield* roomToStart(actor.workspaceId, authorizer);

        const pending = yield* authorizer.begin({
          handle: request.handle,
          instance: request.instance,
          reconnecting: Option.none(),
        });

        return yield* saveAttempt(actor, authorizer, pending, Option.none());
      });

      const findChannel = Effect.fn("ConnectChannel.findChannel")(
        function* findChannel(actor: Actor, channelId: string) {
          const id = decodeChannelId(channelId);

          const found = Option.isSome(id)
            ? yield* channels.findById(actor.workspaceId, id.value)
            : Option.none<Channel>();

          if (Option.isNone(found)) {
            return yield* new ChannelNotFound({ channelId });
          }

          return found.value;
        }
      );

      const reconnect = Effect.fn("ConnectChannel.reconnect")(
        function* reconnect(
          actor: Actor,
          channelId: string,
          options?: { readonly messages?: boolean; readonly reposts?: boolean }
        ) {
          yield* Effect.fromResult(authorize(actor, "channel:connect"));

          const channel = yield* findChannel(actor, channelId);

          // The way in the channel came through: its account is there.
          const authorizer = yield* authorizerFor(
            channel.platform,
            channel.connection
          );

          const pending = yield* authorizer.begin({
            handle: Option.none(),
            instance: Option.none(),
            messages: options?.messages ?? false,
            reconnecting: Option.some(channel),
            reposts: options?.reposts ?? false,
          });

          return yield* saveAttempt(
            actor,
            authorizer,
            pending,
            Option.some(channel.id)
          );
        }
      );

      // Saves the account's new tokens on a channel the workspace has,
      // re-read under the channel's lock so a refresh running meanwhile is
      // neither lost nor able to overwrite them.
      const reconnectTo = Effect.fn("ConnectChannel.reconnectTo")(
        function* reconnectTo(
          channelId: ChannelId,
          actor: Actor,
          account: AuthorizedAccount,
          connected: ConnectedAccount
        ) {
          return yield* locks.withLock(
            channelId,
            Effect.gen(function* reconnectLocked() {
              const current = yield* channels.findById(
                actor.workspaceId,
                channelId
              );

              if (Option.isNone(current)) {
                return yield* new ChannelNotFound({ channelId });
              }

              if (current.value.accountId !== account.accountId) {
                return yield* new ReconnectAccountMismatch({ channelId });
              }

              const now = yield* DateTime.now;
              const channel = reconnectChannel(current.value, connected, now);

              const credentials = yield* encryptTokens(
                account.tokens,
                channel.id
              ).pipe(tokenServices);

              // In one transaction, the workspace's additions': the tokens
              // are saved with what tells of it, or neither.
              yield* channels.addingTo(
                actor.workspaceId,
                channels
                  .update(channel, Option.some(credentials))
                  .pipe(
                    Effect.flatMap((saved) =>
                      saved ? events.connected(channel, true) : Effect.void
                    )
                  )
              );

              return channel;
            })
          );
        }
      );

      const addChannel = Effect.fn("ConnectChannel.addChannel")(
        function* addChannel(
          actor: Actor,
          platform: Platform,
          account: AuthorizedAccount,
          connected: ConnectedAccount
        ) {
          const id = yield* newId(ChannelIdSchema).pipe(
            Effect.provideService(Ids, ids)
          );

          const now = yield* DateTime.now;

          const channel = connectChannel(
            {
              ...connected,
              accountId: account.accountId,
              id,
              platform,
              workspaceId: actor.workspaceId,
            },
            now
          );

          const credentials = yield* encryptTokens(account.tokens, id).pipe(
            tokenServices
          );

          // Counted and added in turn with the workspace's other additions,
          // so two at once never pass the plan's limit together; then
          // counted for billing, still under the pool's hold.
          yield* paidFor(actor.workspaceId, platform);

          yield* channels.addingTo(
            actor.workspaceId,
            roomForChannel(actor.workspaceId).pipe(
              Effect.andThen(channels.insert(channel, credentials)),
              Effect.andThen(
                allowance.counted(
                  actor.workspaceId,
                  pooledCount(actor.workspaceId)
                )
              ),
              Effect.andThen(events.connected(channel, false))
            )
          );

          return channel;
        }
      );

      // The account as a channel of the workspace: the one it has, which
      // takes the new tokens, or a new one.
      const connectAccount = Effect.fn("ConnectChannel.connectAccount")(
        function* connectAccount(
          actor: Actor,
          platform: Platform,
          authorizer: PlatformAuthorizer,
          account: AuthorizedAccount
        ) {
          const connected = connectedOf(
            authorizer,
            account,
            yield* DateTime.now
          );

          const existing = yield* channels.findByAccount(
            actor.workspaceId,
            platform,
            account.accountId
          );

          if (Option.isSome(existing)) {
            return yield* reconnectTo(
              existing.value.id,
              actor,
              account,
              connected
            );
          }

          return yield* addChannel(actor, platform, account, connected).pipe(
            // Connected from another tab meanwhile: this one reconnects it.
            Effect.catchTag("ChannelAlreadyConnected", () =>
              Effect.gen(function* raced() {
                const other = yield* channels.findByAccount(
                  actor.workspaceId,
                  platform,
                  account.accountId
                );

                if (Option.isNone(other)) {
                  return yield* new AuthorizationFailed({
                    reason: "the channel was removed while connecting",
                  });
                }

                return yield* reconnectTo(
                  other.value.id,
                  actor,
                  account,
                  connected
                );
              })
            )
          );
        }
      );

      // Keeps the accounts for the member to choose from, encrypted with
      // their tokens, and says what the member sees of them.
      const offer = Effect.fn("ConnectChannel.offer")(function* offer(
        actor: Actor,
        authorizer: PlatformAuthorizer,
        accounts: readonly AuthorizedAccount[]
      ) {
        const { platform } = authorizer;
        const selection = yield* ids.next;

        // One sign-in, so one user's grant: the Facebook user's, for Pages
        // and the Instagram accounts linked to them.
        const grantedBy = Option.fromUndefinedOr(
          accounts.find(({ tokens }) => tokens.grantedBy !== undefined)?.tokens
            .grantedBy
        );

        const choice = offerChoice(
          {
            actor,
            connection: Option.fromUndefinedOr(authorizer.connection),
            grantedBy,
            platform,
            selection,
          },
          yield* DateTime.now
        );

        const sealed = yield* cipher.encryptSecret(
          yield* sealOffered(accounts),
          choiceContext(selection)
        );

        yield* choices.save(choice, sealed);

        const known = yield* channels.list(actor.workspaceId);

        const outcome: ConnectOutcome = {
          _tag: "choose",
          accounts: accounts.map((account) => ({
            accountId: account.accountId,
            avatarUrl: account.avatarUrl,
            connected: known.some(
              (channel) =>
                channel.platform === platform &&
                channel.accountId === account.accountId
            ),
            displayName: account.displayName,
            handle: account.handle,
          })),
          expiresAt: choice.expiresAt,
          selection,
        };

        return outcome;
      });

      const complete = Effect.fn("ConnectChannel.complete")(function* complete(
        actor: Actor,
        platform: Platform,
        returned: AuthorizationCallback
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        const taken = yield* attempts.take(returned.state, {
          platform,
          startedBy: starterOf(actor.subject),
          workspaceId: actor.workspaceId,
        });

        if (Option.isNone(taken)) {
          return yield* new InvalidConnectState();
        }

        const now = yield* DateTime.now;

        const attempt = yield* Effect.fromResult(
          completableBy(taken.value.attempt, actor, platform, now)
        );

        const authorizer = yield* authorizerFor(platform, attempt.connection);

        if (Option.isSome(returned.error)) {
          return yield* denials.has(returned.error.value)
            ? new AuthorizationDenied()
            : new AuthorizationFailed({ reason: returned.error.value });
        }

        // The secret was encrypted by this server a few minutes ago: failing
        // to decrypt it is a bug or a keyring changed under it, not something
        // the member can fix.
        const secret = yield* cipher
          .decryptSecret(
            taken.value.secret,
            connectAttemptContext(attempt.state)
          )
          .pipe(Effect.orDie);

        // The channel a reconnection is for, whose account the sign-in
        // must reach again.
        const reconnected = yield* Effect.transposeOption(
          attempt.channelId.pipe(
            Option.map((channelId) => findChannel(actor, channelId))
          )
        );

        // What the platform says of the accounts is cleaned before it is
        // compared with the workspace's channels, kept or shown.
        const authorized = storableAuthorized(
          yield* authorizer.complete({
            attempt,
            callback: returned,
            reconnecting: reconnected.pipe(
              Option.map(({ accountId }) => accountId)
            ),
            secret,
          })
        );

        const reached =
          "_tag" in authorized ? authorized.accounts : [authorized];

        // Reconnecting takes the channel's own account among those reached.
        if (Option.isSome(reconnected)) {
          const channel = reconnected.value;
          const channelId = channel.id;

          const account = reached.find(
            ({ accountId }) => accountId === channel.accountId
          );

          if (account === undefined) {
            return yield* new ReconnectAccountMismatch({ channelId });
          }

          return connectedTo(
            yield* reconnectTo(
              channel.id,
              actor,
              account,
              connectedOf(authorizer, account, now)
            )
          );
        }

        const [only, ...others] = reached;

        if (only === undefined) {
          return yield* new NoAccountsToConnect({ platform });
        }

        if (others.length > 0) {
          return yield* offer(actor, authorizer, reached);
        }

        return connectedTo(
          yield* connectAccount(actor, platform, authorizer, only)
        );
      });

      const choose = Effect.fn("ConnectChannel.choose")(function* choose(
        actor: Actor,
        platform: Platform,
        request: {
          readonly accountIds: readonly string[];
          readonly selection: string;
        }
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        // Before the choice is taken, so a refusal leaves it to make again.
        yield* roomForChosen(actor.workspaceId, platform, request.accountIds);

        const taken = yield* choices.take(request.selection, {
          platform,
          startedBy: starterOf(actor.subject),
          workspaceId: actor.workspaceId,
        });

        if (Option.isNone(taken)) {
          return yield* new InvalidConnectState();
        }

        const choice = yield* Effect.fromResult(
          choosableBy(taken.value.choice, actor, platform, yield* DateTime.now)
        );

        const connected = yield* Ref.make(0);

        const connecting = Effect.gen(function* connecting() {
          const authorizer = yield* authorizerFor(platform, choice.connection);

          // Sealed by this server a few minutes ago, as an attempt's secret.
          const offered = yield* cipher
            .decryptSecret(
              taken.value.accounts,
              choiceContext(choice.selection)
            )
            .pipe(Effect.orDie, Effect.flatMap(openOffered));

          const chosen = [...new Set(request.accountIds)].map((accountId) =>
            offered.find((account) => account.accountId === accountId)
          );

          // Only accounts the choice offered: anything else is a forged
          // choice.
          if (chosen.length === 0 || chosen.includes(undefined)) {
            return yield* new InvalidConnectState();
          }

          return yield* Effect.forEach(
            chosen.filter((account) => account !== undefined),
            (account) =>
              connectAccount(actor, platform, authorizer, account).pipe(
                Effect.tap(() => Ref.update(connected, (count) => count + 1))
              )
          );
        });

        // Taken, then failed before anything was connected, whatever the
        // reason: the choice goes back as it was, to make again until it
        // expires. Once an account is connected, it stays spent.
        return yield* connecting.pipe(
          Effect.onError(() =>
            Ref.get(connected).pipe(
              Effect.flatMap((count) =>
                count === 0
                  ? choices.save(taken.value.choice, taken.value.accounts)
                  : Effect.void
              ),
              Effect.ignore
            )
          )
        );
      });

      const connectable = Effect.fn("ConnectChannel.connectable")(
        function* connectable(actor: Actor) {
          yield* Effect.fromResult(authorize(actor, "channel:connect"));

          const reachable: Connectable = {
            instagramConnections: authorizers.instagramConnections,
            linkedinConnections: authorizers.linkedinConnections,
            platforms: platforms.filter((platform) =>
              Option.isSome(authorizers.for(platform))
            ),
          };

          return reachable;
        }
      );

      const purgeExpired = DateTime.now.pipe(
        Effect.flatMap((now) =>
          Effect.all([attempts.purgeExpired(now), choices.purgeExpired(now)])
        ),
        Effect.map(
          ([purgedAttempts, purgedChoices]) => purgedAttempts + purgedChoices
        ),
        Effect.withSpan("ConnectChannel.purgeExpired")
      );

      return ConnectChannel.of({
        choose,
        complete,
        connectable,
        purgeExpired,
        reconnect,
        start,
      });
    })
  );
}
