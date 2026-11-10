import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  maxWebhookAttempts,
  maxWebhookEndpoints,
  webhookDeliveryRetentionDays,
} from "peal-contract";

import { WebhooksSettings } from "#components/webhooks/webhooks-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's webhook endpoints and their deliveries, for members who may
// read them. Changing anything takes webhook:manage.
const WebhooksPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/webhooks">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("webhook:read")) {
    notFound();
  }

  const t = await getTranslations("Webhooks");
  const mayManage = may.has("webhook:manage");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <p className="text-muted-foreground text-sm">
        {t("rules", {
          attempts: maxWebhookAttempts,
          days: webhookDeliveryRetentionDays,
          max: maxWebhookEndpoints,
        })}
      </p>
      {mayManage ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <WebhooksSettings workspaceId={workspace.id} mayManage={mayManage} />
    </div>
  );
};

export default WebhooksPage;
