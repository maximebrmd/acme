"use client";

import { useAtomValue } from "@effect/atom-react";
import { DateTime } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Article, Channel } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";

import { workspaceArticle, workspaceSites } from "#articles/api.ts";
import { ArticleEditor } from "#components/articles/article-editor.tsx";

interface ArticleScreenProps {
  /** The article to edit; none for a new one. */
  readonly articleId: string | undefined;
  readonly permissions: readonly string[];
  readonly workspaceId: string;
}

const Loaded = ({
  article,
  permissions,
  sites,
  workspaceId,
}: {
  readonly article: Article | undefined;
  readonly permissions: readonly string[];
  readonly sites: readonly Channel[];
  readonly workspaceId: string;
}) => (
  <ArticleEditor
    // A new answer of the server starts the editor over on it.
    key={
      article === undefined
        ? "new"
        : `${article.id}:${DateTime.toEpochMillis(article.updatedAt)}`
    }
    {...(article === undefined ? {} : { article })}
    permissions={permissions}
    sites={sites}
    workspaceId={workspaceId}
  />
);

const ExistingArticle = ({
  articleId,
  permissions,
  sites,
  workspaceId,
}: {
  readonly articleId: string;
  readonly permissions: readonly string[];
  readonly sites: readonly Channel[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Articles");
  const article = useAtomValue(workspaceArticle(workspaceId, articleId));

  if (AsyncResult.isFailure(article)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("notFound")}</AlertDescription>
      </Alert>
    );
  }

  return AsyncResult.isSuccess(article) ? (
    <Loaded
      article={article.value}
      permissions={permissions}
      sites={sites}
      workspaceId={workspaceId}
    />
  ) : null;
};

/** Loads the workspace's websites, and the article, for the editor. */
export const ArticleScreen = ({
  articleId,
  permissions,
  workspaceId,
}: ArticleScreenProps) => {
  const t = useTranslations("Articles");
  const sites = useAtomValue(workspaceSites(workspaceId));

  if (!AsyncResult.isSuccess(sites)) {
    return null;
  }

  if (articleId !== undefined) {
    return (
      <ExistingArticle
        articleId={articleId}
        permissions={permissions}
        sites={sites.value}
        workspaceId={workspaceId}
      />
    );
  }

  return sites.value.length === 0 ? (
    <Alert>
      <AlertDescription>{t("list.noSite")}</AlertDescription>
    </Alert>
  ) : (
    <Loaded
      article={undefined}
      permissions={permissions}
      sites={sites.value}
      workspaceId={workspaceId}
    />
  );
};
