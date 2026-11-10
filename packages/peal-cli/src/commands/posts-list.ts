import { Console, Effect, Option } from "effect";
import { Command, Flag } from "effect/cli";
import {
  defaultPostPageSize,
  maxPostPageSize,
  PlatformSchema,
  PostOriginViaSchema,
  PostOutcomeSchema,
  PostPageSchema,
  PostSortSchema,
  PostStatusSchema,
} from "peal-contract";
import type { Post, PostPage } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { columns, excerpt, instant } from "#print.ts";
import { instantOf, zoneFlag } from "#when.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

// A filter the command was given, as the query names it; nothing otherwise.
const given = <A, B extends object>(
  value: Option.Option<A>,
  named: (value: A) => B
) =>
  Option.match(value, {
    onNone: () => ({}),
    onSome: named,
  });

// The instant a flag names, if it was given.
const instantFor = (value: Option.Option<string>, zone: string, flag: string) =>
  Option.match(value, {
    onNone: () => Effect.succeedNone,
    onSome: (written) =>
      instantOf(written, zone, flag).pipe(Effect.map(Option.some)),
  });

// A post on its line: its id, how it ended or where it is, its time, each
// channel's platform with how the post went there, and how it starts.
const rowOf = (post: Post, platforms: ReadonlyMap<string, string>) => [
  `  ${post.id}`,
  post.outcome ?? post.status,
  post.schedule === null ? "no time" : instant(post.schedule.at),
  post.targets.length === 0
    ? "no channel"
    : post.targets
        .map(
          ({ channelId, status }) =>
            // A channel disconnected since has no platform to name.
            `${platforms.get(channelId) ?? `channel ${channelId}`} ${status}`
        )
        .join(", "),
  excerpt(post.content.text),
];

const linesOf = (page: PostPage): string[] => {
  const platforms = new Map(
    page.channels.map(({ channelId, platform }) => [channelId, platform])
  );

  return columns(page.items.map((post) => rowOf(post, platforms)));
};

export const list = Command.make(
  "list",
  {
    author: Flag.String("author").pipe(
      Flag.withMetavar("<user-id>"),
      Flag.withDescription(
        "Only the posts this member created, by their user id, as peal members list shows it."
      ),
      Flag.optional
    ),
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription(
        "Only the posts for this channel, as peal channels list shows its id."
      ),
      Flag.optional
    ),
    createdVia: Flag.Literals("created-via", PostOriginViaSchema.literals).pipe(
      Flag.withDescription(
        "Only the posts created in the web app (web), with an API key (apiKey), or through an application acting for a member, as this command line (application)."
      ),
      Flag.optional
    ),
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription(
        "Where the page before ended, as it printed: give it with the same filters and --sort."
      ),
      Flag.optional
    ),
    from: Flag.String("from").pipe(
      Flag.withMetavar("<instant>"),
      Flag.withDescription(
        "Only the posts whose time is then or later: an instant with its offset, such as 2026-11-20T09:00:00Z, or a local time without one, such as 2026-11-20T10:00, read in --time-zone. Posts without a time are left out."
      ),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many posts a page holds: ${String(defaultPostPageSize)} unless given, at most ${String(maxPostPageSize)}.`
      ),
      Flag.optional
    ),
    outcome: Flag.Literals("outcome", PostOutcomeSchema.literals).pipe(
      Flag.withDescription(
        "Only the posts that ended so: published, partiallyPublished, unconfirmed, failed or cancelled."
      ),
      Flag.optional
    ),
    platform: Flag.Literals("platform", PlatformSchema.literals).pipe(
      Flag.withDescription(
        "Only the posts for a connected channel of this platform."
      ),
      Flag.optional
    ),
    sort: Flag.Literals("sort", PostSortSchema.literals).pipe(
      Flag.withDescription(
        "Their order: by creation (createdDesc, newest first, unless given; createdAsc), or by time (scheduledDesc, scheduledAsc), which lists only the posts with a time."
      ),
      Flag.optional
    ),
    status: Flag.Literals("status", PostStatusSchema.literals).pipe(
      Flag.withDescription(
        "Only the posts that are so: draft, scheduled, publishing, finished or cancelled."
      ),
      Flag.optional
    ),
    timeZone: zoneFlag(
      "The IANA time zone a --from or a --to without an offset is read in, such as Europe/Paris."
    ),
    to: Flag.String("to").pipe(
      Flag.withMetavar("<instant>"),
      Flag.withDescription(
        "Only the posts whose time is before then, written as --from is."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("posts.list")(function* list(input) {
    // A time that cannot be read is refused before a request leaves.
    const from = yield* instantFor(input.from, input.timeZone, "--from");
    const to = yield* instantFor(input.to, input.timeZone, "--to");
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.posts
      .search({
        params: { workspaceId: workspace.id },
        query: {
          ...given(input.author, (authorId) => ({ authorId })),
          ...given(input.channel, (channelId) => ({ channelId })),
          ...given(input.createdVia, (createdVia) => ({ createdVia })),
          ...given(input.cursor, (cursor) => ({ cursor })),
          ...given(from, (instantFrom) => ({ from: instantFrom })),
          ...given(input.limit, (size) => ({
            limit: Math.min(Math.max(size, 1), maxPostPageSize),
          })),
          ...given(input.outcome, (outcome) => ({ outcome })),
          ...given(input.platform, (platform) => ({ platform })),
          ...given(input.sort, (sort) => ({ sort })),
          ...given(input.status, (status) => ({ status })),
          ...given(to, (instantTo) => ({ to: instantTo })),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(PostPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(`No post of ${workspace.name} matches.`);

      return;
    }

    yield* Console.log(`Posts of ${workspace.name}:`);

    for (const line of linesOf(page)) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: the same command with --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's posts, whatever their state, a page at a time: each with its status, or how it ended, its time, and how it went on each channel. Every filter given must hold. peal posts show tells more about one."
  )
);
