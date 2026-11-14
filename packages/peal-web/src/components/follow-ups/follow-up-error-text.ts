"use client";

import { useTranslations } from "next-intl";

import type { FollowUpError } from "#follow-ups/follow-up-error.ts";

/** What a refused change to a follow-up rule says, in the reader's language. */
export const useFollowUpErrorText = () => {
  const t = useTranslations("FollowUps");

  return (error: FollowUpError): string => {
    switch (error.key) {
      case "notPossible": {
        return t("errors.notPossible", { reason: error.reason });
      }

      case "tooMany": {
        return t("errors.tooMany", { allowed: error.allowed });
      }

      case "unknown": {
        return t("failed");
      }

      case "ended": {
        return t("errors.ended");
      }

      case "forbidden": {
        return t("errors.forbidden");
      }

      case "notFound": {
        return t("errors.notFound");
      }

      case "taken": {
        return t("errors.taken");
      }

      default: {
        return error satisfies never;
      }
    }
  };
};
