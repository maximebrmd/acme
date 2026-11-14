"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { DateTime } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import type { Article, Channel } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";

import { workspaceArticles, workspaceSites } from "#articles/api.ts";
import { Link } from "#i18n/navigation.ts";

const badgeVariant = {
  draft: "outline",
  failed: "destructive",
  published: "default",
  publishing: "secondary",
  scheduled: "secondary",
  unconfirmed: "destructive",
} as const;

const siteName = (sites: readonly Channel[], channelId: string) => {
  const site = sites.find(({ id }) => id === channelId);

  return site === undefined
    ? channelId
    : (site.label ?? site.displayName ?? site.handle);
};

const ArticleRow = ({
  article,
  sites,
  workspaceId,
}: {
  readonly article: Article;
  readonly sites: readonly Channel[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Articles.list");
  const format = useFormatter();

  const removed =
    article.state._tag === "published" && article.state.removedAt !== null;

  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/app/${workspaceId}/articles/${article.id}`}
          className="truncate font-medium hover:underline"
        >
          {article.title.trim() === "" ? t("untitled") : article.title}
        </Link>
        <span className="text-muted-foreground truncate text-sm">
          {t("meta", {
            site: siteName(sites, article.channelId),
            updated: format.dateTime(DateTime.toDateUtc(article.updatedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </span>
      </div>
      <Badge variant={badgeVariant[article.state._tag]}>
        {removed ? t("removed") : t(`state.${article.state._tag}`)}
      </Badge>
    </li>
  );
};

const ArticleItems = ({
  articles,
  sites,
  workspaceId,
}: {
  readonly articles: readonly Article[];
  readonly sites: readonly Channel[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Articles.list");

  return articles.length === 0 ? (
    <p className="text-muted-foreground text-sm">{t("empty")}</p>
  ) : (
    <ul className="bg-card divide-y rounded-md border px-4">
      {articles.map((article) => (
        <ArticleRow
          key={article.id}
          article={article}
          sites={sites}
          workspaceId={workspaceId}
        />
      ))}
    </ul>
  );
};

/** The workspace's articles, newest first, each opening in the editor. */
export const ArticlesList = ({
  canCreate,
  workspaceId,
}: {
  readonly canCreate: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Articles.list");
  const query = workspaceArticles(workspaceId);
  const articles = useAtomValue(query);
  const refresh = useAtomRefresh(query);
  const sites = useAtomValue(workspaceSites(workspaceId));
  const knownSites = AsyncResult.isSuccess(sites) ? sites.value : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {knownSites.length === 0
            ? t("noSite")
            : t("sites", { count: knownSites.length })}
        </p>
        {canCreate && knownSites.length > 0 ? (
          <Button render={<Link href={`/app/${workspaceId}/articles/new`} />}>
            {t("new")}
          </Button>
        ) : null}
        {knownSites.length === 0 ? (
          <Button
            variant="outline"
            render={<Link href={`/app/${workspaceId}/channels`} />}
          >
            {t("connect")}
          </Button>
        ) : null}
      </div>
      {AsyncResult.isFailure(articles) ? (
        <div className="flex flex-wrap items-center gap-2">
          <Alert variant="destructive">
            <AlertDescription>{t("loadFailed")}</AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={refresh}>
            {t("retry")}
          </Button>
        </div>
      ) : null}
      {AsyncResult.isSuccess(articles) ? (
        <ArticleItems
          articles={articles.value.items}
          sites={knownSites}
          workspaceId={workspaceId}
        />
      ) : null}
    </div>
  );
};
