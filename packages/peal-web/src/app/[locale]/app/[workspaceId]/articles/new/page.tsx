import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ArticleScreen } from "#components/articles/article-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// Writes a new article for one of the workspace's websites.
const NewArticlePage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/articles/new">) => {
  const { locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);
  const t = await getTranslations("Articles");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h1>
      <ArticleScreen
        articleId={undefined}
        permissions={membership.permissions}
        workspaceId={membership.id}
      />
    </div>
  );
};

export default NewArticlePage;
