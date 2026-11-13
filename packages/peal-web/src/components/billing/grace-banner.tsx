"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";

/**
 * What every member of a workspace the billing grace keeps publishing
 * reads, above its pages: the exact day and time it ends, in UTC.
 */
export const GraceBanner = ({
  graceUntil,
}: {
  readonly graceUntil: DateTime.Utc;
}) => {
  const t = useTranslations("OverPlan");
  const format = useFormatter();

  return (
    <Alert aria-live="polite">
      <AlertDescription>
        {t("grace", {
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
