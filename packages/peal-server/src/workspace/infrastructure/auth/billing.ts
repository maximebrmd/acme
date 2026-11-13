import { getCurrentAuthEndpointContext } from "@better-auth/core/context";
import { stripe } from "@better-auth/stripe";
import type { StripePlan } from "@better-auth/stripe";
import type { GenericEndpointContext } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { captcha } from "better-auth/plugins";
import { DateTime, Option, Redacted, Result, Schema } from "effect";
import type { Stripe } from "stripe";

import type { SubscriptionEvent } from "#billing/application/record-subscription.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { LocaleSchema } from "#shared/domain/locale.ts";
import { LegacyPaidPlanSchema, PaidPlanSchema } from "#shared/domain/plan.ts";
import type { PaidPlan, Plan } from "#shared/domain/plan.ts";
import type { CaptchaSettings } from "#shared/infrastructure/captcha-settings.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import type {
  CatalogueLookupKeys,
  StripeSettings,
} from "#shared/infrastructure/stripe-settings.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

/** A checkout about to start, for the order it needs. */
export interface CheckoutStart {
  /** The member's email address, as their session has it. */
  readonly email: string;
  readonly interval: "month" | "year";
  readonly orderId: string;
  readonly plan: PaidPlan;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
}

/**
 * Whether the checkout may start, and how: with the trial's days, or paid
 * at once; or why not, as Better Auth's error code.
 */
export type CheckoutAnswer =
  | {
      readonly _tag: "refused";
      readonly code:
        | "ALREADY_SUBSCRIBED"
        | "ORDER_REQUIRED"
        | "TRIAL_UNAVAILABLE";
    }
  | { readonly _tag: "start"; readonly trialDays: number | null };

/**
 * The way out of a limit, as a refusal tells clients: the workspace's plan,
 * the plan to order (null when none is larger) and its billing page.
 */
export interface Upgrade {
  readonly billingUrl: string;
  readonly plan: Plan;
  readonly planWithRoom: PaidPlan | null;
}

/** What the billing plugin calls back into the rest of the server for. */
export interface BillingHooks {
  /** Whether a checkout may start, from the order the member placed. */
  readonly checkout: (start: CheckoutStart) => Promise<CheckoutAnswer>;
  /**
   * The person who pays for the workspace, on a server that bills; null
   * on one that does not, where nobody's leaving is refused for it.
   */
  readonly payerOf: (workspaceId: WorkspaceId) => Promise<UserId | null>;
  /**
   * The workspace's owners changed (one left, was removed or changed
   * role): its billing account follows, its oldest owner paying when its
   * payer is no longer one. Never throws: the next read repairs it.
   */
  readonly ownersChanged: (workspaceId: string) => Promise<void>;
  /** The workspace's member allowance, from its plan. */
  readonly memberAllowance: (workspaceId: WorkspaceId) => Promise<Allowance>;
  /** The way out for a workspace whose members have no room for `needed`. */
  readonly memberUpgrade: (
    workspaceId: WorkspaceId,
    needed: number
  ) => Promise<Upgrade>;
  /**
   * Records what a webhook event says a subscription now is. A failure
   * makes the webhook answer an error, so Stripe sends the event again.
   */
  readonly subscriptionChanged: (event: SubscriptionEvent) => Promise<void>;
  /**
   * Gives a workspace just made its billing account: its creator's, made
   * then if they have none. Never throws: the account is given the next
   * time the workspace is read otherwise.
   */
  readonly workspaceCreated: (workspaceId: string) => Promise<void>;
}

/**
 * Cloudflare Turnstile on signing up and asking for a password reset: those
 * requests need the widget's token in `x-captcha-response`. Signing in is
 * left to the rate limits.
 */
export const turnstile = (settings: CaptchaSettings) =>
  captcha({
    endpoints: ["/sign-up/email", "/request-password-reset"],
    provider: "cloudflare-turnstile",
    secretKey: Redacted.value(settings.secretKey),
    ...Option.match(settings.verifyUrl, {
      onNone: () => ({}),
      onSome: (siteVerifyURLOverride) => ({ siteVerifyURLOverride }),
    }),
  });

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const decodeUserId = Schema.decodeUnknownOption(UserIdSchema);

// Better Auth's plans: per-account pricing, the only one sold, and the
// legacy plans, kept so their subscriptions' events are still recognised.
const decodePaidPlan = Schema.decodeUnknownOption(PaidPlanSchema);

const stripeInstant = Schema.optionalKey(Schema.NullOr(Schema.Number));

