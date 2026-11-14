import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { CommentRulesSettings } from "#components/comment-rules/comment-rules-settings.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// A workspace's comment rules, for members who read the inbox; starting,
// pausing and stopping one takes engagement:reply.
const CommentRulesPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/settings/comment-rules">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const workspace = await membershipOf(locale, workspaceId);
  const may = new Set(workspace.permissions);

  if (!may.has("engagement:read")) {
    notFound();
  }

  const t = await getTranslations("CommentRules");
  const mayChange = may.has("engagement:reply");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("description")}</p>
      {mayChange ? null : (
        <p className="text-muted-foreground text-sm">{t("readOnly")}</p>
      )}
      <CommentRulesSettings workspaceId={workspace.id} mayChange={mayChange} />
    </div>
  );
};

export default CommentRulesPage;
