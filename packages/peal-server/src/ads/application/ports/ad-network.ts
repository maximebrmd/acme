import { Context } from "effect";
import type { DateTime, Duration, Effect, Option, Redacted } from "effect";

import type { AdNetworkRefused } from "#ads/application/ad-network-refused.ts";
import type { AdSignInFailed } from "#ads/application/ad-sign-in-failed.ts";
import type { OutcomeUnknown } from "#ads/application/outcome-unknown.ts";
import type { AccountSnapshot } from "#ads/domain/account-snapshot.ts";
import type { AdAccountFacts } from "#ads/domain/ad-account-facts.ts";
import type { AdNetwork } from "#ads/domain/ad-network.ts";
import type { AdsMode } from "#ads/domain/ads-mode.ts";
import type { Audience } from "#ads/domain/audience.ts";
import type { BoostBudget, BoostPlatform } from "#ads/domain/boost.ts";
import type { NetworkObjectId } from "#ads/domain/ids.ts";
import type { Currency } from "#ads/domain/money.ts";
import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { RateLimited } from "#shared/domain/rate-limited.ts";
import type { TimeZoneId } from "#shared/domain/time-zone.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

/** What a sign-in handed over: the person, their token, what they allowed. */
export interface NetworkGrant {
  readonly expiresAt: Option.Option<DateTime.Utc>;
  readonly platformUserId: string;
  readonly scopes: readonly string[];
  readonly token: Redacted.Redacted;
}

/**
 * How a read can fail: the token refused (`TokenRejected`), the network
 * asking to wait (`RateLimited`) or not answering (`PlatformUnavailable`),
 * or refusing the request as sent (`AdNetworkRefused`).
 */
export type ReadFailure =
  | AdNetworkRefused
  | PlatformUnavailable
  | RateLimited
  | TokenRejected;

/**
 * How a request that changes something can fail: as a read does, each of
 * those being the network's answer that nothing changed, or without an
 * answer at all (`OutcomeUnknown`).
 */
export type WriteFailure = OutcomeUnknown | ReadFailure;

/**
 * What looking an object up found: it is there (`found`), it is not
 * (`absent`), or the network could not say (`unknown`).
 */
export type LookUp<A> =
  | { readonly _tag: "absent" }
  | { readonly _tag: "found"; readonly value: A }
  | { readonly _tag: "unknown" };

/** The post an ad shows, as its platform knows it. */
export interface PromotedPost {
  /** The Page that published it, or that the Instagram account is tied to. */
  readonly accountId: string;
  readonly platform: BoostPlatform;
  readonly platformPostId: string;
}

/** An object to make at the network, paused, under a name Peal chose. */
export type NewObject =
  | {
      readonly _tag: "campaign";
      readonly name: string;
    }
  | {
      readonly _tag: "adSet";
      readonly audience: Audience;
      readonly beneficiary: Option.Option<string>;
      readonly budget: BoostBudget;
      readonly campaignId: NetworkObjectId;
      readonly endsAt: DateTime.Utc;
      readonly name: string;
      readonly payer: Option.Option<string>;
      readonly startsAt: DateTime.Utc;
    }
  | {
      readonly _tag: "ad";
      readonly adSetId: NetworkObjectId;
      readonly name: string;
      readonly post: PromotedPost;
    };

/** What a sync reads of an account. */
export interface SnapshotRequest {
  readonly currency: Currency;
  readonly externalId: NetworkObjectId;
  /** The first and last days of insights to read, on the account's calendar. */
  readonly since: LocalDate;
  readonly timeZone: TimeZoneId;
  readonly until: LocalDate;
}

/** What a sync read, and whether the network cut it short. */
export interface Snapshot extends AccountSnapshot {
  /**
   * Whether the campaigns, ad sets and ads were all listed: only then is
   * one that was not listed known to be gone.
   */
  readonly complete: boolean;
  /**
   * The account as the network describes it now, when the read got it.
   */
  readonly facts: Option.Option<AdAccountFacts>;
  /**
   * How long the network asked to wait before the next read, when the
   * account neared or reached its rate limit: what was read is kept, and
   * the rest waits.
   */
  readonly haltedFor: Option.Option<Duration.Duration>;
}

/**
 * One ad network: its sign-in, its reads, and the few requests a boost is
 * made of. Adapters call the network and keep nothing: the use cases store
 * grants, journal every request that changes something before it leaves,
 * and decide what a failure means.
 *
 * Everything is made paused. `setRunning` is the one request that starts or
 * stops spending, and sets a state: sent twice, it changes nothing more.
 */
export interface AdNetworkClient {
  readonly network: AdNetwork;
  /** Where to send the browser to sign in, for a state Peal chose. */
  readonly authorizationUrl: (state: string) => string;
  /** Exchanges what the callback brought for the person's grant. */
  readonly complete: (
    code: string
  ) => Effect.Effect<NetworkGrant, AdSignInFailed | PlatformUnavailable>;
  /** Whether a grant with these scopes may make and run ads. */
  readonly maySpend: (scopes: readonly string[]) => boolean;
  /** The ad accounts the grant's person can use. */
  readonly accounts: (
    token: Redacted.Redacted
  ) => Effect.Effect<readonly AdAccountFacts[], ReadFailure>;
  /** One ad account, as the network describes it now. */
  readonly account: (
    token: Redacted.Redacted,
    externalId: NetworkObjectId
  ) => Effect.Effect<AdAccountFacts, ReadFailure>;
  /** The account's campaigns, ad sets, ads and their days. */
  readonly snapshot: (
    token: Redacted.Redacted,
    request: SnapshotRequest
  ) => Effect.Effect<Snapshot, ReadFailure>;
  /** Makes an object, paused. */
  readonly create: (
    token: Redacted.Redacted,
    account: NetworkObjectId,
    object: NewObject
  ) => Effect.Effect<NetworkObjectId, WriteFailure>;
  /** Looks for an object made earlier, by the name Peal chose for it. */
  readonly find: (
    token: Redacted.Redacted,
    account: NetworkObjectId,
    object: NewObject
  ) => Effect.Effect<LookUp<NetworkObjectId>>;
  /** Tells the network to run an object, or to pause it. */
  readonly setRunning: (
    token: Redacted.Redacted,
    objectId: NetworkObjectId,
    running: boolean
  ) => Effect.Effect<void, WriteFailure>;
  /** Whether the network was told to run the object. */
  readonly isRunning: (
    token: Redacted.Redacted,
    objectId: NetworkObjectId
  ) => Effect.Effect<LookUp<boolean>>;
}

/** The ad networks this server reaches, and what it offers of ads. */
export class AdNetworks extends Context.Service<
  AdNetworks,
  {
    readonly mode: AdsMode;
    /** The network's client, if this server is set up for it. */
    readonly for: (network: AdNetwork) => Option.Option<AdNetworkClient>;
    /** The networks this server is set up for. */
    readonly available: readonly AdNetwork[];
  }
>()("peal-server/ads/application/AdNetworks") {}