// What a subscription event carries that billing reads. Stripe sends more,
// and more over time: only these fields are decoded.
const StripeSubscriptionSchema = Schema.Struct({
  cancel_at: stripeInstant,
  cancel_at_period_end: Schema.Boolean,
  // An id: events never expand it.
  customer: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
  items: Schema.Struct({
    data: Schema.Array(
      Schema.Struct({
        current_period_end: Schema.optionalKey(Schema.Number),
        current_period_start: Schema.optionalKey(Schema.Number),
        price: Schema.Struct({
          id: Schema.String,
          lookup_key: Schema.optionalKey(Schema.NullOr(Schema.String)),
          recurring: Schema.optionalKey(
            Schema.NullOr(Schema.Struct({ interval: Schema.String }))
          ),
        }),
      })
    ),
  }),
  // The checkout's metadata, which names the member who started it.
  metadata: Schema.optionalKey(
    Schema.NullOr(Schema.Record(Schema.String, Schema.String))
  ),
  start_date: stripeInstant,
  status: Schema.String,
  trial_end: stripeInstant,
});

const decodeStripeSubscription = Schema.decodeUnknownOption(
  StripeSubscriptionSchema
);

const OrganizationRowSchema = Schema.Struct({ id: Schema.String });

const decodeOrganizationRow = Schema.decodeUnknownOption(OrganizationRowSchema);

const MemberRowSchema = Schema.Struct({ role: Schema.String });

const decodeMemberRow = Schema.decodeUnknownOption(MemberRowSchema);

const isImpersonation = Schema.is(
  Schema.Struct({ impersonatedBy: Schema.NonEmptyString })
);

const fromStripeTime = (seconds: number): DateTime.Utc =>
  DateTime.makeUnsafe(seconds * 1000);

// The workspace whose Stripe customer this is: Better Auth records it on the
// workspace before its first checkout.
const workspaceOfCustomer = async (
  customerId: string
): Promise<Option.Option<WorkspaceId>> => {
  const { adapter } = getCurrentAuthEndpointContext().context;

  const found: unknown = await adapter.findOne({
    model: "organization",
    select: ["id"],
    where: [{ field: "stripeCustomerId", value: customerId }],
  });

  return decodeOrganizationRow(found).pipe(
    Option.flatMap(({ id }) => decodeWorkspaceId(id))
  );
};

// The plan a subscription's prices buy, and how often, if one of them is a
// plan's, by its lookup key.
interface PricedPlan {
  readonly interval: "month" | "year";
  readonly plan: PaidPlan;
}

/**
 * The plan a subscription's prices buy: per-account pricing, monthly,
 * when the connected accounts' price is among them; else a legacy plan's,
 * by its lookup key.
 */
export const planOf = (
  { catalogue, prices }: Pick<StripeSettings, "catalogue" | "prices">,
  lookupKeys: readonly (string | null | undefined)[]
): Option.Option<PricedPlan> =>
  lookupKeys.includes(catalogue.accounts)
    ? Option.some({ interval: "month", plan: "payAsYouGo" })
    : legacyPlanOf(prices, lookupKeys);

const legacyPlanOf = (
  prices: StripeSettings["prices"],
  lookupKeys: readonly (string | null | undefined)[]
): Option.Option<PricedPlan> =>
  Option.fromUndefinedOr(
    LegacyPaidPlanSchema.literals
      .flatMap((plan): PricedPlan[] => [
        ...(lookupKeys.includes(prices[plan].month)
          ? [{ interval: "month" as const, plan }]
          : []),
        ...(lookupKeys.includes(prices[plan].year)
          ? [{ interval: "year" as const, plan }]
          : []),
      ])
      .at(0)
  );

const optionalTime = (value: number | null | undefined) =>
  value === undefined || value === null
    ? Option.none<DateTime.Utc>()
    : Option.some(fromStripeTime(value));

const isSubscriptionEvent = (type: string): boolean =>
  type.startsWith("customer.subscription.");

/**
 * Turns a Stripe event about a subscription into what billing records: the
 * workspace from the customer, the plan from the prices. An event about
 * another kind of object, or a subscription of no workspace, is logged and
 * left alone; one whose price is none this server lists goes to billing
 * without a plan, which keeps the one it recorded.
 */
