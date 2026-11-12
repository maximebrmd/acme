import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";

import { ApprovalPolicyForm } from "#components/settings/approval-policy-form.tsx";
import { DeleteWorkspace } from "#components/settings/delete-workspace.tsx";
import { RenameWorkspaceForm } from "#components/settings/rename-workspace-form.tsx";
import { ShortLinkDefaultForm } from "#components/settings/short-link-default-form.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's general settings: its name, which posts wait for an
// approval, whether new posts shorten their links, and deleting it, for
// those whose role allows each.
const GeneralSettingsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const t = await getTranslations("WorkspaceSettings");
  const review = await getTranslations("Review");
  const shortLinks = await getTranslations("ShortLinks.settings");
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
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{review("policy.title")}</h2>
          </CardTitle>
          <CardDescription>
            {review("policy.description")}{" "}
            {may.has("organization:update") ? null : review("policy.readOnly")}
          </CardDescription>
        </CardHeader>
        {may.has("organization:update") ? (
          <CardContent>
            <ApprovalPolicyForm workspaceId={workspace.id} />
          </CardContent>
        ) : null}
      </Card>
      {may.has("post:read") ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{shortLinks("title")}</h2>
            </CardTitle>
            <CardDescription>{shortLinks("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ShortLinkDefaultForm
              mayChange={may.has("organization:update")}
              workspaceId={workspace.id}
            />
          </CardContent>
        </Card>
      ) : null}
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
