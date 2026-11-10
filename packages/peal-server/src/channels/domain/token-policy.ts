import { DateTime, Duration, Option, Schema } from "effect";

import type { Channel, TokenLifetime } from "./channel.ts";

/**
 * When the refresh sweep renews a refreshable token:
 *
 * - `beforeExpiry`: `ahead` of its expiry, so it never lapses.
 * - `keepAlive`: only once it has gone `unused` past its expiry. Access is
 *   renewed when a call needs it (`ChannelAccess`); the sweep only keeps
 *   the refresh token of an account that does not post from going stale.
 */
export const RefreshSweepSchema = Schema.Union([
  Schema.TaggedStruct("beforeExpiry", { ahead: Schema.Duration }),
  Schema.TaggedStruct("keepAlive", { unused: Schema.Duration }),
]);

export type RefreshSweep = typeof RefreshSweepSchema.Type;

/**
 * Whether a platform's tokens can be renewed without the user:
 *
 * - `none`: they cannot. Before one expires, the user reconnects the account.
 * - `refreshToken`: a refresh token renews them, when a call needs it and
 *   when `sweep` says. When `rotates`, each refresh token works once, so a
 *   refresh runs alone on its channel and its answer is saved before
 *   anything uses it.
 */
export const TokenRefreshSchema = Schema.Union([
  Schema.TaggedStruct("none", {}),
  Schema.TaggedStruct("refreshToken", {
    rotates: Schema.Boolean,
    sweep: RefreshSweepSchema,
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
  "peal-server/channels/domain/TokenPolicy"
)({
  lifetime: Schema.Option(Schema.Duration),
  refresh: TokenRefreshSchema,
}) {}

/**
 * The policies of the platforms Peal knows, from what each platform documents
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
      rotates: true,
      sweep: { _tag: "beforeExpiry", ahead: Duration.days(30) },
    },
  }),
  // A development (loopback) client is public: its sessions last two weeks,
  // refreshed or not.
  blueskyLoopback: new TokenPolicy({
    lifetime: Option.some(Duration.days(14)),
    refresh: {
      _tag: "refreshToken",
      rotates: true,
      sweep: { _tag: "beforeExpiry", ahead: Duration.days(7) },
    },
  }),
  // Page tokens never expire; they stop working when revoked.
  facebook: new TokenPolicy({
    lifetime: Option.none(),
    refresh: { _tag: "none" },
  }),
  // A Business Profile location is reached with a Google grant, whose
  // tokens live as YouTube's: an hour, refreshed without rotating.
  googleBusiness: new TokenPolicy({
    lifetime: Option.some(Duration.hours(1)),
    refresh: {
      _tag: "refreshToken",
      rotates: false,
      sweep: { _tag: "beforeExpiry", ahead: Duration.minutes(15) },
    },
  }),
  // Through Facebook Login, an Instagram account publishes with the token
  // of the Page it is linked to, which never expires either.
  instagram: new TokenPolicy({
    lifetime: Option.none(),
    refresh: { _tag: "none" },
  }),
  // Through Instagram Login, a long-lived Instagram user token lasts 60
  // days and is renewed with itself once at least a day old; one nobody
  // renewed in 60 days cannot be renewed again. The sweep renews it a week
  // ahead, as Threads'.
  instagramLogin: new TokenPolicy({
    lifetime: Option.some(Duration.days(60)),
    refresh: {
      _tag: "refreshToken",
      rotates: false,
      sweep: { _tag: "beforeExpiry", ahead: Duration.days(7) },
    },
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
  // Access tokens last 30 days, and the continuous refresh token that
  // renews them 60, each refresh giving 60 more: the sweep renews a week
  // ahead, so neither lapses on an account that does not post. The refresh
  // token an answer brings replaces the one sent.
  pinterest: new TokenPolicy({
    lifetime: Option.some(Duration.days(30)),
    refresh: {
      _tag: "refreshToken",
      rotates: true,
      sweep: { _tag: "beforeExpiry", ahead: Duration.days(7) },
    },
  }),
  // Long-lived tokens last 60 days, and are renewed once at least a day old.
  threads: new TokenPolicy({
    lifetime: Option.some(Duration.days(60)),
    refresh: {
      _tag: "refreshToken",
      rotates: false,
      sweep: { _tag: "beforeExpiry", ahead: Duration.days(7) },
    },
  }),
  // Access tokens last two hours by TikTok's guide (its examples say a
  // day: `expires_in` decides), and each refresh token works once. Refresh
  // tokens end 180 days after the creator signed in.
  tiktok: new TokenPolicy({
    lifetime: Option.some(Duration.hours(2)),
    refresh: {
      _tag: "refreshToken",
      rotates: true,
      sweep: { _tag: "beforeExpiry", ahead: Duration.minutes(30) },
    },
  }),
  // Access tokens last two hours, and each refresh token works once. X
  // gives refresh tokens no lifetime: access is renewed when a post needs
  // it, and an account that does not post is renewed after 30 days, so its
  // refresh token never goes stale, rather than every two hours.
  x: new TokenPolicy({
    lifetime: Option.some(Duration.hours(2)),
    refresh: {
      _tag: "refreshToken",
      rotates: true,
      sweep: { _tag: "keepAlive", unused: Duration.days(30) },
    },
  }),
  // Google's access tokens last an hour; its refresh tokens do not rotate,
  // and work until revoked, left unused six months, or, for a Google
  // project in testing, seven days after the sign-in.
  youtube: new TokenPolicy({
    lifetime: Option.some(Duration.hours(1)),
    refresh: {
      _tag: "refreshToken",
      rotates: false,
      sweep: { _tag: "beforeExpiry", ahead: Duration.minutes(15) },
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
 * Refreshable tokens expiring before this instant are due for the sweep
 * now: those within the lead time before their expiry, or, to keep them
 * alive, those that expired longer ago than the policy leaves them unused.
 * None for a policy that never refreshes.
 */
export const refreshDueBefore = (
  policy: TokenPolicy,
  now: DateTime.Utc
): Option.Option<DateTime.Utc> => {
  const { refresh } = policy;

  if (refresh._tag === "none") {
    return Option.none();
  }

  const { sweep } = refresh;

  return Option.some(
    sweep._tag === "beforeExpiry"
      ? DateTime.addDuration(now, sweep.ahead)
      : DateTime.subtractDuration(now, sweep.unused)
  );
};

/**
 * Whether the sweep should refresh the channel's token now: it is active,
 * its token renews itself, and `refreshDueBefore` takes it. A channel that
 * already needs reconnecting is left to the user.
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