const subscriptionEventOf = async (
  settings: StripeSettings,
  event: Stripe.Event,
  log: (message: string) => void
): Promise<Option.Option<SubscriptionEvent>> => {
  if (!isSubscriptionEvent(event.type)) {
    return Option.none();
  }

  const decoded = decodeStripeSubscription(event.data.object);

  if (Option.isNone(decoded)) {
    log(`Stripe event ${event.id} has no subscription billing can read`);

    return Option.none();
  }

  const subscription = decoded.value;
  const customerId = subscription.customer;

  const plan = planOf(
    settings,
    subscription.items.data.map(({ price }) => price.lookup_key)
  );

  const workspaceId = await workspaceOfCustomer(customerId);

  if (Option.isNone(workspaceId)) {
    log(`Stripe event ${event.id} is about a subscription of no workspace`);

    return Option.none();
  }

  const periodEnds = subscription.items.data.flatMap(
    ({ current_period_end: end }) => (end === undefined ? [] : [end])
  );

  const periodStarts = subscription.items.data.flatMap(
    ({ current_period_start: start }) => (start === undefined ? [] : [start])
  );

  const cancelAt = optionalTime(subscription.cancel_at);
  const trialEnd = optionalTime(subscription.trial_end);

  // A trial Peal set to end with its trial is not one someone cancelled.
  const endsWithTrial =
    subscription.status === "trialing" &&
    Option.isSome(cancelAt) &&
    Option.isSome(trialEnd) &&
    DateTime.isLessThanOrEqualTo(cancelAt.value, trialEnd.value);

  return Option.some({
    cancelAt,
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end ||
      (Option.isSome(cancelAt) && !endsWithTrial),
    currentPeriodEnd:
      periodEnds.length === 0
        ? Option.none()
        : Option.some(fromStripeTime(Math.max(...periodEnds))),
    currentPeriodStart:
      periodStarts.length === 0
        ? Option.none()
        : Option.some(fromStripeTime(Math.min(...periodStarts))),
    eventId: event.id,
    // None when the price is none this server lists now, as after its
    // prices changed: billing keeps the plan it recorded.
    interval: plan.pipe(
      Option.map(({ interval }) => interval),
      Option.getOrNull
    ),
    occurredAt: fromStripeTime(event.created),
    plan: plan.pipe(
      Option.map((priced) => priced.plan),
      Option.getOrNull
    ),
    startedAt: optionalTime(subscription.start_date),
    startedBy: Option.fromNullishOr(subscription.metadata?.["userId"]).pipe(
      Option.flatMap(decodeUserId)
    ),
    status: subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    trialEnd,
    workspaceId: workspaceId.value,
  });
};

// Better Auth's Stripe routes that only read.
const readsOnly: ReadonlySet<string> = new Set(["list-subscription"]);

/**
 * Who may act on a workspace's subscription: its members with
 * billing:manage, or billing:read to list it, never staff impersonating
 * them.
 */
const mayBill = async ({
  action,
  referenceId,
  session,
  user,
}: {
  readonly action: string;
  readonly referenceId: string;
  readonly session: unknown;
  readonly user: { readonly id: string };
}): Promise<boolean> => {
  const workspaceId = decodeWorkspaceId(referenceId);

  // No workspace has that id, which Postgres would refuse to compare.
  if (Option.isNone(workspaceId)) {
    return false;
  }

  const { adapter } = getCurrentAuthEndpointContext().context;

  const found: unknown = await adapter.findOne({
    model: "member",
    select: ["role"],
    where: [
      { field: "userId", value: user.id },
      { field: "organizationId", value: workspaceId.value },
    ],
  });

  const reading = readsOnly.has(action);
  const impersonated = isImpersonation(session);

  return Option.match(decodeMemberRow(found), {
    onNone: () => false,
    onSome: ({ role }) =>
      permissionsFor(role).includes(
        reading ? "billing:read" : "billing:manage"
      ) &&
      (reading || !impersonated),
  });
};

// Checkout with Stripe Tax, always: prices are tax-exclusive at Stripe and
// shown VAT included everywhere, so the VAT must be added. The customer's
// address and VAT number decide it, and both are kept on the customer for
// the next invoices.
const automaticTax = {
  automatic_tax: { enabled: true },
  billing_address_collection: "required",
  customer_update: { address: "auto", name: "auto" },
  tax_id_collection: { enabled: true },
} satisfies Stripe.Checkout.SessionCreateParams;

const PriceListSchema = Schema.Struct({
  data: Schema.Array(Schema.Struct({ id: Schema.NonEmptyString })),
});

const decodePriceList = Schema.decodeUnknownOption(PriceListSchema);

const ChangeErrors = {
  NAMED_SUBSCRIPTION: {
    code: "SUBSCRIPTION_CHOICE_REFUSED",
    message:
      "A workspace's subscription is changed from its billing page, which names none",
  },
  UNAVAILABLE: {
    code: "CHECKOUT_UNAVAILABLE",
    message: "Stripe could not open the checkout. Try again in a moment.",
  },
} as const;

// Nothing to add to the checkout.
const noParams = {} satisfies Stripe.Checkout.SessionCreateParams;

/** The first of the month after `nowMs`, 00:00 UTC, in Stripe's seconds. */
export const firstOfNextMonth = (nowMs: number): number => {
  const now = new Date(nowMs);

  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000;
};

// Stripe's shortest and longest checkout sessions, with a minute's margin
// on the shortest.
const shortestCheckoutSeconds = 31 * 60;

const longestCheckoutSeconds = 24 * 60 * 60;

// Per-account pricing: a card always, though nothing is due before the
// month's end, and every subscription billing calendar months (UTC), as
// the billing page and the allowances count in them. The first, partial
// month starts its own ladder, free accounts included. The anchor is set
// when the session is made, so the session closes before it passes; when
// the month ends sooner than Stripe's shortest session, the anchor is the
// first of the month after. The day's end counts from the hour, so the
// same order asked again within it sends the same parameters under its
// idempotency key (`checkoutBeside`).
export const payingParams = (nowMs: number) => {
  const now = Math.floor(nowMs / 1000);
  const hour = now - (now % 3600);
  const next = firstOfNextMonth(nowMs);

  const anchor =
    next - now < shortestCheckoutSeconds ? firstOfNextMonth(next * 1000) : next;

  return {
    expires_at: Math.min(hour + longestCheckoutSeconds, anchor),
    payment_method_collection: "always",
    subscription_data: {
      billing_cycle_anchor: anchor,
      proration_behavior: "none",
    },
  } satisfies Stripe.Checkout.SessionCreateParams;
};

