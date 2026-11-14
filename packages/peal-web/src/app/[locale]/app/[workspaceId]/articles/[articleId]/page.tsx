import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ArticleScreen } from "#components/articles/article-screen.tsx";
import { routing } from "#i18n/routing.ts";
import { membershipOf } from "#posts/membership.ts";

// An article of the workspace, in the editor, with what it can do next.
const ArticlePage = async ({
  params,
}: PageProps<"/[locale]/app/[workspaceId]/articles/[articleId]">) => {
  const { articleId, locale, workspaceId } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const membership = await membershipOf(locale, workspaceId);
  const t = await getTranslations("Articles");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("editTitle")}
      </h1>
      <ArticleScreen
        articleId={articleId}
        permissions={membership.permissions}
        workspaceId={membership.id}
      />
    </div>
  );
};

export default ArticlePage;
