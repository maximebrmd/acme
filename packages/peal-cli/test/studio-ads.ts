import { DateTime, Effect, Option, Ref } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  AdAccountNotFound,
  AdAccountUnusable,
  AdConnectionNotFound,
  AdSpendingNotEnabled,
  AdSpendingUnavailable,
  AdsUnavailable,
  Api,
  BoostInvalid,
  BoostKeyReused,
  BoostNotFound,
  BoostStateConflict,
  CeilingCurrencyMismatch,
  CurrentMember,
  dailyOverspendPercent,
  Forbidden,
  maxBoostRunDays,
  maxBoostStartAheadDays,
  PostNotPromotable,
  SpendCeilingExceeded,
} from "peal-contract";
import type {
  AdAccount,
  AdConnection,
  Boost,
  BoostViolation,
  Member,
  NewBoost,
  PaidTotals,
  Permission,
} from "peal-contract";

import type { Studio, StudioState } from "./studio.ts";

// The studio's ads: what the server offers of them, two connected ad
// accounts, what was read of them, and the boosts, kept in memory with
// their state. The handlers check who asks as the server does, keep the
// monthly ceiling and the idempotency key, and record each change.

const at = (iso: string) => DateTime.makeUnsafe(iso);

// Where the ads are: the studio, whose id the path names.
const studioWorkspaceId = "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60";

// The post's author, who signed in to the ad network too.
const ownerId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

/** When the studio's ads are read: the same moment as its posts. */
const adsNow = at("2026-11-09T12:00:00Z");

const refusedRequestId = "0190f3a0-0000-7000-8000-0000000c0001";

/** The ad account in euros: an owner allowed it to spend, 300.00 a month. */
export const euroAccountId = "0190f3a0-0000-7000-8000-0000000aa001";

/** The ad account in yen, which has no smaller unit: spending is off. */
export const yenAccountId = "0190f3a0-0000-7000-8000-0000000aa002";

export const adConnectionId = "0190f3a0-0000-7000-8000-0000000ac001";

/** A Facebook Page of the studio, known to its ads alone. */
export const facebookPageId = "0190f3a0-0000-7000-8000-00000000c007";

/** A post published on that Page, which can be boosted. */
export const boostablePostId = "0190f3a0-0000-7000-8000-00000000d00a";

/** A boost of that post that runs, committing 120.00 EUR. */
export const runningBoostId = "0190f3a0-0000-7000-8000-0000000ab001";

/** The id the studio gives the boost made after `made` others. */
export const boostIdAfter = (made: number): string =>
  `0190f3a0-0000-7000-8000-0000000ab${String(made + 1).padStart(3, "0")}`;

export const euroCeiling = 30_000;

const connection: AdConnection = {
  access: "working",
  createdAt: at("2026-10-01T09:00:00Z"),
  expiresAt: null,
  grantedBy: ownerId,
  id: adConnectionId,
  maySpend: true,
  network: "meta",
};

const adAccounts: readonly AdAccount[] = [
  {
    access: "working",
    amountSpent: 45_000,
    connectedAt: at("2026-10-01T09:05:00Z"),
    connectionId: adConnectionId,
    currency: "EUR",
    externalId: "act_1000000000000001",
    id: euroAccountId,
    minorUnitDigits: 2,
    monthlyCeiling: euroCeiling,
    name: "Studio ads",
    network: "meta",
    spendCap: null,
    spendingEnabled: true,
    status: "active",
    syncedAt: at("2026-11-09T11:07:00Z"),
    timeZone: "Europe/Paris",
  },
  {
    access: "working",
    amountSpent: null,
    connectedAt: at("2026-10-01T09:05:00Z"),
    connectionId: adConnectionId,
    currency: "JPY",
    externalId: "act_1000000000000002",
    id: yenAccountId,
    minorUnitDigits: 0,
    monthlyCeiling: null,
    name: "Studio Japan",
    network: "meta",
    spendCap: 500_000,
    spendingEnabled: false,
    status: "active",
    syncedAt: at("2026-11-09T11:07:00Z"),
    timeZone: "Asia/Tokyo",
  },
];