/** A checkout's line item: a price, by its id. */
export type CatalogueLineItem = Stripe.Checkout.SessionCreateParams.LineItem;

/** What lists Stripe's prices, as `stripe.prices` does. */
export interface PriceLister {
  readonly list: (params: {
    readonly active: boolean;
    readonly limit: number;
    readonly lookup_keys: string[];
  }) => Promise<{ readonly data: readonly { readonly id: string }[] }>;
}

/**
 * The line items per-account pricing's checkout adds to the connected
 * accounts' price: each meter's price, found by its lookup key, metered,
 * so without a quantity. None when one cannot be found, or Stripe does not
 * answer: no checkout then opens without them.
 */
export const catalogueLineItems = async (
  prices: PriceLister,
  keys: CatalogueLookupKeys
): Promise<Option.Option<readonly CatalogueLineItem[]>> => {
  const meterKeys = [
    keys.outboundMessages,
    keys.managedAds,
    keys.assistantRequests,
    keys.assistantImages,
    keys.xApi,
  ];

  const found = await Promise.all(
    meterKeys.map(async (key) => {
      const listed = await prices.list({
        active: true,
        limit: 1,
        lookup_keys: [key],
      });

      return Option.fromUndefinedOr(listed.data[0]);
    })
  ).catch(() => [Option.none()]);

  const ids = found.flatMap((price) =>
    Option.match(price, { onNone: () => [], onSome: ({ id }) => [id] })
  );

  return ids.length === meterKeys.length
    ? Option.some(ids.map((price) => ({ price })))
    : Option.none();
};

// How long the meters' prices found are kept: a price replaced at Stripe
// (its lookup key moved) reaches checkouts within this.
const lineItemsLifetimeMs = 5 * 60 * 1000;

// How long a failed lookup is kept: while a price is missing or Stripe is
// slow, the webhooks and the plugin's routes do not each ask again.
const lineItemsFailureMs = 10 * 1000;

/**
 * Each meter's price, found once a while and kept while it is fresh; a
 * lookup that found none is kept a few seconds.
 */
export const keptLineItems = (
  prices: PriceLister,
  keys: CatalogueLookupKeys,
  clock: () => number = Date.now
) => {
  let kept:
    | {
        readonly at: number;
        readonly items: Option.Option<readonly CatalogueLineItem[]>;
      }
    | undefined;

  return async (): Promise<Option.Option<readonly CatalogueLineItem[]>> => {
    const now = clock();

    if (
      kept !== undefined &&
      now - kept.at <
        (Option.isSome(kept.items) ? lineItemsLifetimeMs : lineItemsFailureMs)
    ) {
      return kept.items;
    }

    const found = await catalogueLineItems(prices, keys);

    kept = { at: now, items: found };

    return found;
  };
};

// Whether the line items Better Auth read with the plan carry every meter's
// price found now: the plans may have been read while a lookup failed.
const carriesEvery = (
  handed: readonly CatalogueLineItem[] | undefined,
  items: readonly CatalogueLineItem[]
) =>
  items.every(({ price }) =>
    (handed ?? []).some((item) => item.price === price)
  );

// How long a trial's checkout stays open: Stripe's shortest, a few minutes
// more, well within the trial's hold (`trialReservationMinutes`), so a
// checkout cannot complete once its hold is gone.
const trialCheckoutMinutes = 35;

// A trial without a payment method: Stripe asks for none, and cancels the
// subscription when the trial ends without one, which puts the workspace
// back on the free plan; once it is recorded, it is also set to end with
// its trial, should someone add a payment method. A paid plan starts with
// an order of its own.
const trialParams = (days: number) =>
  ({
    expires_at: Math.floor(Date.now() / 1000) + trialCheckoutMinutes * 60,
    payment_method_collection: "if_required",
    subscription_data: {
      trial_period_days: days,
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    },
  }) satisfies Stripe.Checkout.SessionCreateParams;

// What an upgrade request says of the order it follows.
const UpgradeBodySchema = Schema.Struct({
  annual: Schema.optionalKey(Schema.Boolean),
  metadata: Schema.optionalKey(
    Schema.Struct({ orderId: Schema.optionalKey(Schema.String) })
  ),
});

const decodeUpgradeBody = Schema.decodeUnknownOption(UpgradeBodySchema);

const OrderErrors = {
  ALREADY_SUBSCRIBED: {
    code: "ALREADY_SUBSCRIBED",
    message:
      "The billing account already has per-account pricing: update its payment method in the customer portal instead",
  },
  ORDER_REQUIRED: {
    code: "CHECKOUT_ORDER_REQUIRED",
    message:
      "Place the order on the billing page first, with the consent it asks",
  },
  TRIAL_UNAVAILABLE: {
    code: "TRIAL_UNAVAILABLE",
    message: "The workspace or the account already had its trial",
  },
} as const;

