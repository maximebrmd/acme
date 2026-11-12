"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Channel, Post, Tag } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";
import { useState } from "react";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link, useRouter } from "#i18n/navigation.ts";
import { postSearchPage, workspaceChannels } from "#posts/api.ts";
import { filtersOf, isFiltering, queryOf } from "#posts/post-list-filter.ts";
import type { PostListFilters } from "#posts/post-list-filter.ts";
import { workspaceTags } from "#tags/atoms.ts";
import { tagsOf } from "#tags/post-tags.ts";

import {
  PostItemView,
  PostListEmpty,
  PostListFailed,
  PostListFiltersView,
  usePostTitle,
} from "./post-list-views.tsx";

const noChannels: readonly Channel[] = [];

const noTags: readonly Tag[] = [];

/** One post, opening on its page. */
const PostItem = ({
  channels,
  post,
  tags,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly post: Post;
  readonly tags: readonly Tag[];
  readonly workspaceId: string;
}) => (
  <PostItemView
    channels={channels}
    post={post}
    tags={tagsOf(post.tagIds, tags)}
  >
    <Link
      href={`/app/${workspaceId}/posts/${post.id}`}
      dir="auto"
      className="line-clamp-2 font-medium underline-offset-4 hover:underline"
    >
      {usePostTitle(post)}
    </Link>
  </PostItemView>
);

const LoadingList = () => {
  const t = useTranslations("Posts.List");

  return (
    <div className="flex flex-col gap-3" aria-busy>
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  );
};

interface PagesProps {
  readonly channels: readonly Channel[];
  readonly cursor: Option.Option<string>;
  readonly filters: PostListFilters;
  // How many pages to show after this one.
  readonly more: number;
  readonly onMore: () => void;
  readonly tags: readonly Tag[];
  readonly workspaceId: string;
}

// A page of posts, then the pages after it that "Show more" opened, each
// asked with the same filters and sort as the cursor needs.
const PostPages = ({
  channels,
  cursor,
  filters,
  more,
  onMore,
  tags,
  workspaceId,
}: PagesProps) => {
  const t = useTranslations("Posts.List");
  const page = postSearchPage(workspaceId, filters, cursor);
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);

  return AsyncResult.match(result, {
    onFailure: () => <PostListFailed onRetry={reload} />,
    onInitial: () => <LoadingList />,
    onSuccess: ({ value }) => {
      if (Option.isNone(cursor) && value.items.length === 0) {
        return (
          <PostListEmpty
            filtering={isFiltering(filters)}
            clearFilters={
              <Link
                href={`/app/${workspaceId}/posts`}
                className="text-sm underline-offset-4 hover:underline"
              >
                {t("clearFilters")}
              </Link>
            }
          />
        );
      }

      const next = Option.fromNullOr(value.nextCursor);

      return (
        <>
          <ul className="flex flex-col gap-3">
            {value.items.map((post) => (
              <PostItem
                key={post.id}
                channels={channels}
                post={post}
                tags={tags}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
          {Option.isSome(next) && more > 0 ? (
            <PostPages
              channels={channels}
              cursor={next}
              filters={filters}
              more={more - 1}
              tags={tags}
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

const LoadedList = ({
  filters,
  workspaceId,
}: {
  readonly filters: PostListFilters;
  readonly workspaceId: string;
}) => {
  const router = useRouter();
  // The pages "Show more" opened, for the filters they were opened with.
  const [more, setMore] = useState({ count: 0, query: queryOf(filters) });
  const query = queryOf(filters);
  const shown = more.query === query ? more.count : 0;

  const channels = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceChannels(workspaceId))),
    () => noChannels
  );

  const tags = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceTags(workspaceId))),
    () => noTags
  );

  const handleFilters = (next: PostListFilters) => {
    const written = queryOf(next);

    router.replace(
      written === ""
        ? `/app/${workspaceId}/posts`
        : `/app/${workspaceId}/posts?${written}`
    );
  };

  const handleMore = () => {
    setMore({ count: shown + 1, query });
  };

  return (
    <>
      <PostListFiltersView
        channels={channels}
        filters={filters}
        tags={tags}
        onChange={handleFilters}
      />
      <PostPages
        channels={channels}
        cursor={Option.none()}
        filters={filters}
        more={shown}
        tags={tags}
        workspaceId={workspaceId}
        onMore={handleMore}
      />
    </>
  );
};

/**
 * The workspace's posts, whatever their state, a page at a time, as the
 * filters in the page's query string keep and order them, so a link shows
 * the same list; with a way to write a new post for members who may.
 */
export const PostList = ({
  canCreate,
  query,
  workspaceId,
}: {
  readonly canCreate: boolean;
  /** The page's query string, which holds the filters. */
  readonly query: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Posts.List");
  // The posts are read with the visitor's cookies, which only the browser
  // sends.
  const hydrated = useHydrated();

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
        <LoadedList
          filters={filtersOf(new URLSearchParams(query))}
          workspaceId={workspaceId}
        />
      ) : (
        <LoadingList />
      )}
    </section>
  );
};
