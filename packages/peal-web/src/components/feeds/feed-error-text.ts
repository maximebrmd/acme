"use client";

import { useTranslations } from "next-intl";

import type { FeedError } from "#feeds/feed-error.ts";

/** What a refused change to a feed says, in the reader's language. */
export const useFeedErrorText = () => {
  const t = useTranslations("Feeds");

  return (error: FeedError): string => {
    switch (error.key) {
      case "address": {
        return t("errors.address", { reason: error.reason });
      }

      case "unreadable": {
        return t("errors.unreadable", { reason: error.reason });
      }

      case "template": {
        return t("errors.template", {
          placeholder: error.placeholder,
          reason: error.reason,
        });
      }

      case "readsLimited": {
        return t("errors.readsLimited", { minutes: error.minutes });
      }

      case "tooMany": {
        return t("errors.tooMany", { allowed: error.allowed });
      }

      case "unknown": {
        return t("failed");
      }

      case "forbidden":
      case "noChannelSet":
      case "noQueue":
      case "notFound":
      case "unknownChannels": {
        return t(`errors.${error.key}`);
      }

      default: {
        return error satisfies never;
      }
    }
  };
};