/**
 * The checkout's parameters for the order the member placed on the billing
 * page (`metadata.orderId`): refused without one; Stripe Tax's; for
 * per-account pricing a card always and the first of next month as the
 * billing anchor, and none while its meters' prices cannot be found
 * (`lineItems`, which Better Auth's plan adds to the checkout) or the plan
 * Better Auth read lacks one of them; and, for a
 * legacy trial, its days and no payment method.
 */
export const checkoutParams =
  (
    hooks: BillingHooks,
    lineItems: () => Promise<Option.Option<readonly CatalogueLineItem[]>>
  ) =>
  async (
    {
      plan,
      subscription,
      user,
    }: {
      readonly plan: {
        readonly lineItems?: readonly CatalogueLineItem[] | undefined;
        readonly name: string;
      };
      readonly subscription: { readonly referenceId: string };
      readonly user: { readonly email: string; readonly id: string };
    },
    _request: GenericEndpointContext["request"],
    ctx: { readonly body?: unknown } | undefined
  ) => {
    const body = decodeUpgradeBody(ctx?.body).pipe(Option.getOrUndefined);
    const workspaceId = decodeWorkspaceId(subscription.referenceId);
    const userId = decodeUserId(user.id);
    const paidPlan = decodePaidPlan(plan.name);
    const orderId = body?.metadata?.orderId;

    if (
      Option.isNone(workspaceId) ||
      Option.isNone(userId) ||
      Option.isNone(paidPlan) ||
      orderId === undefined
    ) {
      throw APIError.from("BAD_REQUEST", OrderErrors.ORDER_REQUIRED);
    }

    const answer = await hooks.checkout({
      email: user.email,
      interval: body?.annual === true ? "year" : "month",
      orderId,
      plan: paidPlan.value,
      userId: userId.value,
      workspaceId: workspaceId.value,
    });

    if (answer._tag === "refused") {
      throw APIError.from("BAD_REQUEST", OrderErrors[answer.code]);
    }

    if (paidPlan.value === "payAsYouGo") {
      const items = await lineItems();

      if (Option.isNone(items) || !carriesEvery(plan.lineItems, items.value)) {
        throw APIError.from("BAD_REQUEST", ChangeErrors.UNAVAILABLE);
      }

      return { params: { ...automaticTax, ...payingParams(Date.now()) } };
    }

    const trial =
      answer.trialDays === null ? noParams : trialParams(answer.trialDays);

    return { params: { ...automaticTax, ...trial } };
  };

// What an upgrade request names, for a workspace that already has a
// subscription Better Auth would change in place.
const UpgradeRequestSchema = Schema.Struct({
  annual: Schema.optionalKey(Schema.Boolean),
  cancelUrl: Schema.optionalKey(Schema.String),
  disableRedirect: Schema.optionalKey(Schema.Boolean),
  locale: Schema.optionalKey(Schema.Unknown),
  metadata: Schema.optionalKey(
    Schema.Struct({ orderId: Schema.optionalKey(Schema.String) })
  ),
  plan: Schema.String,
  referenceId: Schema.optionalKey(Schema.String),
  subscriptionId: Schema.optionalKey(Schema.Unknown),
  successUrl: Schema.optionalKey(Schema.String),
});

const decodeUpgradeRequest = Schema.decodeUnknownOption(UpgradeRequestSchema);

const decodeLocale = Schema.decodeUnknownOption(LocaleSchema);

const LiveRowSchema = Schema.Struct({
  status: Schema.Literals(["active", "trialing"]),
});

const decodeLiveRow = Schema.decodeUnknownOption(LiveRowSchema);

const CustomerRowSchema = Schema.Struct({
  stripeCustomerId: Schema.NonEmptyString,
});

const decodeCustomerRow = Schema.decodeUnknownOption(CustomerRowSchema);

const SessionUrlSchema = Schema.Struct({ url: Schema.NonEmptyString });

const decodeSessionUrl = Schema.decodeUnknownOption(SessionUrlSchema);

// The status of the subscription Better Auth would change in place rather
// than open a checkout for: the workspace's active or trialing one.
const liveStatusOf = async (
  workspaceId: WorkspaceId
): Promise<Option.Option<typeof LiveRowSchema.Type.status>> => {
  const { adapter } = getCurrentAuthEndpointContext().context;

  const rows: unknown[] = await adapter.findMany({
    model: "subscription",
    select: ["status"],
    where: [{ field: "referenceId", value: workspaceId }],
  });

  const live = rows.flatMap((row) => Option.toArray(decodeLiveRow(row)));

  return Option.fromUndefinedOr(
    live.find(({ status }) => status === "trialing") ?? live.at(0)
  ).pipe(Option.map(({ status }) => status));
};

