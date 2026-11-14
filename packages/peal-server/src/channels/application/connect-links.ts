import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Match,
  Option,
  Redacted,
  Schema,
} from "effect";

import type { Channel } from "#channels/domain/channel.ts";
import { starterOf } from "#channels/domain/connect-attempt.ts";
import { ConnectLinkIdSchema } from "#channels/domain/connect-link-id.ts";
import { ConnectLinkUnusable } from "#channels/domain/connect-link-unusable.ts";
import {
  completeLink,
  createLink,
  defaultLinkLifetime,
  isExpired,
  linkActor,
  linkRetention,
  maxPendingLinks,
  revokeLink,
  startLink,
  usable,
} from "#channels/domain/connect-link.ts";
import type { ConnectLink } from "#channels/domain/connect-link.ts";
import { linkInputOf } from "#channels/domain/link-input.ts";
import type { LinkInput } from "#channels/domain/link-input.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { returnAddressOf } from "#channels/domain/return-address.ts";
import type { ReturnStatus } from "#channels/domain/return-address.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import {
  hasConnections,
  isConnectionOf,
} from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelNotFound } from "./channel-not-found.ts";
import { ChannelRepository } from "./channel-repository.ts";
import type {
  ChoosableAccount,
  ChooseFailure,
  CompleteConnectFailure,
  StartFailure,
} from "./connect-channel.ts";
import { ConnectChannel } from "./connect-channel.ts";
import { ConnectLinkAddresses } from "./connect-link-addresses.ts";
import { ConnectLinkJournal } from "./connect-link-journal.ts";
import type { ConnectingStep } from "./connect-link-journal.ts";
import { ConnectLinkNotFound } from "./connect-link-not-found.ts";
import { ConnectLinkStore } from "./connect-link-store.ts";
import { ConnectLinkTokens } from "./connect-link-tokens.ts";
import { HostedConnectFailed } from "./hosted-connect-failed.ts";
import type { HostedFailureReason } from "./hosted-connect-failed.ts";
import { LinkHosts } from "./link-hosts.ts";
import type { LinkHost } from "./link-hosts.ts";
import type { AuthorizationCallback } from "./platform-authorizer.ts";
import { PlatformAuthorizers } from "./platform-authorizer.ts";
import { PlatformNotConnectable } from "./platform-not-connectable.ts";
import { ReturnUrlNotAllowed } from "./return-url-not-allowed.ts";
import { TooManyConnectLinks } from "./too-many-connect-links.ts";

const decodeLinkId = Schema.decodeUnknownOption(ConnectLinkIdSchema);

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

/** How many of a workspace's links a list answers. */
export const linkListSize = 100;

/** What a workspace asks of a new link. */
export interface NewConnectLink {
  /** The channel to reconnect, instead of connecting a new account. */
  readonly channelId: Option.Option<string>;
  readonly connection: Option.Option<ChannelConnection>;
  /** How long it works, in hours; a week unless given. */
  readonly expiresInHours: Option.Option<number>;
  readonly locale: Option.Option<Locale>;
  readonly platform: Platform;
  readonly returnUrl: Option.Option<string>;
}

/** A new link, with the address that opens it: shown once, here. */
export interface CreatedConnectLink {
  readonly link: ConnectLink;
  readonly url: Redacted.Redacted;
}

/** Where a link stands for whoever opens it. */
export type HostedLinkState = "completed" | "expired" | "pending" | "revoked";

/** What a link's hosted page shows before anything is asked. */
export interface HostedLink {
  readonly expiresAt: DateTime.Utc;
  readonly host: LinkHost;
  /** What the page asks for before the platform: a server, a handle. */
  readonly input: LinkInput;
  readonly locale: Option.Option<Locale>;
  readonly platform: Platform;
  /** The handle of the account to sign in to, when it reconnects one. */
  readonly reconnecting: Option.Option<string>;
  /**
   * Where the page offers to go back to, with how the link stands: none
   * for a link without a return address.
   */
  readonly returnTo: Option.Option<string>;
  readonly state: HostedLinkState;
}