const runningBoost: Boost = {
  accountId: euroAccountId,
  audience: { ageMax: 65, ageMin: 18, countries: ["FR"] },
  beneficiary: "Studio",
  budget: { amount: 12_000, kind: "total" },
  channelId: facebookPageId,
  committed: 12_000,
  createdAt: at("2026-11-05T09:00:00Z"),
  currency: "EUR",
  endsAt: at("2026-11-25T09:00:00Z"),
  failureReason: null,
  id: runningBoostId,
  networkCode: null,
  objective: "engagement",
  payer: "Studio",
  platform: "facebook",
  postId: boostablePostId,
  startsAt: at("2026-11-05T09:00:00Z"),
  state: "active",
  stateAt: at("2026-11-05T09:01:00Z"),
  updatedAt: at("2026-11-05T09:01:00Z"),
};

/** What the studio holds of ads, and how its server is set. */
export interface AdsWorld {
  readonly accounts: readonly AdAccount[];
  readonly boosts: readonly Boost[];
  /** The boosts made under an idempotency key, with the request's body. */
  readonly keys: Readonly<
    Record<string, { readonly body: string; readonly boostId: string }>
  >;
  /** What the operator offers: `spend`, unless a test says otherwise. */
  readonly mode: "off" | "read" | "spend";
}

export const adsWorld: AdsWorld = {
  accounts: adAccounts,
  boosts: [runningBoost],
  keys: {},
  mode: "spend",
};

const totals = (spend: number, impressions: number): PaidTotals => ({
  clicks: Math.floor(impressions / 50),
  impressions,
  reach: Math.floor(impressions * 0.8),
  results: Math.floor(impressions / 100),
  spend,
});

const campaignId = "120210000000000001";

const record = (studio: Studio, change: string) =>
  Ref.update(studio.state, (current) => ({
    ...current,
    changes: [...current.changes, change],
  }));

const changeAds = (studio: Studio, change: (ads: AdsWorld) => AdsWorld) =>
  Ref.update(studio.state, (current): StudioState => ({
    ...current,
    ads: change(current.ads),
  }));

type AdsPermission = Extract<Permission, `ads:${string}`>;

// The scopes an application needs for each permission, as the server
// counts them: reading with any, managing with writing and ads, spending
// with publishing and ads; deciding what may be spent with none, ever.
const scopesFor: Readonly<Record<AdsPermission, readonly string[]>> = {
  "ads:authorize": [],
  "ads:manage": ["workspace:write", "workspace:ads"],
  "ads:read": ["workspace:read"],
  "ads:spend": ["workspace:publish", "workspace:ads"],
};

// A refusal as the server words it, with the envelope it fills.
const withoutPermission = (member: Member, permission: AdsPermission) =>
  new Forbidden({
    code: "forbidden",
    message:
      member.principal._tag === "apiKey"
        ? `This API key does not have the permission ${permission}. An owner or an admin of the workspace gives it to the key, or creates a key that has it.`
        : `Your role in this workspace does not have the permission ${permission}. An owner or an admin of the workspace changes roles, in its settings.`,
    permission,
    reason: "missingPermission",
    requestId: refusedRequestId,
  });

const withoutScope = (scope: string, permission: AdsPermission) =>
  new Forbidden({
    code: "forbidden",
    message: `This application was not given the scope ${scope}, which this request takes (permission ${permission}). Its user connects it to Peal again and allows it; for Peal's command line, run peal login again and approve it.`,
    permission,
    reason: "missingScope",
    requestId: refusedRequestId,
    scope,
  });

const personRequired = new Forbidden({
  code: "forbidden",
  message:
    "Only a person signed in to Peal does this, in the web app: not an API key, an application acting for them, or staff acting as them.",
  reason: "personRequired",
  requestId: refusedRequestId,
});

