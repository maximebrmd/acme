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

/** A post the API answered: as JSON, or the line that says what was done. */
export const printPost = (post: Post, json: boolean, line: () => string) =>
  json ? printJson(PostSchema, post) : Console.log(line());

/** The names of a post's channels, which only the lines people read need. */
export const namesFor = (
  json: boolean,
  client: Parameters<typeof channelNames>[0],
  workspaceId: string
) =>
  json
    ? Effect.succeed<ReadonlyMap<string, string>>(new Map())
    : channelNames(client, workspaceId);
