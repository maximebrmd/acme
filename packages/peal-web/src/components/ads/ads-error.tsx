"use client";

import { Schema } from "effect";
import { useTranslations } from "next-intl";
import { maxBoostRunDays, maxBoostStartAheadDays } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";

import { AdsErrorKeySchema } from "#ads/errors.ts";
import type { AdsError, AdsErrorKey } from "#ads/errors.ts";
import type { MinorUnitDigits } from "#ads/money.ts";
import { useMoney } from "#ads/use-money.ts";

const isPlainKey = Schema.is(AdsErrorKeySchema);

// A failure the catalogue explains by its key alone.
const isPlain = (error: AdsError): error is { readonly key: AdsErrorKey } =>
  isPlainKey(error.key);

/**
 * Writes why an ads action failed, in the reader's language: one line, or
 * one per rule a boost breaks. `digits` are the ad account's, for the
 * refusals that name amounts.
 */
export const useAdsErrorLines = () => {
  const t = useTranslations("Ads.errors");
  const money = useMoney();

  return (error: AdsError, digits: MinorUnitDigits = 2): readonly string[] => {
    if (isPlain(error)) {
      return [t(error.key)];
    }

    switch (error.key) {
      case "accountBusy": {
        return [t("accountBusy", { boosts: error.boosts })];
      }

      case "accountUnusable": {
        return [t("accountUnusable", { reason: error.reason })];
      }

      case "boostInvalid": {
        return error.violations.map((violation) =>
          t("boostInvalid", {
            maxAhead: maxBoostStartAheadDays,
            maxDays: maxBoostRunDays,
            violation,
          })
        );
      }

      case "ceilingExceeded": {
        return [
          t("ceilingExceeded", {
            ceiling: money(error.ceiling, error.currency, digits),
            committed: money(error.committed, error.currency, digits),
            requested: money(error.requested, error.currency, digits),
          }),
        ];
      }

      case "currencyMismatch": {
        return [t("currencyMismatch", { currency: error.accountCurrency })];
      }

      case "networkUnavailable": {
        return [
          t("networkUnavailable", {
            seconds: error.retryAfterSeconds ?? 0,
            wait: error.retryAfterSeconds === null ? "unknown" : "known",
          }),
        ];
      }

      case "notPromotable": {
        return [t("notPromotable", { reason: error.reason })];
      }

      case "signInFailed": {
        return [t("signInFailed", { reason: error.reason })];
      }

      case "spendCapExceeded": {
        return [
          t("spendCapExceeded", {
            requested: money(error.requested, error.currency, digits),
            room: money(error.room, error.currency, digits),
          }),
        ];
      }

      case "stateConflict": {
        return [t("stateConflict", { state: error.state })];
      }

      default: {
        return [t("unknown")];
      }
    }
  };
};

/** Why an ads action failed, in one text, as a toast shows it. */
export const useAdsErrorText = () => {
  const lines = useAdsErrorLines();

  return (error: AdsError, digits: MinorUnitDigits = 2): string =>
    lines(error, digits).join(" ");
};

/** Why the last action failed, announced when it appears. */
export const AdsErrorAlert = ({
  digits = 2,
  error,
}: {
  readonly digits?: MinorUnitDigits;
  readonly error: AdsError | null;
}) => {
  const lines = useAdsErrorLines();

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>
        {lines(error, digits).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
};
