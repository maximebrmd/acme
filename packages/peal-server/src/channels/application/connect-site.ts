import { Context, DateTime, Effect, Layer, Option, Redacted } from "effect";

import {
  connectChannel,
  reconnect as reconnectChannel,
  siteMovedTo,
} from "#channels/domain/channel.ts";
import type { Channel, ConnectedAccount } from "#channels/domain/channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Ids, newId } from "#shared/application/ids.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import { storableLine } from "#shared/domain/platform-text.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

import { ChannelAllowance } from "./channel-allowance.ts";
import { ChannelEvents } from "./channel-events.ts";
import { ChannelLocks } from "./channel-locks.ts";
import { ChannelRepository } from "./channel-repository.ts";
import { channelRoomOf } from "./channel-room.ts";
import { encryptTokens } from "./channel-tokens.ts";
import type { MissingTokenKey } from "./missing-token-key.ts";
import type { IssuedTokens } from "./platform-authorizer.ts";
import type { SiteConnectLimited } from "./site-connect-limited.ts";
import { SiteConnectPace } from "./site-connect-pace.ts";
import type { SiteRefused } from "./site-refused.ts";
import { SiteVerifier } from "./site-verifier.ts";
import type { SiteSignIn, VerifiedSite } from "./site-verifier.ts";
import { TokenCipher } from "./token-cipher.ts";

// The longest a site's name or home page is kept, as a platform's handle
// and name are.
const maxNameLength = 200;

export type ConnectSiteFailure =
  | DatabaseError
  | MissingPermission
  | MissingTokenKey
  | PlanLimitReached
  | PlatformUnavailable
  | SiteConnectLimited
  | SiteRefused;

// The origin of an API root, as the channel keeps it.
const originOf = (root: string) =>
  URL.canParse(root) ? new URL(root).origin : root;

// The host a site's handle (its home page, host and path) or a typed
// address names, as the two compare.
const hostOf = (written: string) =>
  written
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//iu, "")
    .split("/")[0]
    ?.toLowerCase() ?? "";

// The credential every call to the site carries: the user and the
// application password, as Basic authentication joins them.
const tokensOf = (signIn: SiteSignIn, site: VerifiedSite): IssuedTokens => ({
  accessToken: Redacted.make(
    `${signIn.userName.trim()}:${Redacted.value(signIn.applicationPassword).trim()}`
  ),
  expiresAt: Option.none(),
  refreshToken: Option.none(),
  renewable: false,
  scopes: site.scopes,
});

// What the site told about itself, as the channel keeps it: an
// application password lasts until its user revokes it.
const connectedOf = (site: VerifiedSite): ConnectedAccount => ({
  avatarUrl: site.avatarUrl,
  connection: Option.none(),
  displayName: site.displayName.pipe(
    Option.map((name) => storableLine(name, maxNameLength)),
    Option.filter((name) => name !== "")
  ),
  handle: storableLine(site.handle, maxNameLength),
  scopes: site.scopes,
  token: { _tag: "nonExpiring" },
});

/**
 * Connects a website to the actor's workspace, as a channel that takes
 * articles: the site is asked whether the user and the application
 * password let Peal publish (`SiteVerifier`), and only then is the
 * password kept, encrypted for the channel as a platform's token is. A
 * site the workspace has already takes the new password; a new one needs
 * room in the plan and is counted for billing like any channel. Needs
 * channel:connect.
 */
export class ConnectSite extends Context.Service<
  ConnectSite,
  {
    readonly connect: (
      actor: Actor,
      signIn: SiteSignIn
    ) => Effect.Effect<Channel, ConnectSiteFailure>;
  }
