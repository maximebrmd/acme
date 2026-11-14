import { Context, Option } from "effect";
import type { DateTime, Effect, Redacted } from "effect";

import type { AvatarUrl } from "#channels/domain/avatar-url.ts";
import type { Channel } from "#channels/domain/channel.ts";
import type { ConnectAttempt } from "#channels/domain/connect-attempt.ts";
import type { InvalidInstance } from "#channels/domain/invalid-instance.ts";
import type { ChannelPlatform, Platform } from "#channels/domain/platform.ts";
import type { TokenPolicy } from "#channels/domain/token-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { InstagramConnection } from "#shared/domain/instagram-connection.ts";
import type { LinkedInConnection } from "#shared/domain/linkedin-connection.ts";
import { storableLine } from "#shared/domain/platform-text.ts";
import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { TokenExpired } from "#shared/domain/token-expired.ts";

import type { AuthorizationDenied } from "./authorization-denied.ts";
import type { AuthorizationFailed } from "./authorization-failed.ts";
import type { InstanceNotAllowed } from "./instance-not-allowed.ts";
import type { InvalidHandle } from "./invalid-handle.ts";
import type { MissingTokenKey } from "./missing-token-key.ts";

/** What a member asked to connect. */
export interface AuthorizationRequest {
  /** A handle, DID or server to sign in with (Bluesky). */
  readonly handle: Option.Option<string>;
  /** The server the account lives on, as typed (Mastodon). */
  readonly instance: Option.Option<string>;
  /** The channel being reconnected, whose account the sign-in is for. */
  readonly reconnecting: Option.Option<Channel>;
  /**
   * The sign-in also asks to read and answer the account's direct
   * messages, where the platform asks for that apart (Bluesky's chat).
   */
  readonly messages?: boolean;
}

/** A sign-in the platform now waits on. */
export interface PendingAuthorization {
  /** The platform's page to send the browser to. */
  readonly authorizationUrl: string;
  /** The server the sign-in happens on, for platforms with many. */
  readonly instance: Option.Option<string>;
  /**
   * What completing the sign-in needs, which nobody else may read: a PKCE
   * verifier, or the OAuth client's own pending state. It is stored
   * encrypted until the callback.
   */
  readonly secret: Redacted.Redacted;
  /** Names the sign-in in the platform's callback. */
  readonly state: string;
}

/** What the platform added to the callback page's address. */
export interface AuthorizationCallback {
  readonly code: Option.Option<string>;
  readonly error: Option.Option<string>;
  readonly issuer: Option.Option<string>;
  readonly state: string;
}

/**
 * Tokens the platform issued, in the clear, as they leave it: everything to
 * store for the channel from now on, replacing what it had.
 */
export interface IssuedTokens {
  /**
   * The credential calls are made with: an access token, or a whole session
   * for platforms whose client library keeps one (Bluesky).
   */
  readonly accessToken: Redacted.Redacted;
  /** When the credential expires, if the platform said. */
  readonly expiresAt: Option.Option<DateTime.Utc>;
  readonly refreshToken: Option.Option<Redacted.Redacted>;
  /** Whether Peal can renew the credential without the user. */
  readonly renewable: boolean;
  /** What the account allowed, in the platform's words. */
  readonly scopes: readonly string[];
  /**
   * The platform user whose grant the tokens rest on, when it is not the
   * account itself: the Facebook user who manages a Page, or the app-scoped
   * id of an Instagram Login account's user. A request to delete that
   * user's data finds the channel by it. A refresh gives the same again.
   */
  readonly grantedBy?: string;
  /**
   * The platform member the token belongs to, when the account is not
   * theirs: a LinkedIn page's administrator, whose calls LinkedIn counts
   * per member. A refresh gives the one kept (`StoredTokens.tokenOwner`)
   * again; tokens saved without one forget it.
   */
  readonly tokenOwner?: string;
}

/** An account the platform handed over: who it is, and its tokens. */
export interface AuthorizedAccount {
  /** The account's id on the platform, which never changes. */
  readonly accountId: string;
  readonly avatarUrl: Option.Option<AvatarUrl>;
  readonly displayName: Option.Option<string>;
  readonly handle: string;
  readonly tokens: IssuedTokens;
}

/**
 * Several accounts a sign-in reached, for the member to choose from: the
 * Facebook Pages a user manages, or the Instagram accounts linked to them.
 * None at all when the user manages nothing Peal can post to.
 */
export interface AccountChoice {
  readonly _tag: "choice";
  readonly accounts: readonly AuthorizedAccount[];
}

/** What a completed sign-in handed over: an account, or a choice of them. */
export type Authorized = AccountChoice | AuthorizedAccount;

// The longest id, handle and name Peal keeps of an account.
const maxAccountIdLength = 512;
const maxHandleLength = 320;
const maxDisplayNameLength = 200;

/**
 * An account as Peal keeps it: its platform wrote its id, its handle and
 * its name, or let its owner write them, so each is made storable and
 * bounded (`#shared/domain/platform-text.ts`) before it is compared with
 * the channels the workspace has, stored, or shown.
 */
