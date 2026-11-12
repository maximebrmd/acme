"use client";

import { useTranslations } from "next-intl";

import type { RuleError } from "#recycling/rule-error.ts";

/** What a refused change to a rule says, in the reader's language. */
export const useRuleErrorText = () => {
  const t = useTranslations("Recycling");

  return (error: RuleError): string => {
    switch (error.key) {
      case "notRecyclable": {
        return t("errors.notRecyclable", { reason: error.reason });
      }

      case "tooMany": {
        return t("errors.tooMany", { allowed: error.allowed });
      }

      case "variantsInvalid": {
        return t("errors.variantsInvalid", { count: error.count });
      }

      case "unknown": {
        return t("failed");
      }

      case "ended": {
        return t("errors.ended");
      }

      case "endsTooSoon": {
        return t("errors.endsTooSoon");
      }

      case "forbidden": {
        return t("errors.forbidden");
      }

      case "notFound": {
        return t("errors.notFound");
      }

      default: {
        return error satisfies never;
      }
    }
  };
};