// Whether the member may do this: their role or their key first, then,
// for an application, the scopes its user gave it. No application decides
// what may be spent (ads:authorize), whatever its scopes.
const refusalOf = (
  member: Member,
  permission: AdsPermission
): Option.Option<Forbidden> => {
  if (!member.permissions.includes(permission)) {
    return Option.some(withoutPermission(member, permission));
  }

  const { principal } = member;

  if (principal._tag !== "user" || principal.oauth === undefined) {
    return Option.none();
  }

  if (permission === "ads:authorize") {
    return Option.some(withoutPermission(member, permission));
  }

  const { scopes } = principal.oauth;

  return Option.fromUndefinedOr(
    scopesFor[permission].find((needed) => !scopes.includes(needed))
  ).pipe(Option.map((scope) => withoutScope(scope, permission)));
};

const allowed = (permission: AdsPermission) =>
  CurrentMember.pipe(
    Effect.flatMap((member) =>
      Option.match(refusalOf(member, permission), {
        onNone: () => Effect.succeed(member),
        onSome: (refusal) => Effect.fail(refusal),
      })
    )
  );

// Pausing and stopping: whoever may spend, or manages ad accounts.
const controlling = CurrentMember.pipe(
  Effect.flatMap((member) =>
    Option.isNone(refusalOf(member, "ads:manage"))
      ? Effect.succeed(member)
      : allowed("ads:spend")
  )
);

// What only a person does, in their own session: a bearer credential, a
// key's or an application's, is never one.
const inPerson = (permission: AdsPermission) =>
  CurrentMember.pipe(
    Effect.flatMap((member) =>
      member.principal._tag !== "user" || member.principal.oauth !== undefined
        ? Effect.fail(personRequired)
        : allowed(permission)
    )
  );

const worldOf = (studio: Studio, workspaceId: string) =>
  Ref.get(studio.state).pipe(
    Effect.map(({ ads }): AdsWorld =>
      workspaceId === studioWorkspaceId
        ? ads
        : { accounts: [], boosts: [], keys: {}, mode: ads.mode }
    )
  );

const findAccount = (world: AdsWorld, accountId: string) =>
  Option.match(
    Option.fromUndefinedOr(world.accounts.find(({ id }) => id === accountId)),
    {
      onNone: () => Effect.fail(new AdAccountNotFound()),
      onSome: (account) => Effect.succeed(account),
    }
  );

const findBoost = (world: AdsWorld, boostId: string) =>
  Option.match(
    Option.fromUndefinedOr(world.boosts.find(({ id }) => id === boostId)),
    {
      onNone: () => Effect.fail(new BoostNotFound()),
      onSome: (boost) => Effect.succeed(boost),
    }
  );

// The states in which a boost's budget counts against the ceiling.
const counted: ReadonlySet<Boost["state"]> = new Set([
  "requested",
  "active",
  "paused",
  "unconfirmed",
]);

const committedOn = (
  world: AdsWorld,
  accountId: string,
  but?: string
): number =>
  world.boosts
    .filter(
      (boost) =>
        boost.accountId === accountId &&
        boost.id !== but &&
        counted.has(boost.state)
    )
    .reduce((sum, boost) => sum + boost.committed, 0);

const europeanUnion: ReadonlySet<string> = new Set([
  "BE",
  "DE",
  "ES",
  "FR",
  "IE",
  "IT",
  "NL",
  "PT",
]);

const aDay = 86_400_000;

// The calendar day of an instant in a zone, as milliseconds at midnight UTC.
const dayIn = (instant: DateTime.Utc, timeZone: string): number =>
  Option.match(DateTime.makeZoned(instant, { timeZone }), {
    onNone: () => 0,
    onSome: (zoned) => Date.parse(DateTime.formatIsoDate(zoned)),
  });

