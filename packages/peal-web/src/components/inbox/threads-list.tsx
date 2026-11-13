"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { inboxPlatforms } from "peal-contract";
import type { Channel } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { Skeleton } from "peal-ui/components/skeleton";
import { useId, useState } from "react";

import { channelsOf } from "#channels/channels-api.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import { threadPage } from "#inbox/atoms.ts";
import type { ThreadFilter } from "#inbox/atoms.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";

import {
  InboxEmptyView,
  ThreadRowView,
  useChannelName,
} from "./inbox-views.tsx";

// How often the list is read again while its tab is visible.
const refreshEvery = 60_000;

// What the channel filter holds when it shows every channel.
const everyChannel = "all";

const appLink = (href: string, label: string) => (
  <Link href={href} className="underline-offset-4 hover:underline">
    {label}
  </Link>
);

const Loading = () => {
  const t = useTranslations("Inbox");

  return (
    <div className="flex flex-col gap-3" aria-busy>
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
};

// A page of threads, then the pages after it that "Load more" opened. Each
// page starts where the one before ends, and reads itself again while the
// tab is visible.
const ThreadPages = ({
  channels,
  cursor,
  filter,
  more,
  onMore,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly cursor: string | null;
  readonly filter: ThreadFilter;
  // How many pages to show after this one.
  readonly more: number;
  readonly onMore: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Inbox");
  const page = threadPage(workspaceId, filter, cursor);
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);

  useRefreshWhileVisible(reload, refreshEvery);

  return AsyncResult.match(result, {
    onFailure: () => (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("loadFailed")}
            <Button variant="outline" size="sm" onClick={reload}>
              {t("retry")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    ),
    onInitial: () => <Loading />,
    onSuccess: ({ value }) => {
      if (cursor === null && value.items.length === 0) {
        return (
          <InboxEmptyView
            filtered={filter.unanswered || filter.channelId !== null}
          />
        );
      }

      const next = value.nextCursor;

      return (
        <>
          <ul className="bg-card divide-y overflow-hidden rounded-md border">
            {value.items.map((thread) => (
              <ThreadRowView
                key={thread.id}
                thread={thread}
                channel={channels.find(({ id }) => id === thread.channelId)}
                link={appLink}
                workspaceId={workspaceId}
              />
            ))}
          </ul>
          {next !== null && more > 0 ? (
            <ThreadPages
              channels={channels}
              cursor={next}
              filter={filter}
              more={more - 1}
              workspaceId={workspaceId}
              onMore={onMore}
            />
          ) : null}
          {next !== null && more === 0 ? (
            <Button variant="outline" className="self-center" onClick={onMore}>
              {t("list.loadMore")}
            </Button>
          ) : null}
        </>
      );
    },
  });
};

// The pages of one filter: choosing another starts from its first page.
const FilteredThreads = ({
  channels,
  filter,
  workspaceId,
}: {
  readonly channels: readonly Channel[];
  readonly filter: ThreadFilter;
  readonly workspaceId: string;
}) => {
  const [more, setMore] = useState(0);

  return (
    <ThreadPages
      channels={channels}
      cursor={null}
      filter={filter}
      more={more}
      workspaceId={workspaceId}
      onMore={() => {
        setMore((shown) => shown + 1);
      }}
    />
  );
};

/**
 * The workspace's inbox: the posts that have comments, those with a comment
 * waiting for an answer first, narrowed to those waiting or to one channel.
 * It renders in the browser, where the reader's time zone is known.
 */
export const ThreadsList = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Inbox");
  const channelName = useChannelName();
  const hydrated = useHydrated();
  const channels = useAtomValue(channelsOf(workspaceId));
  const [unanswered, setUnanswered] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const unansweredId = useId();
  const channelLabelId = useId();
  const titleId = useId();

  if (!hydrated) {
    return <Loading />;
  }

  const known = AsyncResult.isSuccess(channels) ? channels.value : [];

  // Only the channels whose platform Peal reads comments on.
  const readable = known.filter(({ platform }) =>
    inboxPlatforms.some((read) => read === platform)
  );

  const chosen = readable.find(({ id }) => id === channelId);

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <legend className="sr-only">{t("filter.legend")}</legend>
        <div className="flex items-center gap-2">
          <Checkbox
            id={unansweredId}
            checked={unanswered}
            onCheckedChange={(checked) => {
              setUnanswered(checked === true);
            }}
          />
          <Label htmlFor={unansweredId}>{t("filter.unanswered")}</Label>
        </div>
        {readable.length > 1 ? (
          <div className="flex items-center gap-2">
            <Label id={channelLabelId}>{t("filter.channel")}</Label>
            <Select
              value={channelId ?? everyChannel}
              onValueChange={(value) => {
                setChannelId(
                  value === null || value === everyChannel ? null : value
                );
              }}
            >
              <SelectTrigger aria-labelledby={channelLabelId}>
                <SelectValue>
                  {chosen === undefined
                    ? t("filter.allChannels")
                    : channelName(chosen)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={everyChannel}>
                  {t("filter.allChannels")}
                </SelectItem>
                {readable.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channelName(channel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </fieldset>
      <section aria-labelledby={titleId} className="flex flex-col gap-4">
        <h2 id={titleId} className="sr-only">
          {t("list.title")}
        </h2>
        <FilteredThreads
          key={`${channelId ?? everyChannel}/${unanswered ? "waiting" : "all"}`}
          channels={known}
          filter={{ channelId, unanswered }}
          workspaceId={workspaceId}
        />
      </section>
    </div>
  );
};
