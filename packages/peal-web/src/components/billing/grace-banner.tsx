"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import { freeAccountsOf } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";

/**
 * What every member of a workspace the billing grace keeps publishing
 * reads, above its pages: the exact day and time it ends, in UTC, and the
 * free tier's accounts, the rate card's.
 */
export const GraceBanner = ({
  freeAccounts = freeAccountsOf(),
  graceUntil,
}: {
  readonly freeAccounts?: number;
  readonly graceUntil: DateTime.Utc;
}) => {
  const t = useTranslations("OverPlan");
  const format = useFormatter();

  return (
    <Alert aria-live="polite">
      <AlertDescription>
        {t("grace", {
          free: freeAccounts,
          until: format.dateTime(DateTime.toDate(graceUntil), {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "UTC",
          }),
        })}
      </AlertDescription>
    </Alert>
  );
};