// Peal's own rules for a boost, every one it breaks at once.
const violationsOf = (
  asked: NewBoost,
  account: AdAccount,
  startsAt: DateTime.Utc
): BoostViolation[] => {
  const run =
    DateTime.toEpochMillis(asked.endsAt) - DateTime.toEpochMillis(startsAt);

  const ahead =
    DateTime.toEpochMillis(startsAt) - DateTime.toEpochMillis(adsNow);

  const shortest = asked.budget.kind === "daily" ? aDay + 1 : aDay;

  const declared = asked.beneficiary !== undefined && asked.payer !== undefined;

  const rules: readonly (readonly [BoostViolation, boolean])[] = [
    ["currencyMismatch", asked.currency !== account.currency],
    ["endsBeforeStart", run <= 0],
    ["runTooShort", run > 0 && run < shortest],
    ["runTooLong", run > maxBoostRunDays * aDay],
    ["startsTooFarAhead", ahead > maxBoostStartAheadDays * aDay],
    ["ageRange", asked.audience.ageMin > asked.audience.ageMax],
    ["specialCategory", asked.specialAdCategory !== "none"],
    [
      "beneficiaryRequired",
      !declared &&
        asked.audience.countries.some((country) => europeanUnion.has(country)),
    ],
  ];

  return rules.flatMap(([violation, broken]) => (broken ? [violation] : []));
};

// Whether the post is live on a channel ads can promote it on.
const promotable = (asked: NewBoost) => {
  if (asked.channelId === "0190f3a0-0000-7000-8000-00000000c005") {
    // The studio's Instagram account, connected through Instagram Login.
    return Effect.fail(new PostNotPromotable({ reason: "connection" }));
  }

  if (asked.channelId !== facebookPageId) {
    return Effect.fail(new PostNotPromotable({ reason: "platform" }));
  }

  return asked.postId === boostablePostId
    ? Effect.void
    : Effect.fail(new PostNotPromotable({ reason: "notPublished" }));
};

// A boost checked as the server checks it, with what it would commit.
const checkBoost = (studio: Studio, workspaceId: string, asked: NewBoost) =>
  Effect.gen(function* checking() {
    yield* allowed("ads:spend");

    const world = yield* worldOf(studio, workspaceId);

    if (world.mode !== "spend") {
      return yield* new AdSpendingUnavailable();
    }

    const account = yield* findAccount(world, asked.accountId);

    if (account.status !== "active") {
      return yield* new AdAccountUnusable({ reason: "status" });
    }

    if (!account.spendingEnabled || account.monthlyCeiling === null) {
      return yield* new AdSpendingNotEnabled();
    }

    yield* promotable(asked);

    const startsAt = asked.startsAt ?? adsNow;
    const violations = violationsOf(asked, account, startsAt);

    if (violations.length > 0) {
      return yield* new BoostInvalid({ violations });
    }

    const days =
      (dayIn(asked.endsAt, account.timeZone) -
        dayIn(startsAt, account.timeZone)) /
        aDay +
      1;

    const commitment =
      asked.budget.kind === "total"
        ? asked.budget.amount
        : Math.ceil(
            (asked.budget.amount * days * (100 + dailyOverspendPercent)) / 100
          );

    const committed = committedOn(world, account.id);

    if (committed + commitment > account.monthlyCeiling) {
      return yield* new SpendCeilingExceeded({
        ceiling: account.monthlyCeiling,
        code: "spend_ceiling_exceeded",
        committed,
        currency: account.currency,
        requestId: refusedRequestId,
        requested: commitment,
      });
    }

    return {
      account,
      quote: {
        capRoom: account.spendCap,
        ceiling: account.monthlyCeiling,
        commitment,
        committed,
        currency: account.currency,
        days,
        endsAt: asked.endsAt,
        minorUnitDigits: account.minorUnitDigits,
        startsAt,
      },
    };
  });

const saveBoost = (studio: Studio, boost: Boost) =>
  changeAds(studio, (ads) => ({
    ...ads,
    boosts: ads.boosts.some(({ id }) => id === boost.id)
      ? ads.boosts.map((found) => (found.id === boost.id ? boost : found))
      : [boost, ...ads.boosts],
  })).pipe(Effect.as(boost));

const standing = (boost: Boost, state: Boost["state"]): Boost => ({
  ...boost,
  state,
  stateAt: adsNow,
  updatedAt: adsNow,
});

