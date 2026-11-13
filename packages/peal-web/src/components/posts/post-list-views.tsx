"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import {
  PostOutcomeSchema,
  PostSortSchema,
  PostStatusSchema,
} from "peal-contract";
import type { Channel, Post, Tag } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId } from "react";
import type { ReactNode } from "react";

import { channelName } from "#channels/channel-name.ts";
import { TagList } from "#components/tags/tag-views.tsx";
import { useTimeOptions } from "#i18n/hour-cycle.ts";
import { byTime, withFilter } from "#posts/post-list-filter.ts";
import type { FilterName, PostListFilters } from "#posts/post-list-filter.ts";

// Views of the posts list, which take their links as props or children,
// so tests render each state without Next.

/** What a post is called in the list: the start of its text. */
export const usePostTitle = (post: Post): string => {
  const t = useTranslations("Posts.List");
  const text = post.content.text.trim();

  return text === "" ? t("noText") : text;
};

const noTags: readonly Tag[] = [];

/**
 * One post: its title (`children`, which links it to its page), its time
 * in the reader's zone, its status and, once finished, its outcome, its
 * channels by name and its tags.
 */
export const PostItemView = ({
  channels,
  children,
  post,
  tags = noTags,
}: {
  /** The workspace's channels, which name the post's. */
  readonly channels: readonly Channel[];
  readonly children: ReactNode;
  readonly post: Post;
  /** The post's tags, among the workspace's. */
  readonly tags?: readonly Tag[];
}) => {
  const t = useTranslations("Posts.List");
  const tPosts = useTranslations("Posts");
  const format = useFormatter();
  const timeOptions = useTimeOptions();

  const named = post.targets.map(({ channelId }) => {
    const channel = channels.find(({ id }) => id === channelId);

    return channel === undefined
      ? tPosts("disconnectedChannel")
      : channelName(channel);
  });

  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      {children}
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        <span>
          {post.schedule === null
            ? t("noTime")
            : format.dateTime(DateTime.toDate(post.schedule.at), {
                dateStyle: "medium",
                timeStyle: "short",
                ...timeOptions,
              })}
        </span>
        <Badge variant="outline">
          {tPosts("status", { status: post.status })}
        </Badge>
        {post.outcome === null ? null : (
          <Badge
            variant={post.outcome === "failed" ? "destructive" : "secondary"}
          >
            {tPosts("outcome", { outcome: post.outcome })}
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        <span className="sr-only">{t("channels")}: </span>
        {named.length === 0 ? t("noChannel") : named.join(" · ")}
      </p>
      <TagList label={t("tags")} tags={tags} />
    </li>
  );
};

/** The list when it holds nothing: none yet, or none the filters keep. */
export const PostListEmpty = ({
  clearFilters,
  filtering,
}: {
  /** A link that shows every post again, while filters narrow the list. */
  readonly clearFilters: ReactNode;
  readonly filtering: boolean;
}) => {
  const t = useTranslations("Posts.List");

  return filtering ? (
    <div className="flex flex-col items-start gap-2">
      <p className="text-muted-foreground">{t("filteredEmpty")}</p>
      {clearFilters}
    </div>
  ) : (
    <p className="text-muted-foreground">{t("empty")}</p>
  );
};

/** The list could not be read: a line, and a way to ask again. */
export const PostListFailed = ({
  onRetry,
}: {
  readonly onRetry: () => void;
}) => {
  const t = useTranslations("Posts.List");

  return (
    <Alert variant="destructive">
      <AlertDescription>
        <span className="flex flex-wrap items-center justify-between gap-2">
          {t("loadFailed")}
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t("reload")}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
};

// What a select shows when it narrows nothing.
const every = "every";

const FilterSelect = ({
  children,
  label,
  name,
  onChange,
  shown,
  value,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly name: FilterName;
  readonly onChange: (name: FilterName, value: string | undefined) => void;
  /** What the closed select shows. */
  readonly shown: string;
  readonly value: string | undefined;
}) => {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <Label id={id}>{label}</Label>
      <Select
        value={value ?? every}
        onValueChange={(chosen: string | null) => {
          onChange(
            name,
            chosen === null || chosen === every ? undefined : chosen
          );
        }}
      >
        <SelectTrigger aria-labelledby={id} className="min-w-44">
          <SelectValue>{shown}</SelectValue>
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
};

const statuses = PostStatusSchema.literals;
const outcomes = PostOutcomeSchema.literals;
const sorts = PostSortSchema.literals;

/**
 * The list's filters: status, outcome (with finished posts only), channel,
 * tag, and the order, which says when it leaves out posts without a time.
 */
export const PostListFiltersView = ({
  channels,
  filters,
  onChange,
  tags,
}: {
  readonly channels: readonly Channel[];
  readonly filters: PostListFilters;
  readonly onChange: (filters: PostListFilters) => void;
  readonly tags: readonly Tag[];
}) => {
  const t = useTranslations("Posts.List");
  const tPosts = useTranslations("Posts");
  const channel = channels.find(({ id }) => id === filters.channelId);
  const tag = tags.find(({ id }) => id === filters.tagId);

  // A filter on a channel or a tag the workspace no longer has, as an old
  // link may hold, is said, never shown as "every".
  const channelShown = () => {
    if (filters.channelId === undefined) {
      return t("anyChannel");
    }

    return channel === undefined ? t("unknownChannel") : channelName(channel);
  };

  const tagShown = () => {
    if (filters.tagId === undefined) {
      return t("anyTag");
    }

    return tag === undefined ? t("unknownTag") : tag.name;
  };

  const handleChange = (name: FilterName, value: string | undefined) => {
    onChange(withFilter(filters, name, value));
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{t("filters")}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label={t("status")}
          name="status"
          shown={
            filters.status === undefined
              ? t("anyStatus")
              : tPosts("status", { status: filters.status })
          }
          value={filters.status}
          onChange={handleChange}
        >
          <SelectItem value={every}>{t("anyStatus")}</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {tPosts("status", { status })}
            </SelectItem>
          ))}
        </FilterSelect>
        {filters.status === "finished" ? (
          <FilterSelect
            label={t("outcome")}
            name="outcome"
            shown={
              filters.outcome === undefined
                ? t("anyOutcome")
                : tPosts("outcome", { outcome: filters.outcome })
            }
            value={filters.outcome}
            onChange={handleChange}
          >
            <SelectItem value={every}>{t("anyOutcome")}</SelectItem>
            {outcomes.map((outcome) => (
              <SelectItem key={outcome} value={outcome}>
                {tPosts("outcome", { outcome })}
              </SelectItem>
            ))}
          </FilterSelect>
        ) : null}
        {channels.length === 0 && filters.channelId === undefined ? null : (
          <FilterSelect
            label={t("channel")}
            name="channel"
            shown={channelShown()}
            value={filters.channelId}
            onChange={handleChange}
          >
            <SelectItem value={every}>{t("anyChannel")}</SelectItem>
            {channels.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {channelName(option)}
              </SelectItem>
            ))}
          </FilterSelect>
        )}
        {tags.length === 0 && filters.tagId === undefined ? null : (
          <FilterSelect
            label={t("tag")}
            name="tag"
            shown={tagShown()}
            value={filters.tagId}
            onChange={handleChange}
          >
            <SelectItem value={every}>{t("anyTag")}</SelectItem>
            {tags.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </FilterSelect>
        )}
        <FilterSelect
          label={t("sort")}
          name="sort"
          shown={t("sortOption", { sort: filters.sort })}
          value={filters.sort}
          onChange={handleChange}
        >
          {sorts.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {t("sortOption", { sort })}
            </SelectItem>
          ))}
        </FilterSelect>
      </div>
      {byTime(filters.sort) ? (
        <p className="text-muted-foreground text-sm">{t("byTimeNote")}</p>
      ) : null}
    </fieldset>
  );
};
