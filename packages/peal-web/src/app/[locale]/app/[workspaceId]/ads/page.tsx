import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AdsScreen } from "#components/ads/ads-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's ad accounts, their campaigns and what they spent, for
// members who may read its ads. Connecting takes ads:manage, and deciding
// what an account may spend ads:authorize, which owners hold.
const AdsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/ads">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("ads:read")) {
    notFound();
  }

  const t = await getTranslations("Ads.page");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <AdsScreen
        workspaceId={workspace.id}
        rights={{
          authorize: may.has("ads:authorize"),
          manage: may.has("ads:manage"),
        }}
      />
    </div>
  );
};

export default AdsPage;
