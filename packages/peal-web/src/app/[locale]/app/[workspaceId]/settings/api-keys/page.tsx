import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ApiKeysSettings } from "#components/settings/api-keys.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's API keys, for members who may read them. A key may do at
// most what its creator may, and the direct messages' permissions only an
// owner gives a key, as letting an application into them.
const messagePermissions: ReadonlySet<string> = new Set([
  "engagement:readMessages",
  "engagement:message",
]);

const ApiKeysPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/api-keys">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("apiKey:read")) {
    notFound();
  }

  const t = await getTranslations("WorkspaceSettings.apiKeys");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <ApiKeysSettings
        workspaceId={workspace.id}
        grantable={workspace.permissions.filter(
          (permission) =>
            may.has("organization:secure") ||
            !messagePermissions.has(permission)
        )}
        mayCreate={may.has("apiKey:create")}
        mayRevoke={may.has("apiKey:delete")}
      />
    </div>
  );
};

export default ApiKeysPage;