// A member's change to a boost: done once, however often it is asked.
const control = (
  studio: Studio,
  params: { readonly boostId: string; readonly workspaceId: string },
  action: "pause" | "stop"
) =>
  Effect.gen(function* controlled() {
    yield* controlling;

    const world = yield* worldOf(studio, params.workspaceId);
    const boost = yield* findBoost(world, params.boostId);
    const wanted = action === "pause" ? "paused" : "stopped";

    if (boost.state === wanted) {
      return boost;
    }

    const open =
      action === "pause"
        ? boost.state === "active" ||
          boost.state === "requested" ||
          boost.state === "unconfirmed"
        : counted.has(boost.state);

    if (!open) {
      return yield* new BoostStateConflict({ state: boost.state });
    }

    yield* record(studio, `ads:boost:${action}:${boost.id}`);

    return yield* saveBoost(studio, standing(boost, wanted));
  });

const report = <Row>(
  account: AdAccount,
  query: { readonly from?: string; readonly to?: string },
  rows: readonly Row[]
) => ({
  account,
  from: query.from ?? "2026-10-11",
  rows,
  to: query.to ?? "2026-11-09",
});

export const adsGroupLive = (studio: Studio) =>
  HttpApiBuilder.group(Api, "ads", (handlers) =>
    handlers.handleAll({
      auditTrail: ({ params }) =>
        allowed("ads:authorize").pipe(
          Effect.andThen(worldOf(studio, params.workspaceId)),
          Effect.map((world) => ({
            entries: world.boosts.map((boost, index) => ({
              accountId: boost.accountId,
              action: "boostRequested" as const,
              amounts: {
                budget: boost.budget.amount,
                committed: boost.committed,
              },
              at: boost.createdAt,
              boostId: boost.id,
              by: { id: ownerId, kind: "user" as const, viaClient: null },
              currency: boost.currency,
              id: `0190f3a0-0000-7000-8000-0000000ae${String(index + 1).padStart(3, "0")}`,
            })),
            nextCursor: null,
          }))
        ),
      completeConnect: () =>
        inPerson("ads:manage").pipe(
          Effect.andThen(Effect.fail(new AdsUnavailable()))
        ),
      connect: () =>
        inPerson("ads:manage").pipe(
          Effect.andThen(Effect.fail(new AdsUnavailable()))
        ),
      connectAccounts: () =>
        inPerson("ads:manage").pipe(
          Effect.andThen(Effect.fail(new AdConnectionNotFound()))
        ),
      createBoost: ({ headers, params, payload }) =>
        Effect.gen(function* create() {
          const key = headers["idempotency-key"];
          const body = JSON.stringify(payload);
          const before = yield* worldOf(studio, params.workspaceId);
          const first = before.keys[key];

          // The same key and the same request answer the boost it made;
          // the same key and another request make nothing.
          if (first !== undefined) {
            yield* allowed("ads:spend");

            return first.body === body
              ? yield* findBoost(before, first.boostId).pipe(Effect.orDie)
              : yield* new BoostKeyReused();
          }

          const { account, quote } = yield* checkBoost(
            studio,
            params.workspaceId,
            payload
          );

          const boost: Boost = {
            accountId: account.id,
            audience: payload.audience,
            beneficiary: payload.beneficiary ?? null,
            budget: payload.budget,
            channelId: payload.channelId,
            committed: quote.commitment,
            createdAt: adsNow,
            currency: payload.currency,
            endsAt: payload.endsAt,
            failureReason: null,
            id: boostIdAfter(before.boosts.length),
            networkCode: null,
            objective: "engagement",
            payer: payload.payer ?? null,
            platform: "facebook",
            postId: payload.postId,
            startsAt: quote.startsAt,
            state: "requested",
            stateAt: adsNow,
            updatedAt: adsNow,
          };

          yield* changeAds(studio, (ads) => ({
            ...ads,
            keys: { ...ads.keys, [key]: { body, boostId: boost.id } },
          }));
          yield* record(
            studio,
            `ads:boost:create:${boost.id}:${payload.budget.kind}:${String(payload.budget.amount)}:${payload.currency}:${key}`
          );

          return yield* saveBoost(studio, boost);
        }),
      disconnect: () =>
        allowed("ads:manage").pipe(
          Effect.andThen(Effect.fail(new AdConnectionNotFound()))
        ),
      getAccount: ({ params }) =>
        Effect.gen(function* getAccount() {
          yield* allowed("ads:read");

          const world = yield* worldOf(studio, params.workspaceId);
          const account = yield* findAccount(world, params.accountId);

          return {
            account,
            committedThisMonth: committedOn(world, account.id),
          };
        }),
      getBoost: ({ params }) =>
        Effect.gen(function* getBoost() {
          yield* allowed("ads:read");

          const world = yield* worldOf(studio, params.workspaceId);
          const boost = yield* findBoost(world, params.boostId);

          return {
            boost,
            steps:
              boost.id === runningBoostId
                ? [
                    {
                      finishedAt: at("2026-11-05T09:00:20Z"),
                      networkCode: null,
                      outcome: "done" as const,
                      startedAt: at("2026-11-05T09:00:10Z"),
                      step: "createCampaign" as const,
                    },
                    {
                      finishedAt: at("2026-11-05T09:01:00Z"),
                      networkCode: null,
                      outcome: "done" as const,
                      startedAt: at("2026-11-05T09:00:50Z"),
                      step: "activateCampaign" as const,
                    },
                  ]
                : [],
          };
        }),
      listAccounts: ({ params }) =>
        allowed("ads:read").pipe(
          Effect.andThen(worldOf(studio, params.workspaceId)),
          Effect.map(({ accounts }) => accounts)
        ),
      listAds: ({ params, query }) =>
        Effect.gen(function* listAds() {
          yield* allowed("ads:read");

          const world = yield* worldOf(studio, params.workspaceId);
          const account = yield* findAccount(world, params.accountId);

          const rows =
            account.id === euroAccountId &&
            (query.campaignId === undefined || query.campaignId === campaignId)
              ? [
                  {
                    adSetExternalId: "120210000000000002",
                    campaignExternalId: campaignId,
                    externalId: "120210000000000003",
                    name: "Spring catalogue, boosted",
                    postId: boostablePostId,
                    rawStatus: "ACTIVE",
                    status: "active" as const,
                    totals: totals(4350, 12_000),
                  },
                ]
              : [];

          return report(account, query, rows);
        }),
      listBoosts: ({ params, query }) =>
        allowed("ads:read").pipe(
          Effect.andThen(worldOf(studio, params.workspaceId)),
          Effect.map(({ boosts }) => ({
            boosts: boosts.filter(
              ({ postId }) =>
                query.postId === undefined || postId === query.postId
            ),
            nextCursor: null,
          }))
        ),
      listCampaigns: ({ params, query }) =>
        Effect.gen(function* listCampaigns() {
          yield* allowed("ads:read");

          const world = yield* worldOf(studio, params.workspaceId);
          const account = yield* findAccount(world, params.accountId);

          const rows =
            account.id === euroAccountId
              ? [
                  {
                    dailyBudget: null,
                    endsAt: at("2026-11-25T09:00:00Z"),
                    externalId: campaignId,
                    name: "Spring catalogue",
                    objective: "engagement" as const,
                    rawStatus: "ACTIVE",
                    startsAt: at("2026-11-05T09:00:00Z"),
                    status: "active" as const,
                    syncedAt: at("2026-11-09T11:07:00Z"),
                    totalBudget: 12_000,
                    totals: totals(4350, 12_000),
                  },
                ]
              : [];

          return report(account, query, rows);
        }),
      listConnections: ({ params }) =>
        allowed("ads:read").pipe(
          Effect.as(
            params.workspaceId === studioWorkspaceId ? [connection] : []
          )
        ),
      listInsights: ({ params, query }) =>
        Effect.gen(function* listInsights() {
          yield* allowed("ads:read");

          const world = yield* worldOf(studio, params.workspaceId);
          const account = yield* findAccount(world, params.accountId);

          const rows =
            account.id === euroAccountId
              ? [
                  { day: "2026-11-07", totals: totals(2035, 5600) },
                  { day: "2026-11-08", totals: totals(2315, 6400) },
                ]
              : [];

          return report(account, query, rows);
        }),
      pauseBoost: ({ params }) => control(studio, params, "pause"),
      postPerformance: ({ params }) =>
        Effect.gen(function* postPerformance() {
          const member = yield* allowed("ads:read");
          const world = yield* worldOf(studio, params.workspaceId);
          const [account] = world.accounts;
          const promoted = params.postId === boostablePostId;

          return {
            boosts: world.boosts.filter(
              ({ postId }) => postId === params.postId
            ),
            organic:
              promoted && member.permissions.includes("analytics:read")
                ? [
                    {
                      channelId: facebookPageId,
                      impressions: 900,
                      likes: 40,
                      readAt: at("2026-11-09T11:07:00Z"),
                      replies: 5,
                      reposts: 3,
                    },
                  ]
                : [],
            paid:
              promoted && account !== undefined
                ? [{ account, ads: 1, totals: totals(4350, 12_000) }]
                : [],
          };
        }),
      quoteBoost: ({ params, payload }) =>
        checkBoost(studio, params.workspaceId, payload).pipe(
          Effect.map(({ quote }) => quote)
        ),
      reachableAccounts: () =>
        inPerson("ads:manage").pipe(
          Effect.andThen(Effect.fail(new AdConnectionNotFound()))
        ),
      removeAccount: ({ params }) =>
        Effect.gen(function* removeAccount() {
          yield* allowed("ads:manage");

          const world = yield* worldOf(studio, params.workspaceId);
          const account = yield* findAccount(world, params.accountId);

          yield* changeAds(studio, (ads) => ({
            ...ads,
            accounts: ads.accounts.filter(({ id }) => id !== account.id),
          }));
          yield* record(studio, `ads:account:remove:${account.id}`);
        }),
      resumeBoost: ({ params }) =>
        Effect.gen(function* resume() {
          yield* allowed("ads:spend");

          const world = yield* worldOf(studio, params.workspaceId);
          const boost = yield* findBoost(world, params.boostId);

          if (boost.state !== "paused") {
            return yield* new BoostStateConflict({ state: boost.state });
          }

          if (world.mode !== "spend") {
            return yield* new AdSpendingUnavailable();
          }

          const account = yield* findAccount(world, boost.accountId).pipe(
            Effect.orDie
          );

          if (!account.spendingEnabled || account.monthlyCeiling === null) {
            return yield* new AdSpendingNotEnabled();
          }

          const committed = committedOn(world, account.id, boost.id);

          if (committed + boost.committed > account.monthlyCeiling) {
            return yield* new SpendCeilingExceeded({
              ceiling: account.monthlyCeiling,
              committed,
              currency: account.currency,
              requested: boost.committed,
            });
          }

          yield* record(studio, `ads:boost:resume:${boost.id}`);

          return yield* saveBoost(studio, standing(boost, "active"));
        }),
      setSpending: ({ params, payload }) =>
        Effect.gen(function* setSpending() {
          yield* inPerson("ads:authorize");

          const world = yield* worldOf(studio, params.workspaceId);
          const account = yield* findAccount(world, params.accountId);
          const ceiling = payload.monthlyCeiling;

          if (ceiling !== undefined && ceiling.currency !== account.currency) {
            return yield* new CeilingCurrencyMismatch({
              accountCurrency: account.currency,
            });
          }

          const decided: AdAccount = {
            ...account,
            monthlyCeiling: payload.enabled ? (ceiling?.amount ?? null) : null,
            spendingEnabled: payload.enabled && ceiling !== undefined,
          };

          yield* changeAds(studio, (ads) => ({
            ...ads,
            accounts: ads.accounts.map((found) =>
              found.id === decided.id ? decided : found
            ),
          }));
          yield* record(studio, `ads:spending:${decided.id}`);

          return {
            account: decided,
            committedThisMonth: committedOn(world, decided.id),
          };
        }),
      status: () =>
        allowed("ads:read").pipe(
          Effect.andThen(Ref.get(studio.state)),
          Effect.map(({ ads }) => ({
            mode: ads.mode,
            networks: ads.mode === "off" ? [] : ["meta" as const],
          }))
        ),
      stopBoost: ({ params }) => control(studio, params, "stop"),
    })
  );