// A return address the checkout may send the browser to: one of the
// server's, or of an origin it trusts.
const trustedUrl = (
  ctx: GenericEndpointContext,
  url: string | undefined
): string => {
  const { origin } = new URL(ctx.context.baseURL);
  const absolute = new URL(url ?? "/", origin).href;

  if (!ctx.context.isTrustedOrigin(absolute, { allowRelativePaths: false })) {
    throw APIError.from("FORBIDDEN", {
      code: "INVALID_CALLBACK_URL",
      message: "The return address is not one this server trusts",
    });
  }

  return absolute;
};

/**
 * Opens a checkout of its own for per-account pricing, ordered by a
 * workspace that already has a live subscription (a legacy plan, or a
 * trial): a new subscription beside it, which runs until the new one is
 * recorded (`RecordSubscription` then ends the trial, or sets the legacy
 * plan to end with its period). Better Auth would rather change the live
 * subscription in place, which would swap its plan's price and leave the
 * meters out. Its line items are the connected accounts' price and each
 * meter's, metered, so without a quantity.
 */
const checkoutBeside = async (
  client: Stripe,
  settings: StripeSettings,
  lineItems: () => Promise<Option.Option<readonly CatalogueLineItem[]>>,
  order: {
    readonly cancelUrl: string;
    readonly locale: Option.Option<"en" | "fr">;
    readonly orderId: string;
    readonly successUrl: string;
    readonly userId: UserId;
    readonly workspaceId: WorkspaceId;
  }
): Promise<string> => {
  const { adapter } = getCurrentAuthEndpointContext().context;

  const found: unknown = await adapter.findOne({
    model: "organization",
    select: ["stripeCustomerId"],
    where: [{ field: "id", value: order.workspaceId }],
  });

  const customer = decodeCustomerRow(found);
  const meters = await lineItems();

  if (Option.isNone(customer) || Option.isNone(meters)) {
    throw APIError.from("BAD_REQUEST", ChangeErrors.UNAVAILABLE);
  }

  const session = await client.prices
    .list({
      active: true,
      limit: 1,
      lookup_keys: [settings.catalogue.accounts],
    })
    .then(async (prices) => {
      const price = decodePriceList(prices).pipe(
        Option.flatMap(({ data }) => Option.fromUndefinedOr(data[0]))
      );

      if (Option.isNone(price)) {
        return Option.none();
      }

      const metadata = {
        orderId: order.orderId,
        referenceId: order.workspaceId,
        userId: order.userId,
      };

      const paying = payingParams(Date.now());

      return decodeSessionUrl(
        await client.checkout.sessions.create(
          {
            ...automaticTax,
            cancel_url: order.cancelUrl,
            client_reference_id: order.workspaceId,
            customer: customer.value.stripeCustomerId,
            line_items: [{ price: price.value.id }, ...meters.value],
            metadata,
            mode: "subscription",
            expires_at: paying.expires_at,
            payment_method_collection: paying.payment_method_collection,
            subscription_data: { ...paying.subscription_data, metadata },
            success_url: order.successUrl,
            ...Option.match(order.locale, {
              onNone: () => ({}),
              onSome: (locale) => ({ locale }),
            }),
          },
          { idempotencyKey: `checkout-${order.orderId}` }
        )
      );
    })
    .catch(() => Option.none());

  if (Option.isNone(session)) {
    throw APIError.from("BAD_REQUEST", ChangeErrors.UNAVAILABLE);
  }

  return session.value.url;
};

// The checkout to answer instead of Better Auth's in-place change, if any,
// once the order is taken.
const checkoutInstead = async (
  client: Stripe,
  settings: StripeSettings,
  hooks: BillingHooks,
  lineItems: () => Promise<Option.Option<readonly CatalogueLineItem[]>>,
  ctx: GenericEndpointContext
): Promise<
  Option.Option<{ readonly redirect: boolean; readonly url: string }>
> => {
  const request = decodeUpgradeRequest(ctx.body);

  if (Option.isNone(request)) {
    return Option.none();
  }

  if (request.value.subscriptionId !== undefined) {
    throw APIError.from("BAD_REQUEST", ChangeErrors.NAMED_SUBSCRIPTION);
  }

  const workspaceId = decodeWorkspaceId(request.value.referenceId);
  const plan = decodePaidPlan(request.value.plan);

  if (Option.isNone(workspaceId) || Option.isNone(plan)) {
    return Option.none();
  }

  const live = await liveStatusOf(workspaceId.value);

  if (Option.isNone(live)) {
    return Option.none();
  }

  const session = await getSessionFromCtx(ctx);
  const userId = decodeUserId(session?.user.id);

  if (
    session === null ||
    Option.isNone(userId) ||
    !session.user.emailVerified ||
    !(await mayBill({
      action: "upgrade-subscription",
      referenceId: workspaceId.value,
      session: session.session,
      user: session.user,
    }))
  ) {
    return Option.none();
  }

  const orderId = request.value.metadata?.orderId;

  if (orderId === undefined) {
    throw APIError.from("BAD_REQUEST", OrderErrors.ORDER_REQUIRED);
  }

  const interval = request.value.annual === true ? "year" : "month";

  const answer = await hooks.checkout({
    email: session.user.email,
    interval,
    orderId,
    plan: plan.value,
    userId: userId.value,
    workspaceId: workspaceId.value,
  });

  if (answer._tag === "refused") {
    throw APIError.from("BAD_REQUEST", OrderErrors[answer.code]);
  }

  // A legacy plan changed in place: no order for one is taken any more,
  // so only one placed before is.
  if (plan.value !== "payAsYouGo") {
    return Option.none();
  }

  const url = await checkoutBeside(client, settings, lineItems, {
    cancelUrl: trustedUrl(ctx, request.value.cancelUrl),
    locale: decodeLocale(request.value.locale),
    orderId,
    successUrl: trustedUrl(ctx, request.value.successUrl),
    userId: userId.value,
    workspaceId: workspaceId.value,
  });

  return Option.some({
    redirect: request.value.disableRedirect !== true,
    url,
  });
};

