import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { AcmeApi } from "#api/client.ts";

// The queries and mutations of the bell, the notices page and the
// preferences. A mutation passes `reactivityKeys: noticesKeys`, which
// refreshes the count and every page.

export const noticesKeys = ["notices"];

export const preferencesKeys = ["notification-preferences"];

/** How many of the user's notices are unread. */
export const unreadNotices = AcmeApi.query("notices", "unread", {
  reactivityKeys: noticesKeys,
});

const pages = Atom.family((cursor: string) =>
  AcmeApi.query("notices", "list", {
    query: cursor === "" ? {} : { cursor },
    reactivityKeys: noticesKeys,
  })
);

/** A page of the user's notices, newest first: the first, or the one at `cursor`. */
export const noticePage = (cursor: Option.Option<string>) =>
  pages(Option.getOrElse(cursor, () => ""));

export const markNoticesRead = AcmeApi.mutation("notices", "markRead");

export const markAllNoticesRead = AcmeApi.mutation("notices", "markAllRead");

/** Which notices the user also receives by email. */
export const notificationPreferences = AcmeApi.query(
  "notificationPreferences",
  "get",
  { reactivityKeys: preferencesKeys }
);

export const changeNotificationPreferences = AcmeApi.mutation(
  "notificationPreferences",
  "update"
);
