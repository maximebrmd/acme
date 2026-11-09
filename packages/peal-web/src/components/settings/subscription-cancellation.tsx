"use client";

import { DateTime, Option } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId } from "react";
import type { ReactNode } from "react";

import type { SubscriptionToCancel } from "#settings/errors.ts";

/**
 * What deleting does to a subscription Stripe may still bill, before the
 * person agrees: it ends now, nothing more is charged, the period paid for
 * is not refunded, and the invoices are best downloaded first. The
 * deletion waits for the box, never ticked beforehand.
 */
export const SubscriptionCancellation = ({
  agreed,
  billingLink,
  onAgreedChange,
  subscription,
}: {
  readonly agreed: boolean;
  /** The billing page of the workspace, where its invoices are. */
  readonly billingLink: ReactNode;
  readonly onAgreedChange: (agreed: boolean) => void;
  readonly subscription: SubscriptionToCancel;
}) => {
  const t = useTranslations("Settings.cancellation");
  const billing = useTranslations("Billing");
  const format = useFormatter();
  const id = useId();

  const plan = Option.match(subscription.plan, {
    onNone: () => "none",
    onSome: (name) => billing("plan", { plan: name }),
  });

  return (
    <Alert variant="destructive">
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription>
        <span className="flex flex-col gap-2">
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
          <span>{t("invoices")}</span>
          {billingLink}
          <span className="flex items-start gap-2">
            <Checkbox
              id={id}
              checked={agreed}
              onCheckedChange={onAgreedChange}
            />
            <Label htmlFor={id}>{t("agree")}</Label>
          </span>
        </span>
      </AlertDescription>
    </Alert>
  );
};