/**
 * The order an upgrade needs when the workspace already has a subscription,
 * which Better Auth changes in place, through Stripe's API or its portal,
 * without the checkout whose parameters take the order
 * (`getCheckoutSessionParams`): the order is taken here first, for the
 * same member, plan and interval, or the request refused. During the
 * trial, a paid plan opens a checkout of its own (`checkoutDuringTrial`),
 * and the trial runs until it is paid. A request naming a subscription is
 * refused: the billing page names none. Requests Better Auth refuses
 * itself, as from someone who may not bill, are left to it.
 */
const orderedChange =
  (
    client: Stripe,
    settings: StripeSettings,
    hooks: BillingHooks,
    lineItems: () => Promise<Option.Option<readonly CatalogueLineItem[]>>
  ) =>
  async (ctx: GenericEndpointContext) => {
    const checkout = await checkoutInstead(
      client,
      settings,
      hooks,
      lineItems,
      ctx
    );

    // Null lets Better Auth's route go on.
    return Option.isSome(checkout) ? await ctx.json(checkout.value) : null;
  };

/**
 * Better Auth's Stripe plugin, for workspace subscriptions: checkout and
 * the customer portal for members with billing:manage, and the webhook at
 * /api/auth/stripe/webhook, whose events, once their signature is checked,
 * update the workspace's subscription in the billing context.
 */
export const stripeBilling = (
  settings: StripeSettings,
  hooks: BillingHooks,
  log: (message: string) => void
) => {
  const client = stripeClientOf(settings);

  const lineItems = keptLineItems(client.prices, settings.catalogue);

  // The legacy plans, whose subscriptions' events must still be read, and
  // per-account pricing: the connected accounts' price, metered (so Better
  // Auth gives it no quantity), and each meter's price as a line item.
  const legacy: StripePlan[] = LegacyPaidPlanSchema.literals.map((name) => ({
    annualDiscountLookupKey: settings.prices[name].year,
    lookupKey: settings.prices[name].month,
    name,
  }));

  const plans = async (): Promise<StripePlan[]> => {
    const meters = await lineItems();

    return [
      ...legacy,
      {
        lookupKey: settings.catalogue.accounts,
        name: "payAsYouGo",
        ...Option.match(meters, {
          onNone: () => ({}),
          onSome: (items) => ({ lineItems: [...items] }),
        }),
      },
    ];
  };

  const plugin = stripe({
    onEvent: async (event) => {
      const found = await subscriptionEventOf(settings, event, log);

      if (Option.isSome(found)) {
        await hooks.subscriptionChanged(found.value);
      }
    },
    organization: { enabled: true },
    stripeClient: client,
    stripeWebhookSecret: Redacted.value(settings.webhookSecret),
    subscription: {
      authorizeReference: mayBill,
      enabled: true,
      getCheckoutSessionParams: checkoutParams(hooks, lineItems),
      plans,
      requireEmailVerification: true,
    },
  });

  return {
    ...plugin,
    hooks: {
      before: [
        {
          handler: createAuthMiddleware(
            orderedChange(client, settings, hooks, lineItems)
          ),
          matcher: (ctx: { readonly path?: string }) =>
            ctx.path === "/subscription/upgrade",
        },
      ],
    },
  };
};

const CustomerTypeSchema = Schema.Struct({
  customerType: Schema.optionalKey(Schema.Unknown),
});

const decodeCustomerType = Schema.decodeUnknownOption(CustomerTypeSchema);

// The customer types a request names, in its body and in its query.
const customerTypesOf = (ctx: GenericEndpointContext): readonly unknown[] =>
  [ctx.body, ctx.query].flatMap((part) =>
    Option.match(decodeCustomerType(part), {
      onNone: () => [],
      onSome: ({ customerType }) =>
        customerType === undefined ? [] : [customerType],
    })
  );

// Stripe sends the browser back to this one after checkout.
const returnRoute = "/subscription/success";

/**
 * Subscriptions belong to workspaces: Better Auth's subscription routes
 * would otherwise let a user subscribe for themselves, which buys nothing.
 * Every customer type the request names must be `organization`: Stripe's
 * plugin reads the body's before the query's.
 */
