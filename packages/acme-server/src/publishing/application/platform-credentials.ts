import { Context } from "effect";
import type { Effect, Redacted } from "effect";

import type { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { TokenExpired } from "#shared/domain/token-expired.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

/** Who a channel posts as, on which platform. */
export interface PublishingAccount {
  /** The account's id on the platform, as the channels context stores it. */
  readonly accountId: string;
  readonly platform: Platform;
}

/** A token that works for the channel now, for the calls about to be made. */
export interface PublishingToken extends PublishingAccount {
  /**
   * The access token, or for Bluesky the saved OAuth session, as JSON,
   * whose access token and DPoP key sign each call.
   */
  readonly accessToken: Redacted.Redacted;
}

/**
 * Why no token could be had. Each means nothing was sent: the channel needs
 * reconnecting (`TokenExpired`), it was disconnected or turned off
 * (`BadRequest`), or the token could not be renewed for now
 * (`PlatformUnavailable`).
 */
export type CredentialFailure = BadRequest | PlatformUnavailable | TokenExpired;

/**
 * The channel's credentials, from the channels context, which keeps them
 * encrypted and renews them. A platform call that the platform refuses for
 * its token fails with TokenRejected: the token is renewed once and the call
 * made again, and a channel whose token cannot be renewed is marked for
 * reconnecting.
 */
export class PlatformCredentials extends Context.Service<
  PlatformCredentials,
  {
    readonly account: (
      channelId: ChannelId
    ) => Effect.Effect<PublishingAccount, CredentialFailure>;
    readonly withToken: <A, E, R>(
      channelId: ChannelId,
      use: (token: PublishingToken) => Effect.Effect<A, E | TokenRejected, R>
    ) => Effect.Effect<A, CredentialFailure | Exclude<E, TokenRejected>, R>;
  }
>()("acme-server/publishing/application/PlatformCredentials") {}
