import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { maxChannelSetsPerWorkspace } from "peal-contract";

import { ChannelSetsSettings } from "#components/channel-sets/channel-sets-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's channel sets, for members who may read its posts and its
// channels. Adding, changing or deleting one takes post:update.
const ChannelSetsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/channel-sets">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!(may.has("post:read") && may.has("channel:read"))) {
    notFound();
  }

  const t = await getTranslations("ChannelSets");
  const mayManage = may.has("post:update");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <p className="text-muted-foreground text-sm">
        {t("rules", { max: maxChannelSetsPerWorkspace })}
      </p>
      {mayManage ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <ChannelSetsSettings workspaceId={workspace.id} mayManage={mayManage} />
    </div>
  );
};

export default ChannelSetsPage;
