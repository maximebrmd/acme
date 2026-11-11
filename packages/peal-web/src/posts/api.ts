import type { DateTime } from "effect";
import { Effect, Option } from "effect";
import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

import type { LookupItems } from "./lookup-choices.ts";

// The queries and mutations of the composer and the calendar. A mutation
// passes `reactivityKeys: postsKeys`, which refreshes every posts query.

export const postsKeys = ["posts"];

/** The channels connected to the workspace. */
export const workspaceChannels = (workspaceId: string) =>
  PealApi.query("channels", "list", {
    params: { workspaceId },
    reactivityKeys: ["channels"],
  });

/**
 * A TikTok channel's creator, read from TikTok each time the composer
 * opens the channel's options, as TikTok's guidelines ask.
 */
export const tiktokCreator = (workspaceId: string, channelId: string) =>
  PealApi.query("tiktok", "creator", {
    params: { channelId, workspaceId },
    reactivityKeys: ["channels"],
  });

/**
 * What a post on one channel may hold, its account's restrictions
 * included: the composer reads which Bluesky gates a channel can set.
 */
export const channelCapabilities = (workspaceId: string, channelId: string) =>
  PealApi.query("capabilities", "channel", {
    params: { channelId, workspaceId },
    reactivityKeys: ["channels"],
  });

// A lookup's page holds 50 items at most; the composer reads ten pages.
const lookupPageSize = 50;

const lookupPages = 10;

interface LookupPage<Item> {
  readonly items: readonly Item[];
  readonly nextCursor: string | null;
}

// Every page of a paged lookup, the first ten at most. A page may come
// empty and still name a next one.
const everyPage = Effect.fnUntraced(function* everyPage<Item, E, R>(
  read: (cursor: string | null) => Effect.Effect<LookupPage<Item>, E, R>
) {
  const items: Item[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < lookupPages; page += 1) {
    const answer: LookupPage<Item> = yield* read(cursor);

    items.push(...answer.items);
    cursor = answer.nextCursor;

    if (cursor === null) {
      break;
    }
  }

  const all: LookupItems<Item> = { items, truncated: cursor !== null };

  return all;
});

const paged = (cursor: string | null) =>
  cursor === null
    ? { limit: lookupPageSize }
    : { cursor, limit: lookupPageSize };

// Ids are UUIDs and digits, so a slash cannot appear in any.
const boardLists = Atom.family((key: string) => {
  const [workspaceId = "", channelId = ""] = key.split("/");

  return PealApi.runtime.atom(
    PealApi.use((client) =>
      everyPage((cursor) =>
        client.lookups
          .run({
            params: { channelId, name: "pinterestBoards", workspaceId },
            payload: paged(cursor),
          })
          .pipe(
            Effect.map((result) =>
              result._tag === "pinterestBoards"
                ? result
                : { items: [], nextCursor: null }
            )
          )
      )
    )
  );
});

/**
 * A Pinterest channel's boards, read from Pinterest each time the composer
 * opens the channel's options.
 */
export const pinterestBoards = (workspaceId: string, channelId: string) =>
  boardLists(`${workspaceId}/${channelId}`);

const noSections: LookupPage<{ readonly id: string; readonly name: string }> = {
  items: [],
  nextCursor: null,
};

const sectionLists = Atom.family((key: string) => {
  const [workspaceId = "", channelId = "", boardId = ""] = key.split("/");

  return PealApi.runtime.atom(
    PealApi.use((client) =>
      everyPage((cursor) =>
        boardId === ""
          ? Effect.succeed(noSections)
          : client.lookups
              .run({
                params: {
                  channelId,
                  name: "pinterestBoardSections",
                  workspaceId,
                },
                payload: { ...paged(cursor), boardId },
              })
              .pipe(
                Effect.map((result) =>
                  result._tag === "pinterestBoardSections"
                    ? result
                    : { items: [], nextCursor: null }
                )
              )
      )
    )
  );
});

/**
 * The sections of one board of a Pinterest channel: none, unasked, while
 * no board is chosen.
 */
export const pinterestBoardSections = (
  workspaceId: string,
  channelId: string,
  boardId: string
) => sectionLists(`${workspaceId}/${channelId}/${boardId}`);

/** A post of the workspace. */
export const workspacePost = (workspaceId: string, postId: string) =>
  PealApi.query("posts", "get", {
    params: { postId, workspaceId },
    reactivityKeys: postsKeys,
  });

/** The posts scheduled from `from` to `to`. */
export const scheduledPosts = (
  workspaceId: string,
  from: DateTime.Utc,
  to: DateTime.Utc
) =>
  PealApi.query("posts", "list", {
    params: { workspaceId },
    query: { from, to },
    reactivityKeys: postsKeys,
  });

/** What a post's attempts were, refreshed with the other posts queries. */
export const postAttempts = (workspaceId: string, postId: string) =>
  PealApi.query("posts", "attempts", {
    params: { postId, workspaceId },
    reactivityKeys: postsKeys,
  });

// Post ids and cursors are UUIDs, so a slash cannot appear in either.
const draftPageKey = (workspaceId: string, cursor: Option.Option<string>) =>
  `${workspaceId}/${Option.getOrElse(cursor, () => "")}`;

const draftPages = Atom.family((key: string) => {
  const [workspaceId = "", cursor = ""] = key.split("/");

  return PealApi.query("posts", "drafts", {
    params: { workspaceId },
    query: cursor === "" ? {} : { cursor },
    reactivityKeys: postsKeys,
  });
});

/** A page of the workspace's drafts, newest first: the first, or the one at `cursor`. */
export const draftPage = (workspaceId: string, cursor: Option.Option<string>) =>
  draftPages(draftPageKey(workspaceId, cursor));

export const createPost = PealApi.mutation("posts", "create");

export const updatePost = PealApi.mutation("posts", "update");

export const schedulePost = PealApi.mutation("posts", "schedule");

export const reschedulePost = PealApi.mutation("posts", "reschedule");

export const cancelPost = PealApi.mutation("posts", "cancel");

export const unschedulePost = PealApi.mutation("posts", "unschedule");

export const discardPost = PealApi.mutation("posts", "discard");

/** Makes a new draft that says what a post says, whatever its status. */
export const duplicatePost = PealApi.mutation("posts", "duplicate");

export const repostTarget = PealApi.mutation("posts", "repost");

export const confirmTarget = PealApi.mutation("posts", "confirm");

/** Deletes a published post from one channel's platform, for everyone. */
export const unpublishTarget = PealApi.mutation("posts", "unpublishTarget");

/** What was asked of a post once it was live, newest first. */
export const postChanges = (workspaceId: string, postId: string) =>
  PealApi.query("posts", "changes", {
    params: { postId, workspaceId },
    reactivityKeys: postsKeys,
  });
