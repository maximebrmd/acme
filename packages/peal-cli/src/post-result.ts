import { Console, Effect } from "effect";
import { PostSchema } from "peal-contract";
import type { Post } from "peal-contract";

import { printJson } from "#json.ts";
import { instant } from "#print.ts";
import { channelNames, named } from "#workspace.ts";

/** The channels a post goes out on, as people recognize them. */
export const channelsOf = (
  post: Post,
  names: ReadonlyMap<string, string>
): string =>
  post.targets.length === 0
    ? "no channel"
    : post.targets.map(({ channelId }) => named(names, channelId)).join(", ");

/** A post's time, as the command line prints it, with its zone. */
export const timeOf = (post: Post): string =>
  post.schedule === null
    ? "no time"
    : `${instant(post.schedule.at)} (${post.schedule.timeZone})`;

/**
 * What to say of a post the workspace holds for an approval: it has its
 * time and goes out at no time until a person approves it. The command
 * line is an application, so what it sends waits wherever applications'
 * posts do.
 */
export const heldLine = (post: Post): string =>
  `Post ${post.id} waits for an approval, for ${timeOf(post)}: this workspace asks that a person approve it first, and nothing goes out until then. peal approvals list shows the posts that wait; a member approves it in the web app, or a reviewer through a link (peal review link ${post.id}). Approved after its time, it is a draft again.`;

/**
 * A post the API answered: as JSON, or the line that says what was done,
 * unless the post waits for an approval, which is said instead.
 */
export const printPost = (post: Post, json: boolean, line: () => string) => {
  if (json) {
    return printJson(PostSchema, post);
  }

  return Console.log(
    post.status === "awaitingApproval" ? heldLine(post) : line()
  );
};

/** The names of a post's channels, which only the lines people read need. */
export const namesFor = (
  json: boolean,
  client: Parameters<typeof channelNames>[0],
  workspaceId: string
) =>
  json
    ? Effect.succeed<ReadonlyMap<string, string>>(new Map())
    : channelNames(client, workspaceId);
