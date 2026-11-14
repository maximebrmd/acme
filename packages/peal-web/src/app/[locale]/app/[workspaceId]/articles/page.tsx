import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ArticlesList } from "#components/articles/articles-list.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// The workspace's articles, for its websites, newest first.
const ArticlesPage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/articles">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);
  const t = await getTranslations("Articles");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { workspace: membership.name })}
        </p>
      </div>
      <ArticlesList
        canCreate={membership.permissions.includes("post:create")}
        workspaceId={membership.id}
      />
    </div>
  );
};

export default ArticlesPage;
