import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PartnerSettings } from "#components/settings/partner-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's partner account, for the members who may read it: what a
// product that embeds Peal sets up once, before its backend takes over
// with a partner key.
const PartnerPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/partner">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("partner:read")) {
    notFound();
  }

  const t = await getTranslations("WorkspaceSettings.partner");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <PartnerSettings
        workspaceId={workspace.id}
        mayManage={may.has("partner:manage")}
      />
    </div>
  );
};

export default PartnerPage;
