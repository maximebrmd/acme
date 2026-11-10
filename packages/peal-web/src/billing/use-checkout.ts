"use client";

import { useAtomSet } from "@effect/atom-react";
import { Cause, Exit, Option, Schema } from "effect";
import { useLocale } from "next-intl";
import { PlanTooSmall } from "peal-contract";
import type { BillingInterval, Excess, PaidPlan } from "peal-contract";

import { billingClient } from "#auth/billing-client.ts";
import { placeOrder } from "#billing/api.ts";
import { billingErrorOf } from "#billing/errors.ts";
import type { BillingError } from "#components/billing/billing-view.tsx";

// Where Stripe sends the browser: its checkout or its customer portal.
const decodeRedirect = Schema.decodeUnknownOption(
  Schema.Struct({ url: Schema.String })
);

const isTooSmall = Schema.is(PlanTooSmall);

/** What a Better Auth client call answers. */
export interface AuthResult {
  readonly data: unknown;
  readonly error: { readonly status: number } | null;
}

/**
 * Leaves for the page Stripe answered with, its checkout or its portal, or
 * says why not.
 */
export const leaveFor = async (
  request: () => Promise<AuthResult>
): Promise<Option.Option<BillingError>> => {
  const result = await request();

  if (result.error !== null) {
    return Option.some(
      result.error.status === 401 || result.error.status === 403
        ? "forbidden"
        : "generic"
    );
  }

  return Option.match(decodeRedirect(result.data), {
    onNone: () => Option.some<BillingError>("generic"),
    onSome: ({ url }) => {
      globalThis.location.assign(url);

      return Option.none();
    },
  });
};

/** What a member orders, and where Stripe sends them back. */
export interface CheckoutRequest {
  readonly interval: BillingInterval;
  readonly plan: PaidPlan;
  /** The page to come back to, done or not: a path of this site. */
  readonly returnTo: string;
  /** The same page, as it says the checkout is done. */
  readonly returnDone: string;
  readonly trial: boolean;
}

/** Why an order did not reach checkout. */
export interface CheckoutFailure {
  readonly error: BillingError;
  /** What the workspace holds beyond the plan ordered, when that is why. */
  readonly tooSmall: readonly Excess[] | null;
}

/**
 * Orders a plan for the workspace, then opens Stripe's checkout: the order
 * first, which records the request to start at once, then the checkout,
 * which needs it. The browser leaves for Stripe, and comes back to the
 * page given. Answers why not, when it does not leave.
 */
export const useCheckout = (workspaceId: string) => {
  const locale = useLocale();
  const order = useAtomSet(placeOrder, { mode: "promiseExit" });

  return async ({
    interval,
    plan,
    returnDone,
    returnTo,
    trial,
  }: CheckoutRequest): Promise<Option.Option<CheckoutFailure>> => {
    const yearly = !trial && interval === "year";

    const placed = await order({
      params: { workspaceId },
      payload: {
        interval: yearly ? "year" : "month",
        plan,
        startNow: true,
        trial,
      },
    });

    if (!Exit.isSuccess(placed)) {
      const refused = Cause.findErrorOption(placed.cause).pipe(
        Option.filter(isTooSmall)
      );

      return billingErrorOf(placed).pipe(
        Option.map((error) => ({
          error,
          tooSmall: refused.pipe(
            Option.map(({ over }) => over),
            Option.getOrNull
          ),
        }))
      );
    }

    const left = await leaveFor(
      async () =>
        await billingClient.subscription.upgrade({
          annual: yearly,
          cancelUrl: returnTo,
          customerType: "organization",
          disableRedirect: true,
          locale,
          metadata: { orderId: placed.value.id },
          plan,
          referenceId: workspaceId,
          returnUrl: returnTo,
          successUrl: returnDone,
        })
    );

    return left.pipe(Option.map((error) => ({ error, tooSmall: null })));
  };
};
