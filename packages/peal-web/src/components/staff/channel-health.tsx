import type { ChannelStatus } from "acme-contract";
import { Badge } from "acme-ui/components/badge";
import { getTranslations } from "next-intl/server";

// Whether a channel posts, as a badge.
export const ChannelHealth = async ({
  status,
}: {
  readonly status: ChannelStatus;
}) => {
  const t = await getTranslations("Staff.channelStatus");

  if (status._tag === "active") {
    return <Badge variant="secondary">{t("active")}</Badge>;
  }

  if (status._tag === "refreshNeeded") {
    return <Badge variant="destructive">{t("refreshNeeded")}</Badge>;
  }

  return (
    <Badge variant="outline">
      {status.refreshNeeded ? t("disabledToReconnect") : t("disabled")}
    </Badge>
  );
};
