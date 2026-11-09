"use client";

import { DateTime, Option } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId } from "react";
import type { ReactNode } from "react";

import type { SubscriptionToCancel } from "#settings/errors.ts";

const Cancelled = ({
  billingLink,
  subscription,
}: {
  readonly billingLink: ReactNode;
  readonly subscription: SubscriptionToCancel;
}) => {
  const t = useTranslations("Settings.cancellation");
  const billing = useTranslations("Billing");
  const format = useFormatter();

  const plan = Option.match(subscription.plan, {
    onNone: () => "none",
    onSome: (name) => billing("plan", { plan: name }),
  });

  return (
    <li className="flex flex-col gap-1">
      <span>{t("ends", { plan })}</span>
      <span>
        {Option.match(subscription.paidUntil, {
          onNone: () => t("notRefunded"),
          onSome: (until) =>
            t("notRefundedUntil", {
              date: format.dateTime(DateTime.toDate(until), {
                dateStyle: "long",
              }),
            }),
        })}
      </span>
      {billingLink}
    </li>
  );
};

/**
 * What deleting does to each subscription Stripe may still bill, before
 * the person agrees: it ends now, nothing more is charged, the period paid
 * for is not refunded but where the law gives a refund, as to a consumer
 * who withdraws within 14 days, and the invoices are best downloaded
 * first. Every subscription is listed before the one box that agrees to
 * cancel them all, never ticked beforehand.
 */
export const SubscriptionCancellation = ({
  agreed,
  billingLink,
  onAgreedChange,
  subscriptions,
}: {
  readonly agreed: boolean;
  /** The billing page of a workspace, where its invoices are. */
  readonly billingLink: (workspaceId: string) => ReactNode;
  readonly onAgreedChange: (agreed: boolean) => void;
  readonly subscriptions: readonly SubscriptionToCancel[];
}) => {
  const t = useTranslations("Settings.cancellation");
  const id = useId();

  return (
    <Alert variant="destructive">
      <AlertTitle>{t("title", { count: subscriptions.length })}</AlertTitle>
      <AlertDescription>
        <span className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {subscriptions.map((subscription, index) => (
              <Cancelled
                // The same workspace may list two subscriptions, neither
                // with an id of its own.
                key={`${subscription.workspaceId}-${String(index)}`}
                billingLink={billingLink(subscription.workspaceId)}
                subscription={subscription}
              />
            ))}
          </ul>
          <span>{t("withdrawal")}</span>
          <span>{t("invoices")}</span>
          <span className="flex items-start gap-2">
            <Checkbox
              id={id}
              checked={agreed}
              onCheckedChange={onAgreedChange}
            />
            <Label htmlFor={id}>
              {t("agree", { count: subscriptions.length })}
            </Label>
          </span>
        </span>
      </AlertDescription>
    </Alert>
  );
};
