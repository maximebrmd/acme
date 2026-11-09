import { useTranslations } from "next-intl";

import type { ChannelErrorKey } from "./channels-api.ts";

/**
 * Writes why a channel action failed: from the channels page's errors, or
 * the billing catalogue's for a plan with no room for another channel.
 */
export const useChannelErrorText = () => {
  const errors = useTranslations("ChannelsPage.errors");
  const billing = useTranslations("Billing");

  return (error: ChannelErrorKey): string =>
    error === "planLimit"
      ? billing("limitReached", { limit: "channels" })
      : errors(error);
};
