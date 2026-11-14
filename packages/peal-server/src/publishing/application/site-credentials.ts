import { Context } from "effect";
import type { Effect, Redacted } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";
import type { SitePlatform } from "#shared/domain/platform.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

import type { CredentialFailure } from "./platform-credentials.ts";

/** What a website's calls are made with. */
export interface SiteToken {
  /** The site's credential: its user and application password. */
  readonly credential: Redacted.Redacted;
  readonly platform: SitePlatform;
  /** The root of the site's API, as the channel keeps it. */
  readonly root: string;
}

/**
 * A website's credential, from the channels context: refused for a
 * channel disconnected or turned off (`BadRequest` with Peal's own codes),
 * or to reconnect (`TokenExpired`). One the site refuses (`TokenRejected`)
 * marks the channel to reconnect, as nothing renews it.
 */
export class SiteCredentials extends Context.Service<
  SiteCredentials,
  {
    readonly withToken: <A, E, R>(
      channelId: ChannelId,
      use: (token: SiteToken) => Effect.Effect<A, E | TokenRejected, R>
    ) => Effect.Effect<A, CredentialFailure | Exclude<E, TokenRejected>, R>;
  }
>()("peal-server/publishing/application/SiteCredentials") {}
