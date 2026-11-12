"use client";

import { useTranslations } from "next-intl";
import type { CustomerHealth } from "peal-contract";

/**
 * What needs attention in one of the partner's customers, under its line
 * in the list: the channels to reconnect and the posts that failed in the
 * last 7 days. Nothing while the figures are not read, or where the
 * person may not read them.
 */
export const CustomerHealthLine = ({
  health,
}: {
  readonly health: CustomerHealth | undefined;
}) => {
  const t = useTranslations("WorkspaceSettings.partner");

  if (health === undefined) {
    return null;
  }

  const figures = [
    ...(health.channels === null
      ? []
      : [t("healthToReconnect", { count: health.channels.toReconnect })]),
    ...(health.posts === null
      ? []
      : [t("healthFailed", { count: health.posts.failedLast7Days })]),
  ];

  return figures.length === 0 ? null : (
    <span className="text-muted-foreground text-sm">{figures.join(" · ")}</span>
  );
};
