import { getCurrentAuthEndpointContext } from "@better-auth/core/context";
import { stripe } from "@better-auth/stripe";
import type { StripePlan } from "@better-auth/stripe";
import type { GenericEndpointContext } from "better-auth";
import { APIError } from "better-auth/api";
import { captcha } from "better-auth/plugins";
import { DateTime, Option, Redacted, Result, Schema } from "effect";
import type { Stripe } from "stripe";

import type { SubscriptionEvent } from "#billing/application/record-subscription.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import type { StripeSettings } from "#shared/infrastructure/stripe-settings.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

import type { CaptchaSettings } from "./settings.ts";

/** A checkout about to start, for the order it needs. */
export interface CheckoutStart {
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
      readonly code: "ORDER_REQUIRED" | "TRIAL_UNAVAILABLE";
    }
  | { readonly _tag: "start"; readonly trialDays: number | null };

/** What the billing plugin calls back into the rest of the server for. */
export interface BillingHooks {
  /** Whether a checkout may start, from the order the member placed. */
  readonly checkout: (start: CheckoutStart) => Promise<CheckoutAnswer>;
  /**
   * Whether the workspace is on the free plan of a server that bills: an
   * account owns one such workspace at most.
   */
  readonly freeWorkspace: (workspaceId: WorkspaceId) => Promise<boolean>;
  /** The workspace's member allowance, from its plan. */
  readonly memberAllowance: (workspaceId: WorkspaceId) => Promise<Allowance>;
  /**
   * Records what a webhook event says a subscription now is. A failure
   * makes the webhook answer an error, so Stripe sends the event again.
   */
  readonly subscriptionChanged: (event: SubscriptionEvent) => Promise<void>;
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

const planOf = (
  prices: StripeSettings["prices"],
  lookupKeys: readonly (string | null | undefined)[]
): Option.Option<PricedPlan> =>
  Option.fromUndefinedOr(
    PaidPlanSchema.literals
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
 * another kind of object, or a subscription of no workspace or plan, as one
 * made by hand in Stripe's dashboard, is logged and left alone.
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

  if (Option.isNone(plan) || Option.isNone(workspaceId)) {
    log(
      `Stripe event ${event.id} is about a subscription of no workspace or no plan of this server`
    );

    return Option.none();
  }

  const periodEnds = subscription.items.data.flatMap(
    ({ current_period_end: end }) => (end === undefined ? [] : [end])
  );

  const periodStarts = subscription.items.data.flatMap(
    ({ current_period_start: start }) => (start === undefined ? [] : [start])
  );

  return Option.some({
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end ||
      (subscription.cancel_at !== undefined && subscription.cancel_at !== null),
    currentPeriodEnd:
      periodEnds.length === 0
        ? Option.none()
        : Option.some(fromStripeTime(Math.max(...periodEnds))),
    currentPeriodStart:
      periodStarts.length === 0
        ? Option.none()
        : Option.some(fromStripeTime(Math.min(...periodStarts))),
    eventId: event.id,
    interval: plan.value.interval,
    occurredAt: fromStripeTime(event.created),
    plan: plan.value.plan,
    startedAt: optionalTime(subscription.start_date),
    startedBy: Option.fromNullishOr(subscription.metadata?.["userId"]).pipe(
      Option.flatMap(decodeUserId)
    ),
    status: subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    trialEnd: optionalTime(subscription.trial_end),
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

// Checkout with Stripe Tax: the customer's address and VAT number decide
// the tax, and both are kept on the customer for the next invoices.
const automaticTax = {
  automatic_tax: { enabled: true },
  billing_address_collection: "required",
  customer_update: { address: "auto", name: "auto" },
  tax_id_collection: { enabled: true },
} satisfies Stripe.Checkout.SessionCreateParams;

// Nothing to add to the checkout.
const noParams = {} satisfies Stripe.Checkout.SessionCreateParams;

// A trial without a payment method: Stripe asks for none, and cancels the
// subscription when the trial ends without one, which puts the workspace
// back on the free plan. A paid plan then starts with an order of its own.
const trialParams = (days: number) =>
  ({
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
 * no payment method for the trial, and Stripe Tax's when it is on.
 */
const checkoutParams =
  (settings: StripeSettings, hooks: BillingHooks) =>
  async (
    {
      plan,
      subscription,
      user,
    }: {
      readonly plan: { readonly name: string };
      readonly subscription: { readonly referenceId: string };
      readonly user: { readonly id: string };
    },
    _request: GenericEndpointContext["request"],
    ctx: GenericEndpointContext | undefined
  ) => {
    const body = decodeUpgradeBody(ctx?.body).pipe(Option.getOrUndefined);
    const workspaceId = decodeWorkspaceId(subscription.referenceId);
    const userId = decodeUserId(user.id);
    const paidPlan = Schema.decodeUnknownOption(PaidPlanSchema)(plan.name);
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
      interval: body?.annual === true ? "year" : "month",
      orderId,
      plan: paidPlan.value,
      userId: userId.value,
      workspaceId: workspaceId.value,
    });

    if (answer._tag === "refused") {
      throw APIError.from("BAD_REQUEST", OrderErrors[answer.code]);
    }

    const tax = settings.automaticTax ? automaticTax : noParams;

    const trial =
      answer.trialDays === null ? noParams : trialParams(answer.trialDays);

    return { params: { ...tax, ...trial } };
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

  const plans: StripePlan[] = PaidPlanSchema.literals.map((name) => ({
    annualDiscountLookupKey: settings.prices[name].year,
    lookupKey: settings.prices[name].month,
    name,
  }));

  return stripe({
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
      getCheckoutSessionParams: checkoutParams(settings, hooks),
      plans,
      requireEmailVerification: true,
    },
  });
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

  if (Option.isNone(id)) {
    return;
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
    throw APIError.from("PAYMENT_REQUIRED", MemberLimitError);
  }
};

const FreeWorkspaceError = {
  code: "FREE_WORKSPACE_LIMIT_REACHED",
  message:
    "The account already owns a workspace on the free plan: subscribe it, or use that one",
} as const;

const OwnedRowSchema = Schema.Struct({ organizationId: Schema.String });

const decodeOwnedRow = Schema.decodeUnknownOption(OwnedRowSchema);

/**
 * Refuses a new workspace to an account that already owns one on the free
 * plan of a server that bills: one free workspace per account, as each
 * gets the free plan's allowances. A workspace that falls back to the free
 * plan stays; paid and trialing ones do not count.
 */
export const checkFreeWorkspace = async (
  hooks: BillingHooks,
  userId: string
): Promise<void> => {
  const { adapter } = getCurrentAuthEndpointContext().context;

  const owned: unknown[] = await adapter.findMany({
    model: "member",
    select: ["organizationId"],
    where: [
      { field: "userId", value: userId },
      { field: "role", value: "owner" },
    ],
  });

  const workspaces = owned.flatMap((row) =>
    Option.toArray(
      decodeOwnedRow(row).pipe(
        Option.flatMap(({ organizationId }) =>
          decodeWorkspaceId(organizationId)
        )
      )
    )
  );

  const free = await Promise.all(
    workspaces.map(
      async (workspaceId) => await hooks.freeWorkspace(workspaceId)
    )
  );

  if (free.includes(true)) {
    throw APIError.from("PAYMENT_REQUIRED", FreeWorkspaceError);
  }
};