>()("peal-server/channels/application/ConnectSite") {
  static readonly layer = Layer.effect(
    ConnectSite,
    Effect.gen(function* ConnectSiteLive() {
      const channels = yield* ChannelRepository;
      const allowance = yield* ChannelAllowance;
      const events = yield* ChannelEvents;
      const locks = yield* ChannelLocks;
      const cipher = yield* TokenCipher;
      const verifier = yield* SiteVerifier;
      const ids = yield* Ids;
      const withCipher = Effect.provideService(TokenCipher, cipher);
      const pace = yield* SiteConnectPace;

      const { insertCounted, roomForChannel } = channelRoomOf(
        channels,
        allowance
      );

      // The workspace's websites of the platform on that host.
      const sitesOn = (
        workspaceId: Actor["workspaceId"],
        platform: SiteSignIn["platform"],
        host: string
      ) =>
        channels
          .list(workspaceId)
          .pipe(
            Effect.map((listed) =>
              listed.filter(
                (channel) =>
                  channel.platform === platform &&
                  hostOf(channel.handle) === host
              )
            )
          );

      // The site the workspace has takes the new password, under its
      // channel's lock, as a reconnected account's tokens are saved.
      const reconnectTo = (
        existing: Channel,
        tokens: IssuedTokens,
        connected: ConnectedAccount,
        accountId: string = existing.accountId
      ) =>
        locks.withLock(
          existing.id,
          Effect.gen(function* reconnectLocked() {
            const now = yield* DateTime.now;

            const current = yield* channels.findById(
              existing.workspaceId,
              existing.id
            );

            const reconnected = reconnectChannel(
              Option.getOrElse(current, () => existing),
              connected,
              now
            );

            // The site's API may have moved under its home page, as when
            // its permalinks change: the channel follows it.
            const channel =
              reconnected.accountId === accountId
                ? reconnected
                : siteMovedTo(reconnected, accountId);

            const credentials = yield* encryptTokens(tokens, channel.id).pipe(
              withCipher
            );

            yield* channels.addingTo(
              channel.workspaceId,
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

      const add = Effect.fn("ConnectSite.add")(function* add(
        actor: Actor,
        signIn: SiteSignIn,
        site: VerifiedSite,
        tokens: IssuedTokens
      ) {
        const id = yield* newId(ChannelIdSchema).pipe(
          Effect.provideService(Ids, ids)
        );

        const channel = connectChannel(
          {
            ...connectedOf(site),
            accountId: site.accountId,
            id,
            platform: signIn.platform,
            workspaceId: actor.workspaceId,
          },
          yield* DateTime.now
        );

        const credentials = yield* encryptTokens(tokens, id).pipe(withCipher);

        yield* insertCounted(
          channel,
          credentials,
          events.connected(channel, false)
        );

        return channel;
      });

      const connect = Effect.fn("ConnectSite.connect")(function* connect(
        actor: Actor,
        signIn: SiteSignIn
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:connect"));
        yield* pace.take(actor.workspaceId);

        // A new site needs room in the plan: checked before the site is
        // called, unless the workspace has one on that host already.
        const known = yield* sitesOn(
          actor.workspaceId,
          signIn.platform,
          hostOf(signIn.address)
        );

        if (known.length === 0) {
          yield* roomForChannel(actor.workspaceId);
        }

        const site = yield* verifier.verify(signIn);
        const tokens = tokensOf(signIn, site);
        const connected = connectedOf(site);

        const existing = yield* channels.findByAccount(
          actor.workspaceId,
          signIn.platform,
          site.accountId
        );

        if (Option.isSome(existing)) {
          return yield* reconnectTo(existing.value, tokens, connected);
        }

        // The same site, its home page the same, under another API root
        // on the same host: a site elsewhere naming that home page, as a
        // copy of it does, is a site of its own.
        const moved = (yield* sitesOn(
          actor.workspaceId,
          signIn.platform,
          hostOf(connected.handle)
        )).find(
          (channel) =>
            channel.handle === connected.handle &&
            originOf(channel.accountId) === originOf(site.accountId)
        );

        if (moved !== undefined) {
          return yield* reconnectTo(moved, tokens, connected, site.accountId);
        }

        return yield* add(actor, signIn, site, tokens).pipe(
          // Connected from another tab meanwhile: this one reconnects it.
          Effect.catchTag("ChannelAlreadyConnected", () =>
            Effect.gen(function* raced() {
              const other = yield* channels.findByAccount(
                actor.workspaceId,
                signIn.platform,
                site.accountId
              );

              // Removed again since: nothing to reconnect, and the member
              // tries again.
              if (Option.isNone(other)) {
                return yield* new PlatformUnavailable();
              }

              return yield* reconnectTo(other.value, tokens, connectedOf(site));
            })
          )
        );
      });

      return ConnectSite.of({ connect });
    })
  );
}
