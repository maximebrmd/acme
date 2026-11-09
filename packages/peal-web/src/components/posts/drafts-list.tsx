"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { Post } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import { draftPage } from "#posts/api.ts";

import { DraftItemView, useDraftTitle } from "./draft-item-view.tsx";

/** One draft, opening in the composer. */
const DraftItem = ({
  post,
  workspaceId,
}: {
  readonly post: Post;
  readonly workspaceId: string;
}) => {
  const title = useDraftTitle(post);

  return (
    <DraftItemView post={post}>
      <Link
        href={`/app/${workspaceId}/posts/${post.id}`}
        className="line-clamp-2 font-medium underline-offset-4 hover:underline"
      >
        {title}
      </Link>
    </DraftItemView>
  );
};

const LoadingList = () => {
  const t = useTranslations("Drafts");

  return (
    <div className="flex flex-col gap-3" aria-busy>
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  );
};

// A page of drafts, then the pages after it that "Show more" opened. Each
// page starts where the one before now ends, so drafts saved or discarded
// meanwhile never leave a gap or show twice.
const DraftPages = ({
  cursor,
  more,
  onMore,
  workspaceId,
}: {
  readonly cursor: Option.Option<string>;
  // How many pages to show after this one.
  readonly more: number;
  readonly onMore: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Drafts");
  const page = draftPage(workspaceId, cursor);
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);

  return AsyncResult.match(result, {
    onFailure: () => (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("loadFailed")}
            <Button variant="outline" size="sm" onClick={reload}>
              {t("reload")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    ),
    onInitial: () => <LoadingList />,
    onSuccess: ({ value }) => {
      if (Option.isNone(cursor) && value.items.length === 0) {
        return <p className="text-muted-foreground">{t("empty")}</p>;
      }

      const next = Option.fromNullOr(value.nextCursor);

      return (
        <>
          <ul className="flex flex-col gap-3">
            {value.items.map((post) => (
              <DraftItem key={post.id} post={post} workspaceId={workspaceId} />
            ))}
          </ul>
          {Option.isSome(next) && more > 0 ? (
            <DraftPages
              cursor={next}
              more={more - 1}
              workspaceId={workspaceId}
              onMore={onMore}
            />
          ) : null}
          {Option.isSome(next) && more === 0 ? (
            <Button variant="outline" className="self-center" onClick={onMore}>
              {t("loadMore")}
            </Button>
          ) : null}
        </>
      );
    },
  });
};

/**
 * The workspace's drafts, newest first, a page at a time, with a way to
 * write a new post for members who may.
 */
export const DraftsList = ({
  canCreate,
  workspaceId,
}: {
  readonly canCreate: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Drafts");
  const [more, setMore] = useState(0);
  // The drafts are fetched with the visitor's cookies, which only the
  // browser sends.
  const hydrated = useHydrated();

  const handleMore = () => {
    setMore((current) => current + 1);
  };

  return (
    <section className="flex flex-col gap-4">
      {canCreate ? (
        <Link
          href={`/app/${workspaceId}/posts/new`}
          className="self-start text-sm underline-offset-4 hover:underline"
        >
          {t("newPost")}
        </Link>
      ) : null}
      {hydrated ? (
        <DraftPages
          cursor={Option.none()}
          more={more}
          workspaceId={workspaceId}
          onMore={handleMore}
        />
      ) : (
        <LoadingList />
      )}
    </section>
  );
};
