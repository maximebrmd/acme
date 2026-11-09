"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import { unreadNotices } from "#notices/atoms.ts";
import { useRefreshWhileVisible } from "#notices/use-refresh-while-visible.ts";

import { NotificationBellView } from "./notification-bell-view.tsx";

// How often the bell asks for the count while the page is visible. Polling
// a count the database answers from an index is cheap, works through any
// proxy a self-hoster runs, and needs nothing shared between servers;
// notices are not urgent to the second, and the bell also asks as soon as
// the tab is shown again.
const refreshEvery = 30_000;

const LiveBell = () => {
  const t = useTranslations("Notices.bell");
  const result = useAtomValue(unreadNotices);
  const refresh = useAtomRefresh(unreadNotices);

  const unread = AsyncResult.value(result).pipe(
    Option.map(({ unread: count }) => count)
  );

  // The count the bell last showed, to tell how many arrived since. Kept in
  // state and updated while rendering, as React does for values that
  // follow a prop.
  const [shown, setShown] = useState<Option.Option<number>>(Option.none());
  const [announcement, setAnnouncement] = useState("");

  if (Option.isSome(unread) && !Option.contains(shown, unread.value)) {
    if (Option.isSome(shown) && unread.value > shown.value) {
      setAnnouncement(t("arrived", { count: unread.value - shown.value }));
    }

    setShown(unread);
  }

  useRefreshWhileVisible(refresh, refreshEvery);

  return (
    <NotificationBellView
      announcement={announcement}
      link={<Link href="/app/notices" />}
      unread={unread}
    />
  );
};

/**
 * The header's bell, for signed-in users. The count is read with the
 * visitor's cookies, which only the browser sends: until the page hydrates,
 * the bell shows no count.
 */
export const NotificationBell = () => {
  const hydrated = useHydrated();

  return hydrated ? (
    <LiveBell />
  ) : (
    <NotificationBellView
      announcement=""
      link={<Link href="/app/notices" />}
      unread={Option.none()}
    />
  );
};