export const refusePersonalSubscriptions = (ctx: GenericEndpointContext) => {
  if (!ctx.path.startsWith("/subscription/") || ctx.path === returnRoute) {
    return;
  }

  const named = customerTypesOf(ctx);

  if (
    named.length === 0 ||
    !named.every((customerType) => customerType === "organization")
  ) {
    throw APIError.from("BAD_REQUEST", {
      code: "WORKSPACE_SUBSCRIPTIONS_ONLY",
      message:
        "Subscriptions belong to workspaces: send customerType organization and the workspace as referenceId",
    });
  }
};

const MemberLimitError = {
  code: "MEMBER_LIMIT_REACHED",
  message: "The workspace's plan allows no more members",
} as const;

/**
 * Refuses a new member, or an invitation, the workspace's plan has no room
 * for. Pending invitations count when inviting, besides one to the same
 * address, which the new invitation replaces.
 */
export const checkMemberRoom = async (
  hooks: BillingHooks,
  workspaceId: string,
  invitingEmail: Option.Option<string>
): Promise<void> => {
  const id = decodeWorkspaceId(workspaceId);

  // An id in another form than Peal issues names no workspace here, and
  // could name one to Postgres, which reads a UUID in any case: refused,
  // never let past the plan.
  if (Option.isNone(id)) {
    throw APIError.from("BAD_REQUEST", {
      code: "INVALID_ID",
      message: "The workspace's id is a lower-case UUID, as Peal issues it",
    });
  }

  const allowance = await hooks.memberAllowance(id.value);

  if (Option.isNone(allowance)) {
    return;
  }

  const { adapter } = getCurrentAuthEndpointContext().context;

  const members = await adapter.count({
    model: "member",
    where: [{ field: "organizationId", value: id.value }],
  });

  const pending = await Option.match(invitingEmail, {
    onNone: async () => await Promise.resolve(0),
    onSome: async (email) =>
      await adapter.count({
        model: "invitation",
        where: [
          { field: "organizationId", value: id.value },
          { field: "status", value: "pending" },
          { field: "expiresAt", operator: "gt", value: new Date() },
          { field: "email", operator: "ne", value: email.toLowerCase() },
        ],
      }),
  });

  const room = roomForOneMore("members", allowance, members + pending);

  if (Result.isFailure(room)) {
    const { allowed, limit, needed, used } = room.failure;

    // With what a client needs to offer the way out, as PlanLimitReached
    // carries it.
    throw new APIError("PAYMENT_REQUIRED", {
      ...MemberLimitError,
      ...(await hooks.memberUpgrade(id.value, needed)),
      allowed,
      limit,
      used,
    });
  }
};

const PayerError = {
  code: "PAYER_MUST_STAY",
  message:
    "This owner pays for the workspace: they hand it to another owner on its billing page before they leave it, are removed or stop being an owner",
} as const;

const LeaveBodySchema = Schema.Struct({ organizationId: Schema.String });

const decodeLeaveBody = Schema.decodeUnknownOption(LeaveBodySchema);

const ownerRole = "owner";

/**
 * Refuses to let a workspace's payer stop being one of its owners, as its
 * last owner is: they leave, are removed or lose the owner role only once
 * they handed the workspace to another payer. On a server that bills.
 */
export const keepPayer = async (
  hooks: BillingHooks,
  change: {
    readonly organizationId: string;
    readonly role: Option.Option<readonly string[]>;
    readonly userId: string;
  }
): Promise<void> => {
  // A role that keeps the owner's changes nothing.
  if (Option.exists(change.role, (roles) => roles.includes(ownerRole))) {
    return;
  }

  const workspaceId = decodeWorkspaceId(change.organizationId);

  if (Option.isNone(workspaceId)) {
    return;
  }

  const payer = await hooks.payerOf(workspaceId.value);

  if (payer !== null && payer === change.userId) {
    throw APIError.from("BAD_REQUEST", PayerError);
  }
};

/**
 * The same for Better Auth's `/organization/leave`, which calls no hook of
 * its own: the session's user leaving the workspace the body names.
 */
export const keepPayerLeaving = async (
  ctx: GenericEndpointContext,
  hooks: BillingHooks
): Promise<void> => {
  if (ctx.path !== "/organization/leave") {
    return;
  }

  const body = decodeLeaveBody(ctx.body);
  const session = await getSessionFromCtx(ctx);

  if (Option.isNone(body) || session === null) {
    return;
  }

  await keepPayer(hooks, {
    organizationId: body.value.organizationId,
    role: Option.none(),
    userId: session.user.id,
  });
};

/**
 * After Better Auth's `/organization/leave`, which calls no hook of its
 * own: the workspace's billing account follows its owners.
 */
export const followOwnersAfterLeaving = async (
  ctx: GenericEndpointContext,
  hooks: BillingHooks
): Promise<void> => {
  if (ctx.path !== "/organization/leave") {
    return;
  }

  const body = decodeLeaveBody(ctx.body);

  if (Option.isSome(body)) {
    await hooks.ownersChanged(body.value.organizationId);
  }
};
