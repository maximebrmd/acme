import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { DeleteWorkspace } from "#components/settings/delete-workspace.tsx";
import { RenameWorkspaceForm } from "#components/settings/rename-workspace-form.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's general settings: its name, and deleting it, for those
// whose role allows each.
const GeneralSettingsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const t = await getTranslations("WorkspaceSettings");
  const may = new Set(workspace.permissions);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("general.title")}</h2>
          </CardTitle>
          <CardDescription>
            {may.has("organization:update")
              ? t("general.description")
              : t("general.readOnly")}
          </CardDescription>
        </CardHeader>
        {may.has("organization:update") ? (
          <CardContent>
            <RenameWorkspaceForm
              name={workspace.name}
              workspaceId={workspace.id}
            />
          </CardContent>
        ) : null}
      </Card>
      {may.has("organization:delete") ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("delete.title")}</h2>
            </CardTitle>
            <CardDescription>{t("delete.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteWorkspace name={workspace.name} workspaceId={workspace.id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default GeneralSettingsPage;
