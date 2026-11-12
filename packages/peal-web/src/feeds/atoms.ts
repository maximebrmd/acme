import { Effect } from "effect";
import { Atom } from "effect/reactivity";
import { maxFeedPageSize } from "peal-contract";
import type { Feed, FeedPage } from "peal-contract";

import { PealApi } from "#api/client.ts";

// The queries and mutations of a workspace's feeds. A change passes
// `reactivityKeys: feedsChanged(workspaceId)`, which lists them again; it
// makes no post at once, as a feed's posts are made by the server's run.

/** What refreshes a workspace's feeds once a change lands. */
export const feedsChanged = (workspaceId: string) => [`feeds:${workspaceId}`];

/** Every feed of the workspace, oldest first, read page after page. */
export const everyFeed = <E, R>(
  read: (cursor: string | undefined) => Effect.Effect<FeedPage, E, R>
): Effect.Effect<{ readonly items: readonly Feed[] }, E, R> =>
  Effect.gen(function* everyFeedPage() {
    const items: Feed[] = [];
    let cursor: string | undefined;

    do {
      const page: FeedPage = yield* read(cursor);

      items.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);

    return { items };
  });

/** The workspace's feeds, read again once one changes. */
export const workspaceFeeds = Atom.family((workspaceId: string) =>
  Atom.withReactivity(feedsChanged(workspaceId))(
    PealApi.runtime.atom(
      PealApi.use((client) =>
        everyFeed((cursor) =>
          client.feeds.list({
            params: { workspaceId },
            query:
              cursor === undefined
                ? { limit: maxFeedPageSize }
                : { cursor, limit: maxFeedPageSize },
          })
        )
      )
    )
  )
);

/** A feed's newest items, never what they said. */
export const feedItems = (workspaceId: string, feedId: string) =>
  PealApi.query("feeds", "items", {
    params: { feedId, workspaceId },
    reactivityKeys: feedsChanged(workspaceId),
  });

export const createFeed = PealApi.mutation("feeds", "create");

export const updateFeed = PealApi.mutation("feeds", "update");

export const deleteFeed = PealApi.mutation("feeds", "delete");

export const previewFeed = PealApi.mutation("feeds", "preview");
