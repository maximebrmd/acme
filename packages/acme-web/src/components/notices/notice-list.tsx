"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Notice } from "acme-contract";
import { Alert, AlertDescription } from "acme-ui/components/alert";
import { Badge } from "acme-ui/components/badge";
import { Button } from "acme-ui/components/button";
import { Skeleton } from "acme-ui/components/skeleton";
import { DateTime, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import {
  markAllNoticesRead,
  markNoticesRead,
  noticePage,
  noticesKeys,
  unreadNotices,
} from "#notices/atoms.ts";
import { useNoticeText } from "#notices/notice-text.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

import { InTimeZone } from "./in-time-zone.tsx";

/** One notice: what happened, when, and where to act on it. */
export const NoticeItem = ({
  notice,
  workspaces,
}: {
  readonly notice: Notice;
  readonly workspaces: ReadonlyMap<string, string>;
}) => {
  const t = useTranslations("Notices.page");
  const write = useNoticeText(workspaces);
  const markRead = useAtomSet(markNoticesRead, { mode: "promiseExit" });
  const [marking, startMarking] = useTransition();
  const textId = useId();
  const { href, open, text } = write(notice.event, notice.workspaceId);
  const unread = notice.readAt === null;

  const handleMarkRead = () => {
    startMarking(async () => {
      const exit = await markRead({
        payload: { ids: [notice.id] },
        reactivityKeys: noticesKeys,
      });

      if (Exit.isFailure(exit)) {
        toast.error(t("markFailed"));
      }
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <p id={textId} className={unread ? "font-medium" : undefined}>
          {text}
        </p>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          {unread ? <Badge variant="secondary">{t("unread")}</Badge> : null}
          {t("received", { date: DateTime.toDate(notice.createdAt) })}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          render={<Link href={href} />}
          nativeButton={false}
          aria-describedby={textId}
        >
          {open}
        </Button>
        {unread ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={marking}
            focusableWhenDisabled
            aria-describedby={textId}
            onClick={handleMarkRead}
          >
            {marking ? t("marking") : t("markRead")}
          </Button>
        ) : null}
      </div>
    </li>
  );
};

const LoadingList = () => {
  const t = useTranslations("Notices.page");

  return (
    <div className="flex flex-col gap-3" aria-busy>
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-20" />
      ))}
    </div>
  );
};

// A page of notices, then the pages after it that "Show more" opened. Each
// page starts where the one before ends, so notices arriving meanwhile
// never show twice.
const NoticePages = ({
  cursor,
  more,
  onMore,
  workspaces,
}: {
  readonly cursor: Option.Option<string>;
  // How many pages to show after this one.
  readonly more: number;
  readonly onMore: () => void;
  readonly workspaces: ReadonlyMap<string, string>;
}) => {
  const t = useTranslations("Notices.page");
  const page = noticePage(cursor);
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
            {value.items.map((notice) => (
              <NoticeItem
                key={notice.id}
                notice={notice}
                workspaces={workspaces}
              />
            ))}
          </ul>
          {Option.isSome(next) && more > 0 ? (
            <NoticePages
              cursor={next}
              more={more - 1}
              workspaces={workspaces}
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

const MarkAllRead = () => {
  const t = useTranslations("Notices.page");

  const unread = AsyncResult.value(useAtomValue(unreadNotices)).pipe(
    Option.map(({ unread: count }) => count)
  );

  const markAll = useAtomSet(markAllNoticesRead, { mode: "promiseExit" });
  const [marking, startMarking] = useTransition();

  const handleMarkAll = () => {
    startMarking(async () => {
      const exit = await markAll({ reactivityKeys: noticesKeys });

      if (Exit.isFailure(exit)) {
        toast.error(t("markFailed"));
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={marking || !Option.exists(unread, (count) => count > 0)}
      focusableWhenDisabled
      onClick={handleMarkAll}
    >
      {marking ? t("markingAll") : t("markAllRead")}
    </Button>
  );
};

/**
 * The user's notices across their workspaces, newest first, a page at a
 * time. `workspaces` names the workspaces by id.
 */
export const NoticeList = ({
  workspaces,
}: {
  readonly workspaces: Readonly<Record<string, string>>;
}) => {
  const t = useTranslations("Notices.page");
  const [more, setMore] = useState(0);
  const names = new Map(Object.entries(workspaces));
  // The notices are fetched with the visitor's cookies, which only the
  // browser sends.
  const hydrated = useHydrated();

  const handleMore = () => {
    setMore((current) => current + 1);
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="notice-list">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="notice-list" className="text-xl font-semibold">
          {t("listTitle")}
        </h2>
        {hydrated ? <MarkAllRead /> : null}
      </div>
      {hydrated ? (
        // When each notice arrived, and when a channel's authorization ends,
        // in the reader's own zone.
        <InTimeZone timeZone={browserTimeZone()}>
          <NoticePages
            cursor={Option.none()}
            more={more}
            workspaces={names}
            onMore={handleMore}
          />
        </InTimeZone>
      ) : (
        <LoadingList />
      )}
    </section>
  );
};
