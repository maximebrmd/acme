import { DateTime, Duration, Option, Schema } from "effect";

import type { Channel, TokenLifetime } from "./channel.ts";

/**
 * Whether a platform's tokens can be renewed without the user:
 *
 * - `none`: they cannot. Before one expires, the user reconnects the account.
 * - `refreshToken`: a refresh token renews them, `ahead` of their expiry.
 *   When `rotates`, each refresh token works once, so a refresh runs alone
 *   on its channel and its answer is saved before anything uses it.
 */
export const TokenRefreshSchema = Schema.Union([
  Schema.TaggedStruct("none", {}),
  Schema.TaggedStruct("refreshToken", {
    ahead: Schema.Duration,
    rotates: Schema.Boolean,
  }),
]);

export type TokenRefresh = typeof TokenRefreshSchema.Type;

/**
 * How a platform's tokens live, as data the token jobs follow rather than
 * code per platform.
 *
 * `lifetime` is how long a token lasts after it was issued or last renewed,
 * for when the platform does not say; none when tokens never expire. For a
 * refreshable token, it is how long the stored credential keeps working
 * without a refresh, which is what the refresh sweep watches.
 */
export class TokenPolicy extends Schema.Class<TokenPolicy>(
  "acme-server/channels/domain/TokenPolicy"
)({
  lifetime: Schema.Option(Schema.Duration),
  refresh: TokenRefreshSchema,
}) {}

/**
 * The policies of the platforms Acme knows, from what each platform documents
 * (see the platform study). An adapter states which one it follows.
 */
export const tokenPolicies = {
  // OAuth sessions of a confidential client: the client renews its access
  // tokens (about an hour) as it uses them, and the refresh token they rotate
  // with stops working after 90 days unused, which the sweep heads off by
  // refreshing a month early. Sessions end for good after two years.
  bluesky: new TokenPolicy({
    lifetime: Option.some(Duration.days(90)),
    refresh: {
      _tag: "refreshToken",
      ahead: Duration.days(30),
      rotates: true,
    },
  }),
  // A development (loopback) client is public: its sessions last two weeks,
  // refreshed or not.
  blueskyLoopback: new TokenPolicy({
    lifetime: Option.some(Duration.days(14)),
    refresh: {
      _tag: "refreshToken",
      ahead: Duration.days(7),
      rotates: true,
    },
  }),
  // Page tokens never expire; they stop working when revoked.
  facebook: new TokenPolicy({
    lifetime: Option.none(),
    refresh: { _tag: "none" },
  }),
  // Through Facebook Login, an Instagram account publishes with the token
  // of the Page it is linked to, which never expires either.
  instagram: new TokenPolicy({
    lifetime: Option.none(),
    refresh: { _tag: "none" },
  }),
  // Self-serve apps get no refresh token: members reconnect every 60 days.
  linkedin: new TokenPolicy({
    lifetime: Option.some(Duration.days(60)),
    refresh: { _tag: "none" },
  }),
  // Tokens never expire; they stop working when the user revokes them.
  mastodon: new TokenPolicy({
    lifetime: Option.none(),
    refresh: { _tag: "none" },
  }),
  // Long-lived tokens last 60 days, and are renewed once at least a day old.
  threads: new TokenPolicy({
    lifetime: Option.some(Duration.days(60)),
    refresh: {
      _tag: "refreshToken",
      ahead: Duration.days(7),
      rotates: false,
    },
  }),
  // Access tokens last two hours by TikTok's guide (its examples say a
  // day: `expires_in` decides), and each refresh token works once. Refresh
  // tokens end 180 days after the creator signed in.
  tiktok: new TokenPolicy({
    lifetime: Option.some(Duration.hours(2)),
    refresh: {
      _tag: "refreshToken",
      ahead: Duration.minutes(30),
      rotates: true,
    },
  }),
  // Access tokens last two hours, and each refresh token works once.
  x: new TokenPolicy({
    lifetime: Option.some(Duration.hours(2)),
    refresh: {
      _tag: "refreshToken",
      ahead: Duration.minutes(30),
      rotates: true,
    },
  }),
} as const;

/** What a platform said about a token it just issued. */
export interface IssuedToken {
  /** When the platform said the token expires, if it did. */
  readonly expiresAt: Option.Option<DateTime.Utc>;
  /** Whether it came with what renews it. */
  readonly renewable: boolean;
}

/**
 * How long a token issued at `issuedAt` lasts under the policy: the expiry
 * the platform gave, or else the policy's lifetime. A token that expires is
 * refreshable when the policy refreshes and the platform gave the means to.
 */
export const tokenLifetimeOf = (
  policy: TokenPolicy,
  issued: IssuedToken,
  issuedAt: DateTime.Utc
): TokenLifetime => {
  const expiresAt = issued.expiresAt.pipe(
    Option.orElse(() =>
      policy.lifetime.pipe(
        Option.map((lifetime) => DateTime.addDuration(issuedAt, lifetime))
      )
    )
  );

  if (Option.isNone(expiresAt)) {
    return { _tag: "nonExpiring" };
  }

  return policy.refresh._tag === "refreshToken" && issued.renewable
    ? { _tag: "refreshable", expiresAt: expiresAt.value }
    : { _tag: "nonRefreshable", expiresAt: expiresAt.value, issuedAt };
};

/**
 * Refreshable tokens expiring before this instant are due for a refresh now.
 * None for a policy that never refreshes.
 */
export const refreshDueBefore = (
  policy: TokenPolicy,
  now: DateTime.Utc
): Option.Option<DateTime.Utc> =>
  policy.refresh._tag === "refreshToken"
    ? Option.some(DateTime.addDuration(now, policy.refresh.ahead))
    : Option.none();

/**
 * Whether the channel's token should be refreshed now: it is active, its
 * token renews itself, and the policy's lead time before expiry has begun. A
 * channel that already needs reconnecting is left to the user.
 */
export const isRefreshDue = (
  channel: Channel,
  policy: TokenPolicy,
  now: DateTime.Utc
): boolean => {
  const { status, token } = channel;

  return (
    status._tag === "active" &&
    token._tag === "refreshable" &&
    Option.exists(refreshDueBefore(policy, now), (before) =>
      DateTime.isLessThanOrEqualTo(token.expiresAt, before)
    )
  );
};
