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
import { LegacyPaidPlanSchema } from "#shared/domain/plan.ts";
import type { LegacyPaidPlan, PaidPlan, Plan } from "#shared/domain/plan.ts";
import type { CaptchaSettings } from "#shared/infrastructure/captcha-settings.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import type { StripeSettings } from "#shared/infrastructure/stripe-settings.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

/** A checkout about to start, for the order it needs. */
export interface CheckoutStart {
  /** The member's email address, as their session has it. */
  readonly email: string;
  readonly interval: "month" | "year";
  readonly orderId: string;
  readonly plan: LegacyPaidPlan;
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
      readonly code: "ORDER_REQUIRED" | "TRIAL_UNAVAILABLE";
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

// Better Auth's plans are the legacy ones: per-account pricing is not
// offered at checkout yet.
const decodeLegacyPlan = Schema.decodeUnknownOption(LegacyPaidPlanSchema);

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
  readonly plan: LegacyPaidPlan;
}

const planOf = (
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
    settings.prices,
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

// Nothing to add to the checkout.
const noParams = {} satisfies Stripe.Checkout.SessionCreateParams;

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
 * page (`metadata.orderId`): refused without one, with the trial's days and
 * no payment method for the trial, and Stripe Tax's.
 */
export const checkoutParams =
  (hooks: BillingHooks) =>
  async (
    {
      plan,
      subscription,
      user,
    }: {
      readonly plan: { readonly name: string };
      readonly subscription: { readonly referenceId: string };
      readonly user: { readonly email: string; readonly id: string };
    },
    _request: GenericEndpointContext["request"],
    ctx: { readonly body?: unknown } | undefined
  ) => {
    const body = decodeUpgradeBody(ctx?.body).pipe(Option.getOrUndefined);
    const workspaceId = decodeWorkspaceId(subscription.referenceId);
    const userId = decodeUserId(user.id);
    const paidPlan = decodeLegacyPlan(plan.name);
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

const PriceListSchema = Schema.Struct({
  data: Schema.Array(Schema.Struct({ id: Schema.NonEmptyString })),
});

const decodePriceList = Schema.decodeUnknownOption(PriceListSchema);

const SessionUrlSchema = Schema.Struct({ url: Schema.NonEmptyString });

const decodeSessionUrl = Schema.decodeUnknownOption(SessionUrlSchema);

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
 * Opens a checkout for a paid plan ordered during the workspace's trial:
 * a new subscription, beside the trial, which runs until the paid one is
 * recorded (`RecordSubscription` then ends it). Better Auth would rather
 * change the trialing subscription in place, which buys nothing and takes
 * no payment.
 */
const checkoutDuringTrial = async (
  client: Stripe,
  settings: StripeSettings,
  order: {
    readonly cancelUrl: string;
    readonly interval: "month" | "year";
    readonly locale: Option.Option<"en" | "fr">;
    readonly orderId: string;
    readonly plan: LegacyPaidPlan;
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

  if (Option.isNone(customer)) {
    throw APIError.from("BAD_REQUEST", ChangeErrors.UNAVAILABLE);
  }

  const lookupKey = settings.prices[order.plan][order.interval];

  const session = await client.prices
    .list({ active: true, limit: 1, lookup_keys: [lookupKey] })
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

      return decodeSessionUrl(
        await client.checkout.sessions.create(
          {
            ...automaticTax,
            cancel_url: order.cancelUrl,
            client_reference_id: order.workspaceId,
            customer: customer.value.stripeCustomerId,
            line_items: [{ price: price.value.id, quantity: 1 }],
            metadata,
            mode: "subscription",
            subscription_data: { metadata },
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
  const plan = decodeLegacyPlan(request.value.plan);

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

  if (live.value !== "trialing") {
    return Option.none();
  }

  const url = await checkoutDuringTrial(client, settings, {
    cancelUrl: trustedUrl(ctx, request.value.cancelUrl),
    interval,
    locale: decodeLocale(request.value.locale),
    orderId,
    plan: plan.value,
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
  (client: Stripe, settings: StripeSettings, hooks: BillingHooks) =>
  async (ctx: GenericEndpointContext) => {
    const checkout = await checkoutInstead(client, settings, hooks, ctx);

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

  const plans: StripePlan[] = LegacyPaidPlanSchema.literals.map((name) => ({
    annualDiscountLookupKey: settings.prices[name].year,
    lookupKey: settings.prices[name].month,
    name,
  }));

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
      getCheckoutSessionParams: checkoutParams(hooks),
      plans,
      requireEmailVerification: true,
    },
  });

  return {
    ...plugin,
    hooks: {
      before: [
        {
          handler: createAuthMiddleware(orderedChange(client, settings, hooks)),
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
