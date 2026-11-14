"use client";

import { useAtomSet } from "@effect/atom-react";
import { Exit, Option, Schema } from "effect";
import { useLocale } from "next-intl";
import { orderConsentVersion } from "peal-contract";

import { billingClient } from "#auth/billing-client.ts";
import { placeOrder } from "#billing/api.ts";
import { billingErrorOf } from "#billing/errors.ts";
import type { BillingError } from "#components/billing/billing-view.tsx";

// Where Stripe sends the browser: its checkout or its customer portal.
const decodeRedirect = Schema.decodeUnknownOption(
  Schema.Struct({ url: Schema.String })
);

/** What a Better Auth client call answers. */
export interface AuthResult {
  readonly data: unknown;
  readonly error: { readonly status: number } | null;
}

// Why Stripe was not reached: the member may not, the workspace never had
// a Stripe customer, so has no invoice, or anything else.
const refusalOf = (status: number): BillingError => {
  if (status === 401 || status === 403) {
    return "forbidden";
  }

  return status === 404 ? "noInvoices" : "generic";
};

/**
 * Leaves for the page Stripe answered with, its checkout or its portal, or
 * says why not.
 */
export const leaveFor = async (
  request: () => Promise<AuthResult>
): Promise<Option.Option<BillingError>> => {
  const result = await request();

  if (result.error !== null) {
    return Option.some(refusalOf(result.error.status));
  }

  return Option.match(decodeRedirect(result.data), {
    onNone: () => Option.some<BillingError>("generic"),
    onSome: ({ url }) => {
      globalThis.location.assign(url);

      return Option.none();
    },
  });
};

/** Where Stripe sends the member back. */
export interface CheckoutRequest {
  /** The page to come back to, done or not: a path of this site. */
  readonly returnTo: string;
  /** The same page, as it says the checkout is done. */
  readonly returnDone: string;
}

/** Why an order did not reach checkout. */
export interface CheckoutFailure {
  readonly error: BillingError;
}

/**
 * Orders per-account pricing for the workspace, the one plan sold,
 * monthly, then opens Stripe's checkout, which asks for a card: the order
 * first, which records the request to start at once in the words of the
 * box shown (`orderConsentVersion`), then the checkout, which needs it.
 * The browser leaves for Stripe, and comes back to the page given.
 * Answers why not, when it does not leave.
 */
export const useCheckout = (workspaceId: string) => {
  const locale = useLocale();
  const order = useAtomSet(placeOrder, { mode: "promiseExit" });

  return async ({
    returnDone,
    returnTo,
  }: CheckoutRequest): Promise<Option.Option<CheckoutFailure>> => {
    const placed = await order({
      params: { workspaceId },
      payload: {
        consentVersion: orderConsentVersion,
        interval: "month",
        plan: "payAsYouGo",
        startNow: true,
        trial: false,
      },
    });

    if (!Exit.isSuccess(placed)) {
      return billingErrorOf(placed).pipe(Option.map((error) => ({ error })));
    }

    const left = await leaveFor(
      async () =>
        await billingClient.subscription.upgrade({
          annual: false,
          cancelUrl: returnTo,
          customerType: "organization",
          disableRedirect: true,
          locale,
          metadata: { orderId: placed.value.id },
          plan: "payAsYouGo",
          referenceId: workspaceId,
          returnUrl: returnTo,
          successUrl: returnDone,
        })
    );

    return left.pipe(Option.map((error) => ({ error })));
  };
};
