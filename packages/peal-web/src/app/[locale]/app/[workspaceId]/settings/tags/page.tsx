import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { maxTagsPerPost, maxTagsPerWorkspace } from "peal-contract";

import { TagsSettings } from "#components/tags/tags-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's tags, for members who may read its posts. Adding, renaming,
// recolouring or deleting one takes post:update.
const TagsPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/tags">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("post:read")) {
    notFound();
  }

  const t = await getTranslations("Tags");
  const mayManage = may.has("post:update");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      <p className="text-muted-foreground text-sm">
        {t("rules", { max: maxTagsPerWorkspace, perPost: maxTagsPerPost })}
      </p>
      {mayManage ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <TagsSettings workspaceId={workspace.id} mayManage={mayManage} />
    </div>
  );
};

export default TagsPage;
