import { getCurrentAuthEndpointContext } from "@better-auth/core/context";
import { stripe } from "@better-auth/stripe";
import type { StripePlan } from "@better-auth/stripe";
import type { GenericEndpointContext } from "better-auth";
import { APIError } from "better-auth/api";
import { captcha } from "better-auth/plugins";
import { DateTime, Option, Redacted, Result, Schema } from "effect";
import { Stripe } from "stripe";

import type { SubscriptionEvent } from "#billing/application/record-subscription.ts";
import { roomForOneMore } from "#shared/domain/allowance.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";
import type { StripeSettings } from "#shared/infrastructure/stripe-settings.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

import type { CaptchaSettings } from "./settings.ts";

/** What the billing plugin calls back into the rest of the server for. */
export interface BillingHooks {
  /** The workspace's member allowance, from its plan. */
  readonly memberAllowance: (workspaceId: WorkspaceId) => Promise<Allowance>;
  /**
   * Records what a webhook event says a subscription now is. A failure
   * makes the webhook answer an error, so Stripe sends the event again.
   */
  readonly subscriptionChanged: (event: SubscriptionEvent) => Promise<void>;
  /**
   * Whether Stripe may still bill the workspace: a subscription that is
   * not cancelled or incomplete, whether it buys a plan or not.
   */
  readonly subscribed: (workspaceId: WorkspaceId) => Promise<boolean>;
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

// What a subscription event carries that billing reads. Stripe sends more,
// and more over time: only these fields are decoded.
const StripeSubscriptionSchema = Schema.Struct({
  cancel_at: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  cancel_at_period_end: Schema.Boolean,
  // An id: events never expand it.
  customer: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
  items: Schema.Struct({
    data: Schema.Array(
      Schema.Struct({
        current_period_end: Schema.optionalKey(Schema.Number),
        price: Schema.Struct({ id: Schema.String }),
      })
    ),
  }),
  status: Schema.String,
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

// The plan a subscription's prices buy, if one of them is a plan's.
const planOf = (
  prices: StripeSettings["prices"],
  priceIds: readonly string[]
): Option.Option<PaidPlan> =>
  Option.fromUndefinedOr(
    PaidPlanSchema.literals.find((plan) => priceIds.includes(prices[plan]))
  );

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
    subscription.items.data.map(({ price }) => price.id)
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

  return Option.some({
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end ||
      (subscription.cancel_at !== undefined && subscription.cancel_at !== null),
    currentPeriodEnd:
      periodEnds.length === 0
        ? Option.none()
        : Option.some(fromStripeTime(Math.max(...periodEnds))),
    eventId: event.id,
    occurredAt: fromStripeTime(event.created),
    plan: plan.value,
    status: subscription.status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
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
  const { adapter } = getCurrentAuthEndpointContext().context;

  const found: unknown = await adapter.findOne({
    model: "member",
    select: ["role"],
    where: [
      { field: "userId", value: user.id },
      { field: "organizationId", value: referenceId },
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

const protocolOf = (url: URL): "http" | "https" =>
  url.protocol === "http:" ? "http" : "https";

// The port an address names, or its protocol's.
const portOf = (url: URL): number => {
  if (url.port !== "") {
    return Number(url.port);
  }

  return url.protocol === "http:" ? 80 : 443;
};

// Checkout with Stripe Tax: the customer's address and VAT number decide
// the tax, and both are kept on the customer for the next invoices.
const automaticTax = {
  automatic_tax: { enabled: true },
  billing_address_collection: "required",
  customer_update: { address: "auto", name: "auto" },
  tax_id_collection: { enabled: true },
} satisfies Stripe.Checkout.SessionCreateParams;

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
  const client = new Stripe(Redacted.value(settings.secretKey), {
    ...Option.match(settings.apiUrl, {
      onNone: () => ({}),
      onSome: (url) => ({
        host: url.hostname,
        port: portOf(url),
        protocol: protocolOf(url),
      }),
    }),
  });

  const plans: StripePlan[] = PaidPlanSchema.literals.map((name) => ({
    name,
    priceId: settings.prices[name],
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
      getCheckoutSessionParams: () => ({
        params: settings.automaticTax ? automaticTax : {},
      }),
      plans,
      requireEmailVerification: true,
    },
  });
};

const WorkspaceBillingSchema = Schema.Struct({
  customerType: Schema.Literal("organization"),
});

const isWorkspaceBilling = Schema.is(WorkspaceBillingSchema);

// Stripe sends the browser back to this one after checkout.
const returnRoute = "/subscription/success";

/**
 * Subscriptions belong to workspaces: Better Auth's subscription routes
 * would otherwise let a user subscribe for themselves, which buys nothing.
 */
export const refusePersonalSubscriptions = (ctx: GenericEndpointContext) => {
  if (!ctx.path.startsWith("/subscription/") || ctx.path === returnRoute) {
    return;
  }

  if (!isWorkspaceBilling(ctx.body) && !isWorkspaceBilling(ctx.query)) {
    throw APIError.from("BAD_REQUEST", {
      code: "WORKSPACE_SUBSCRIPTIONS_ONLY",
      message:
        "Subscriptions belong to workspaces: send customerType organization and the workspace as referenceId",
    });
  }
};

/**
 * Refuses to delete a workspace a subscription still pays for, before
 * anything of it is deleted: Stripe's plugin refuses it too, but only after
 * the other hooks ran. Cancel the subscription first.
 */
export const refuseDeletingSubscribed = async (
  hooks: BillingHooks,
  workspaceId: string
): Promise<void> => {
  const id = decodeWorkspaceId(workspaceId);

  if (Option.isSome(id) && (await hooks.subscribed(id.value))) {
    throw APIError.from("BAD_REQUEST", {
      code: "ORGANIZATION_HAS_ACTIVE_SUBSCRIPTION",
      message: "Cancel the workspace's subscription before deleting it",
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