export const storableAccount = (
  account: AuthorizedAccount
): AuthorizedAccount => ({
  ...account,
  accountId: storableLine(account.accountId, maxAccountIdLength),
  displayName: account.displayName.pipe(
    Option.map((name) => storableLine(name, maxDisplayNameLength)),
    Option.filter((name) => name !== "")
  ),
  handle: storableLine(account.handle, maxHandleLength),
});

/** What a sign-in handed over, each account as Peal keeps it. */
export const storableAuthorized = (authorized: Authorized): Authorized =>
  "_tag" in authorized
    ? { _tag: "choice", accounts: authorized.accounts.map(storableAccount) }
    : storableAccount(authorized);

/** A channel's tokens, decrypted for the platform call that needs them. */
export interface StoredTokens {
  readonly accessToken: Redacted.Redacted;
  readonly refreshToken: Option.Option<Redacted.Redacted>;
  /** The member the token belongs to, as `IssuedTokens.tokenOwner`. */
  readonly tokenOwner?: string;
}

export type BeginFailure =
  | AuthorizationFailed
  | DatabaseError
  | InstanceNotAllowed
  | InvalidHandle
  | InvalidInstance
  | MissingTokenKey
  | PlatformUnavailable;

export type CompleteFailure =
  | AuthorizationDenied
  | AuthorizationFailed
  | InstanceNotAllowed
  | PlatformUnavailable;

/**
 * A refresh failing for good (`TokenExpired`: revoked, or past what the
 * platform renews) or for now (`PlatformUnavailable`: try again later).
 */
export type RefreshFailure = PlatformUnavailable | TokenExpired;

/**
 * One platform's sign-in flow and token renewal. Adapters call the platform;
 * they keep nothing themselves: the use cases store attempts and tokens,
 * encrypted, and hold the channel's lock around a refresh.
 */
export interface PlatformAuthorizer {
  readonly platform: Platform;
  /**
   * The way in this authorizer is, for the platforms that have several
   * (Instagram's two logins, LinkedIn's profile or page): its channels keep
   * it, so their tokens are renewed, and their posts sent, the same way.
   */
  readonly connection?: ChannelConnection;
  /** How the tokens this adapter issues live. */
  readonly policy: TokenPolicy;
  /** Prepares a sign-in and says where to send the browser. */
  readonly begin: (
    request: AuthorizationRequest
  ) => Effect.Effect<PendingAuthorization, BeginFailure>;
  /**
   * Exchanges what the callback brought for the account and its tokens, or
   * for the accounts the sign-in reached when it reaches several.
   */
  readonly complete: (request: {
    readonly attempt: ConnectAttempt;
    readonly callback: AuthorizationCallback;
    /**
     * The account of the channel the sign-in reconnects, if it reconnects
     * one: an authorizer that offers only some of the accounts a sign-in
     * reaches offers that one among them, when the sign-in reaches it.
     */
    readonly reconnecting: Option.Option<string>;
    readonly secret: Redacted.Redacted;
  }) => Effect.Effect<Authorized, CompleteFailure>;
  /**
   * Renews the channel's tokens. When the policy rotates refresh tokens, the
   * ones given stop working as soon as the platform answers, so the caller
   * saves the new ones before anything else.
   */
  readonly refresh: (
    channel: Channel,
    tokens: StoredTokens
  ) => Effect.Effect<IssuedTokens, RefreshFailure>;
  /**
   * Tells the platform the tokens are no longer wanted, once the channel is
   * disconnected and no other channel uses the account, for platforms that
   * take it (TikTok, Google). Disconnecting never waits on it: a failure is
   * logged, and the channel goes anyway. A token the platform no longer
   * knows is revoked already. Platforms without it keep the grant until the
   * user removes it.
   */
  readonly revoke?: (
    tokens: StoredTokens
  ) => Effect.Effect<void, PlatformUnavailable>;
}

/** The authorizers this server has, by platform. */
export class PlatformAuthorizers extends Context.Service<
  PlatformAuthorizers,
  {
    /**
     * The platform's authorizer, if this server can connect it: for
     * Instagram and LinkedIn, the one of the connection given, or without
     * one the server's first (`instagramConnections`, `linkedinConnections`).
     */
    readonly for: (
      platform: ChannelPlatform,
      connection?: Option.Option<ChannelConnection>
    ) => Option.Option<PlatformAuthorizer>;
    /**
     * Every authorizer this server has for the platform, one for each way
     * in: the token jobs read each one's policy, as a platform's ways in
     * renew their tokens differently (LinkedIn's pages, not its profiles).
     */
    readonly every: (
      platform: ChannelPlatform
    ) => readonly PlatformAuthorizer[];
    /**
     * The ways this server connects Instagram accounts, the one it prefers
     * first: Instagram Login, then Facebook Login.
     */
    readonly instagramConnections: readonly InstagramConnection[];
    /**
     * What this server connects on LinkedIn, each with an app of its own:
     * members' profiles, then the pages they administer.
     */
    readonly linkedinConnections: readonly LinkedInConnection[];
    /**
     * Platforms Peal supports but this server cannot connect for want of a
     * setting, as Bluesky without client keys in production.
     */
    readonly unconfigured: ReadonlySet<Platform>;
  }
>()("peal-server/channels/application/PlatformAuthorizers") {}
