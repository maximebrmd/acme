import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { maxQueuesPerWorkspace } from "peal-contract";

import { QueuesSettings } from "#components/queues/queues-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's queues, for members who may read its posts and its
// channels. Adding, changing or deleting one takes post:update; moving its
// waiting posts onto its slots, post:schedule.
const QueuesPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/queues">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!(may.has("post:read") && may.has("channel:read"))) {
    notFound();
  }

  const t = await getTranslations("Queues");
  const mayManage = may.has("post:update");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <p className="text-muted-foreground text-sm">
        {t("rules", { max: maxQueuesPerWorkspace })}
      </p>
      {mayManage ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <QueuesSettings
        workspaceId={workspace.id}
        mayManage={mayManage}
        mayReshuffle={may.has("post:schedule")}
      />
    </div>
  );
};

export default QueuesPage;
