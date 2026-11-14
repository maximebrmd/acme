import { DateTime, Option, Schema } from "effect";

/**
 * The policies' names, as the `RateLimit` headers and `TooManyRequests`
 * give them: `default` the server's setting (`PEAL_API_REQUESTS_PER_MINUTE`),
 * `free` a billing account without a payment method, `override` what
 * staff set for a workspace. Persisted in answers clients read: add, never
 * rename.
 */
export const PolicyNameSchema = Schema.Literals([
  "default",
  "free",
  "override",
]);

export type PolicyName = typeof PolicyNameSchema.Type;

/**
 * How many requests a credential may send in a window: `limit` requests
 * every `windowSeconds`. Windows are fixed and start on the clock
 * (10:00:00, 10:01:00…), the same for every credential, so a count is one
 * row and its reset is a time anyone can compute.
 */
export class RateLimitPolicy extends Schema.Class<RateLimitPolicy>(
  "peal-server/activity/domain/RateLimitPolicy"
)({
  limit: Schema.Int.check(Schema.isGreaterThan(0)),
  /** The policy's name in the `RateLimit` headers. */
  name: PolicyNameSchema,
  windowSeconds: Schema.Int.check(Schema.isGreaterThan(0)),
}) {}

/** The window an API key or an OAuth token's requests are counted in. */
export const requestWindowSeconds = 60;

/** How many requests a minute a credential may send, unless set otherwise. */
export const defaultRequestsPerMinute = 600;

/** A policy of `requestsPerMinute` in one-minute windows. */
export const policyNamed = (
  name: PolicyName,
  requestsPerMinute: number
): RateLimitPolicy =>
  new RateLimitPolicy({
    limit: requestsPerMinute,
    name,
    windowSeconds: requestWindowSeconds,
  });

/** The policy for the API's and the MCP endpoint's bearer credentials. */
export const requestPolicy = (requestsPerMinute: number): RateLimitPolicy =>
  policyNamed("default", requestsPerMinute);

/** The limits a server that bills chooses between. */
export interface StandingTerms {
  /** The server's setting: with a payment method, or a legacy plan. */
  readonly setting: number;
  /** Without one (the rate card's). */
  readonly withoutPaymentMethod: number;
}

/** What decides one workspace's limit. */
export interface WorkspaceLimitFacts {
  /** What staff set for it, if they did. */
  readonly override: Option.Option<number>;
  /** Whether its billing account pays: a payment method, or a legacy plan. */
  readonly paying: boolean;
}

// The order policies of the same limit are taken in.
const preference: Readonly<Record<PolicyName, number>> = {
  default: 0,
  free: 2,
  override: 1,
};

const policyOfWorkspace = (
  terms: StandingTerms,
  { override, paying }: WorkspaceLimitFacts
): RateLimitPolicy =>
  Option.match(override, {
    onNone: () =>
      paying
        ? policyNamed("default", terms.setting)
        : policyNamed("free", terms.withoutPaymentMethod),
    onSome: (limit) => policyNamed("override", limit),
  });

/**
 * The policy of a credential on a server that bills, from the workspaces
 * it acts for: each workspace's override when staff set one, else the
 * setting for a billing account that pays, else the free tier's; the most
 * generous of them, as one credential has one count. None (a person in no
 * workspace) is the free tier.
 */
export const policyOfWorkspaces = (
  terms: StandingTerms,
  workspaces: readonly WorkspaceLimitFacts[]
): RateLimitPolicy => {
  let chosen: RateLimitPolicy | undefined;

  for (const facts of workspaces) {
    const next = policyOfWorkspace(terms, facts);

    if (
      chosen === undefined ||
      next.limit > chosen.limit ||
      (next.limit === chosen.limit &&
        preference[next.name] < preference[chosen.name])
    ) {
      chosen = next;
    }
  }

  return chosen ?? policyNamed("free", terms.withoutPaymentMethod);
};

/**
 * The limit a payment method would give a credential on the free tier's
 * policy, when it gives more; none for any other policy.
 */
export const raisedByPaymentMethod = (
  terms: StandingTerms,
  policy: RateLimitPolicy
): Option.Option<number> =>
  policy.name === "free" && terms.setting > policy.limit
    ? Option.some(terms.setting)
    : Option.none();

/** Where a credential stands in the current window, this request counted. */
export interface LimitStanding {
  /** Whether this request is within the limit. */
  readonly allowed: boolean;
  readonly limit: number;
  /** Requests left in the window after this one. */
  readonly remaining: number;
  /** Seconds until the window ends and the count starts again: 1 at least. */
  readonly resetAfterSeconds: number;
  readonly windowSeconds: number;
}

/** When the window holding `now` started. */
export const windowStart = (
  policy: RateLimitPolicy,
  now: DateTime.Utc
): DateTime.Utc => {
  const length = policy.windowSeconds * 1000;
  const millis = DateTime.toEpochMillis(now);

  return DateTime.makeUnsafe(Math.floor(millis / length) * length);
};

/**
 * Where a credential stands once `count` requests, this one included, were
 * counted in the window holding `now`.
 */
export const standingOf = (
  policy: RateLimitPolicy,
  count: number,
  now: DateTime.Utc
): LimitStanding => {
  const ends =
    DateTime.toEpochMillis(windowStart(policy, now)) +
    policy.windowSeconds * 1000;

  return {
    allowed: count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - count),
    resetAfterSeconds: Math.max(
      1,
      Math.ceil((ends - DateTime.toEpochMillis(now)) / 1000)
    ),
    windowSeconds: policy.windowSeconds,
  };
};

/**
 * How long counts are kept after their window: they are only read while
 * the window runs, and the purge leaves a margin for a clock that differs.
 */
export const countRetentionSeconds = 3600;