/** A sign-in started from a hosted page. */
export interface HostedStart {
  readonly authorizationUrl: string;
  /** What the browser keeps, to be the one that completes the sign-in. */
  readonly browser: Redacted.Redacted;
}

/** How a hosted sign-in ended. */
export type HostedOutcome =
  | {
      readonly _tag: "connected";
      readonly channels: readonly Channel[];
      readonly returnTo: Option.Option<string>;
    }
  | {
      readonly _tag: "choose";
      readonly accounts: readonly ChoosableAccount[];
      readonly expiresAt: DateTime.Utc;
      readonly selection: string;
    };

type HostedFailure = ConnectLinkNotFound | DatabaseError | HostedConnectFailed;

// Everything a hosted sign-in fails with before it is told to the page.
type Failure =
  | ChannelNotFound
  | ChooseFailure
  | CompleteConnectFailure
  | ConnectLinkUnusable
  | StartFailure;

const unusableReasons = {
  completed: "linkCompleted",
  exhausted: "tooManyAttempts",
  expired: "linkExpired",
  revoked: "linkRevoked",
} as const;

// A failure as the page tells it; none for the server's own, which is a
// defect, and for a permission a link always has.
const reasonOf = (failure: Failure): Option.Option<HostedFailureReason> =>
  Match.valueTags(failure, {
    // A platform the billing account cannot pay for yet (X without a
    // payment method): to whoever holds the link, no room, as for the plan.
    AllowanceReached: () => Option.some<HostedFailureReason>("planLimit"),
    AuthorizationDenied: () => Option.some<HostedFailureReason>("denied"),
    AuthorizationFailed: () =>
      Option.some<HostedFailureReason>("authorizationFailed"),
    ChannelNotFound: () => Option.some<HostedFailureReason>("channelGone"),
    ConnectLinkUnusable: ({ reason }) =>
      Option.some<HostedFailureReason>(unusableReasons[reason]),
    DatabaseError: () => Option.none<HostedFailureReason>(),
    InstanceNotAllowed: () =>
      Option.some<HostedFailureReason>("instanceNotAllowed"),
    InvalidConnectState: () => Option.some<HostedFailureReason>("invalidState"),
    InvalidHandle: () => Option.some<HostedFailureReason>("invalidHandle"),
    InvalidInstance: () => Option.some<HostedFailureReason>("invalidInstance"),
    MissingPermission: () => Option.none<HostedFailureReason>(),
    MissingTokenKey: () => Option.some<HostedFailureReason>("notConfigured"),
    NoAccountsToConnect: () => Option.some<HostedFailureReason>("noAccounts"),
    PlanLimitReached: () => Option.some<HostedFailureReason>("planLimit"),
    PlatformNotConnectable: ({ reason }) =>
      Option.some<HostedFailureReason>(
        reason === "notConfigured" ? "notConfigured" : "platformNotSupported"
      ),
    PlatformUnavailable: () =>
      Option.some<HostedFailureReason>("platformUnreachable"),
    ReconnectAccountMismatch: () =>
      Option.some<HostedFailureReason>("accountMismatch"),
  });

// The reasons a new try may get past: the link keeps them as its last
// failure, and stays usable. The link's own end is not a failure of a
// sign-in.
const linkEnded: ReadonlySet<HostedFailureReason> = new Set([
  "linkCompleted",
  "linkExpired",
  "linkRevoked",
  "tooManyAttempts",
]);

const stateOf = (link: ConnectLink, now: DateTime.Utc): HostedLinkState =>
  isExpired(link, now) ? "expired" : link.status._tag;

/**
 * Connect links: a workspace hands one to whoever owns a social account,
 * who connects it on a hosted page, without a Peal account.
 *
 * | Use case                     | Needs                           |
 * | ---------------------------- | ------------------------------- |
 * | create, revoke               | channel:connect                 |
 * | get, list                    | channel:read                    |
 * | open, start, complete, choose | the link's token, and no session |
 *
 * A link names one platform, or one channel to reconnect; works until it
 * connected something, was revoked or expired; and is opened by its token,
 * 256 random bits Peal keeps the digest of. Its return address must be on
 * an origin the workspace's partner registered (`LinkHosts`).
 *
 * Whoever holds the token acts as the link (`linkActor`): the sign-in it
 * starts is `ConnectChannel`'s, bound to the link and its workspace, so no
 * one else's callback completes it, and one of anyone else never completes
 * through a link. Starting gives the browser a nonce, whose digest the
 * link keeps: only the browser that started last completes, so a callback
 * address passed on, or planted, does nothing elsewhere. Each failure is
 * kept on the link for its creator to read; the link stays usable until it
 * ends, or was started `maxLinkStarts` times.
 */
export class ConnectLinks extends Context.Service<
  ConnectLinks,
  {
    readonly create: (
      actor: Actor,
      link: NewConnectLink
    ) => Effect.Effect<
      CreatedConnectLink,
      | ChannelNotFound
      | DatabaseError
      | MissingPermission
      | PlatformNotConnectable
      | ReturnUrlNotAllowed
      | TooManyConnectLinks
    >;
    readonly get: (
      actor: Actor,
      linkId: string
    ) => Effect.Effect<
      ConnectLink,
      ConnectLinkNotFound | DatabaseError | MissingPermission
    >;
    /** The workspace's links, newest first, `linkListSize` at most. */
    readonly list: (
      actor: Actor
    ) => Effect.Effect<
      readonly ConnectLink[],
      DatabaseError | MissingPermission
    >;
    /** Takes a link back: it opens nothing more. One over stays as it is. */
    readonly revoke: (
      actor: Actor,
      linkId: string
    ) => Effect.Effect<
      ConnectLink,
      ConnectLinkNotFound | DatabaseError | MissingPermission
    >;
    readonly open: (
      token: Redacted.Redacted
    ) => Effect.Effect<HostedLink, ConnectLinkNotFound | DatabaseError>;
    readonly start: (
      token: Redacted.Redacted,
      request: {
        readonly handle: Option.Option<string>;
        readonly instance: Option.Option<string>;
      }
    ) => Effect.Effect<HostedStart, HostedFailure>;
    readonly complete: (
      token: Redacted.Redacted,
      browser: Option.Option<Redacted.Redacted>,
      callback: AuthorizationCallback
    ) => Effect.Effect<HostedOutcome, HostedFailure>;
    readonly choose: (
      token: Redacted.Redacted,
      browser: Option.Option<Redacted.Redacted>,
      choice: {
        readonly accountIds: readonly string[];
        readonly selection: string;
      }
    ) => Effect.Effect<HostedOutcome, HostedFailure>;
    /** Forgets the links over for `linkRetention`, and says how many. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/channels/application/ConnectLinks") {
  static readonly layer = Layer.effect(
    ConnectLinks,
    Effect.gen(function* ConnectLinksLive() {
      const store = yield* ConnectLinkStore;
      const tokens = yield* ConnectLinkTokens;
      const addresses = yield* ConnectLinkAddresses;
      const hosts = yield* LinkHosts;
      const journal = yield* ConnectLinkJournal;
      const channels = yield* ChannelRepository;
      const authorizers = yield* PlatformAuthorizers;
      const connect = yield* ConnectChannel;
      const { transaction } = yield* TransactionRunner;
      const ports = yield* Effect.context<Ids>();

      const found = Effect.fn("ConnectLinks.found")(function* found(
        actor: Actor,
        linkId: string
      ) {
        const id = decodeLinkId(linkId);

        const link = Option.isSome(id)
          ? yield* store.findIn(actor.workspaceId, id.value)
          : Option.none<ConnectLink>();

        return Option.isSome(link)
          ? link.value
          : yield* new ConnectLinkNotFound();
      });

      // The channel a link reconnects, which must be the workspace's, on
      // the link's platform.
      const reconnected = Effect.fn("ConnectLinks.reconnected")(
        function* reconnected(actor: Actor, platform: Platform, given: string) {
          const id = decodeChannelId(given);

          const channel = Option.isSome(id)
            ? yield* channels.findById(actor.workspaceId, id.value)
            : Option.none<Channel>();

          return Option.isSome(channel) && channel.value.platform === platform
            ? channel.value.id
            : yield* new ChannelNotFound({ channelId: given });
        }
      );

      const create = Effect.fn("ConnectLinks.create")(function* create(
        actor: Actor,
        asked: NewConnectLink
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        // A way in that is another platform's, or given to a platform that
        // has one way in, connects nothing.
        const itsOwn = Option.match(asked.connection, {
          onNone: () => true,
          onSome: (connection) => isConnectionOf(asked.platform, connection),
        });

        if (
          !itsOwn ||
          Option.isNone(authorizers.for(asked.platform, asked.connection))
        ) {
          return yield* new PlatformNotConnectable({
            platform: asked.platform,
            reason:
              itsOwn &&
              (authorizers.unconfigured.has(asked.platform) ||
                // The platform's other way in is set up, and not this one.
                (hasConnections(asked.platform) &&
                  Option.isSome(asked.connection)))
                ? "notConfigured"
                : "notSupported",
          });
        }

        const channelId = Option.isSome(asked.channelId)
          ? Option.some(
              yield* reconnected(actor, asked.platform, asked.channelId.value)
            )
          : Option.none();

        if (
          Option.isSome(asked.returnUrl) &&
          !(yield* hosts.allowsReturnTo(
            actor.workspaceId,
            asked.returnUrl.value
          ))
        ) {
          return yield* new ReturnUrlNotAllowed();
        }

        const now = yield* DateTime.now;

        const issued = yield* tokens.issue;

        const link = createLink(
          {
            channelId,
            connection: asked.connection,
            createdBy: starterOf(actor.subject),
            id: yield* newId(ConnectLinkIdSchema),
            lifetime: Option.match(asked.expiresInHours, {
              onNone: () => defaultLinkLifetime,
              onSome: Duration.hours,
            }),
            locale: asked.locale,
            platform: asked.platform,
            returnUrl: asked.returnUrl,
            workspaceId: actor.workspaceId,
          },
          now
        );

        // Counted and made under the workspace's hold, so links made
        // together never pass the most a workspace has waiting.
        yield* transaction(
          Effect.gen(function* insertIfRoom() {
            yield* store.holdWorkspace(actor.workspaceId);

            if (
              (yield* store.countWaiting(actor.workspaceId, now)) >=
              maxPendingLinks
            ) {
              return yield* new TooManyConnectLinks({
                allowed: maxPendingLinks,
              });
            }

            return yield* store.insert(link, issued.digest);
          })
        );

        const created: CreatedConnectLink = {
          link,
          url: Redacted.make(addresses.pageOf(issued.secret, asked.locale)),
        };

        return created;
      }, Effect.provideContext(ports));

      const revoke = Effect.fn("ConnectLinks.revoke")(function* revoke(
        actor: Actor,
        linkId: string
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));

        const link = yield* found(actor, linkId);
        const revoked = revokeLink(link, yield* DateTime.now);

        yield* store.ended(revoked);

        // As it now stands: used a moment ago, it stays used.
        return yield* found(actor, linkId);
      });

      // The link a token opens: a token that opens nothing, and the link
      // of a workspace since deleted, read the same.
      const opened = Effect.fn("ConnectLinks.opened")(function* opened(
        token: Redacted.Redacted
      ) {
        const link = yield* store.byToken(yield* tokens.digestOf(token));

        return Option.isSome(link)
          ? link.value
          : yield* new ConnectLinkNotFound();
      });

      // Where the page sends the browser back, checked when it is used
      // and not only when the link was made: an origin its partner has
      // removed since, a domain let go, takes nobody back.
      const wayBack = Effect.fnUntraced(function* wayBack(
        link: ConnectLink,
        status: ReturnStatus
      ) {
        if (
          Option.isNone(link.returnUrl) ||
          !(yield* hosts.allowsReturnTo(link.workspaceId, link.returnUrl.value))
        ) {
          return Option.none<string>();
        }

        return returnAddressOf(link, status);
      });

      const open = Effect.fn("ConnectLinks.open")(function* open(
        token: Redacted.Redacted
      ) {
        const link = yield* opened(token);
        const host = yield* hosts.of(link.workspaceId);

        if (Option.isNone(host)) {
          return yield* new ConnectLinkNotFound();
        }

        const state = stateOf(link, yield* DateTime.now);

        const channel = Option.isSome(link.channelId)
          ? yield* channels.findById(link.workspaceId, link.channelId.value)
          : Option.none<Channel>();

        const hosted: HostedLink = {
          expiresAt: link.expiresAt,
          host: host.value,
          input: Option.isSome(link.channelId)
            ? "none"
            : linkInputOf(link.platform),
          locale: link.locale,
          platform: link.platform,
          reconnecting: channel.pipe(Option.map(({ handle }) => handle)),
          // A link still open offers a way back for whoever declines.
          returnTo: yield* wayBack(
            link,
            state === "completed" ? "connected" : "cancelled"
          ),
          state,
        };

        return hosted;
      });

      // What a failed sign-in tells the page, keeping the failure on the
      // link while it stays usable; the server's own failures stay what
      // they are.
      const tell = (link: ConnectLink) =>
        Effect.fnUntraced(function* telling(
          failure: Failure | HostedConnectFailed
        ) {
          if (failure._tag === "HostedConnectFailed") {
            return yield* failure;
          }

          const reason = reasonOf(failure);

          if (Option.isNone(reason)) {
            return yield* failure._tag === "DatabaseError"
              ? Effect.fail(failure)
              : Effect.die(failure);
          }

          const now = yield* DateTime.now;

          if (!linkEnded.has(reason.value)) {
            yield* store.failed(link.id, { at: now, reason: reason.value });
          }

          return yield* new HostedConnectFailed({
            reason: reason.value,
            returnTo: yield* wayBack(link, "failed"),
          });
        });

      const told =
        (link: ConnectLink) =>
        <A>(
          attempt: Effect.Effect<A, Failure | HostedConnectFailed>
        ): Effect.Effect<A, DatabaseError | HostedConnectFailed> =>
          attempt.pipe(Effect.catch(tell(link)));

      // Why a link that was pending a moment ago took no change: used or
      // revoked meanwhile, as it now says.
      const endedMeanwhile = Effect.fn("ConnectLinks.endedMeanwhile")(
        function* endedMeanwhile(link: ConnectLink) {
          const current = yield* store.findIn(link.workspaceId, link.id);

          // Still pending: it took no start because it has none left.
          if (
            Option.exists(current, ({ status }) => status._tag === "pending")
          ) {
            return new ConnectLinkUnusable({ reason: "exhausted" });
          }

          return new ConnectLinkUnusable({
            reason: current.pipe(
              Option.map(({ status }) => status._tag),
              Option.filter((status) => status !== "pending"),
              Option.getOrElse(() => "revoked" as const)
            ),
          });
        }
      );

      const start = Effect.fn("ConnectLinks.start")(function* start(
        token: Redacted.Redacted,
        request: {
          readonly handle: Option.Option<string>;
          readonly instance: Option.Option<string>;
        }
      ) {
        const link = yield* opened(token);

        return yield* Effect.gen(function* starting() {
          const now = yield* DateTime.now;
          const issued = yield* tokens.issue;

          const started = yield* Effect.fromResult(
            startLink(link, issued.digest, now)
          );

          // Counted before the platform is asked anything, so a link
          // passed around starts no more sign-ins than it may.
          if (!(yield* store.started(started))) {
            return yield* Effect.fail(yield* endedMeanwhile(link));
          }

          const actor = linkActor(started);

          const authorizationUrl = yield* Option.match(started.channelId, {
            onNone: () =>
              connect.start(actor, started.platform, {
                connection: started.connection,
                handle: request.handle,
                instance: request.instance,
              }),
            onSome: (channelId) => connect.reconnect(actor, channelId),
          });

          const begun: HostedStart = {
            authorizationUrl,
            browser: issued.secret,
          };

          return begun;
        }).pipe(told(link));
      });

      // The link, when the browser asking is the one that started its
      // sign-in last: any other, or none, is told what a callback nobody
      // started is told.
      const heldBy = Effect.fn("ConnectLinks.heldBy")(function* heldBy(
        link: ConnectLink,
        browser: Option.Option<Redacted.Redacted>
      ) {
        const pending = yield* Effect.fromResult(
          usable(link, yield* DateTime.now)
        );

        const digest = Option.isSome(browser)
          ? Option.some(yield* tokens.digestOf(browser.value))
          : Option.none<string>();

        const held =
          Option.isSome(digest) &&
          Option.contains(pending.browser, digest.value);

        return held
          ? pending
          : yield* new HostedConnectFailed({
              reason: "invalidState",
              returnTo: yield* wayBack(link, "failed"),
            });
      });

      // The link as it now stands, held until the transaction ends.
      const held = (link: ConnectLink) =>
        store.lock(link.id).pipe(Effect.map(Option.getOrElse(() => link)));

      // The link used, with what it connected. A link used or revoked
      // while its sign-in ended keeps how it stood: the account was
      // connected by a sign-in that started while it was open.
      const completed = Effect.fn("ConnectLinks.completed")(function* completed(
        link: ConnectLink,
        connected: readonly Channel[],
        step: ConnectingStep
      ) {
        const channelIds = connected.map(({ id }) => id);
        const done = completeLink(link, channelIds, yield* DateTime.now);

        yield* store.ended(done);

        // The workspace reads that the link connected them. The accounts
        // are connected either way: a log that cannot be kept is logged.
        yield* journal
          .connected(done, channelIds, step)
          .pipe(
            Effect.catchCause((cause) =>
              Effect.logError(
                "Keeping a connect link's connection in the activity log failed",
                cause
              )
            )
          );

        const outcome: HostedOutcome = {
          _tag: "connected",
          channels: connected,
          returnTo: yield* wayBack(done, "connected"),
        };

        return outcome;
      });

      const complete = Effect.fn("ConnectLinks.complete")(function* complete(
        token: Redacted.Redacted,
        browser: Option.Option<Redacted.Redacted>,
        returned: AuthorizationCallback
      ) {
        const link = yield* opened(token);

        // The link is held from here to the end: a completion or a
        // revocation that arrives meanwhile waits, then finds it used. One
        // that fails takes nothing with it, the account it connected
        // included.
        return yield* transaction(
          Effect.gen(function* completing() {
            const pending = yield* heldBy(yield* held(link), browser);

            const outcome = yield* connect.complete(
              linkActor(pending),
              pending.platform,
              returned
            );

            if (outcome._tag === "connected") {
              return yield* completed(pending, [outcome.channel], "complete");
            }

            const choice: HostedOutcome = {
              _tag: "choose",
              accounts: outcome.accounts,
              expiresAt: outcome.expiresAt,
              selection: outcome.selection,
            };

            return choice;
          })
        ).pipe(told(link));
      });

      const choose = Effect.fn("ConnectLinks.choose")(function* choose(
        token: Redacted.Redacted,
        browser: Option.Option<Redacted.Redacted>,
        choice: {
          readonly accountIds: readonly string[];
          readonly selection: string;
        }
      ) {
        const link = yield* opened(token);

        return yield* transaction(
          Effect.gen(function* choosing() {
            const pending = yield* heldBy(yield* held(link), browser);

            const connected = yield* connect.choose(
              linkActor(pending),
              pending.platform,
              choice
            );

            return yield* completed(pending, connected, "choose");
          })
        ).pipe(told(link));
      });

      return ConnectLinks.of({
        choose,
        complete,
        create,
        get: (actor, linkId) =>
          Effect.fromResult(authorize(actor, "channel:read")).pipe(
            Effect.andThen(found(actor, linkId))
          ),
        list: (actor) =>
          Effect.fromResult(authorize(actor, "channel:read")).pipe(
            Effect.andThen(store.list(actor.workspaceId, linkListSize))
          ),
        open,
        purge: DateTime.now.pipe(
          Effect.flatMap((now) =>
            store.purge(DateTime.subtractDuration(now, linkRetention))
          ),
          Effect.withSpan("ConnectLinks.purge")
        ),
        revoke,
        start,
      });
    })
  );
}
