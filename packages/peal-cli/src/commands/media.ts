import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { maxMediaPageSize, MediaPageSchema, MediaSchema } from "peal-contract";
import type { Media } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { importAddress, statusOf, uploadFile } from "#media-files.ts";
import { columns, excerpt, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const altFlag = Flag.String("alt").pipe(
  Flag.withMetavar("<text>"),
  Flag.withDescription(
    "What it shows, for people who cannot see it: platforms show it with the post."
  ),
  Flag.optional
);

// A stored media, as the user reads it or as the API answered it.
const stored = (media: Media, from: string, where: string, json: boolean) =>
  json
    ? printJson(MediaSchema, media)
    : Console.log(
        `Stored ${from} as media ${media.id} in ${where} (${media.contentType}, ${String(media.byteSize)} bytes): ${statusOf(media)}.`
      );

const upload = Command.make(
  "upload",
  {
    altText: altFlag,
    file: Argument.String("file").pipe(
      Argument.withDescription(
        "The image, video or document to upload: JPEG, PNG, GIF or WebP up to 16 MiB, MP4 or QuickTime up to 1 GiB, PDF up to 100 MiB and 300 pages, told by its extension."
      )
    ),
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("media.upload")(function* upload(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const media = yield* uploadFile(
      { client, url, workspaceId: workspace.id },
      input.file,
      input.altText
    );

    yield* stored(media, input.file, workspace.name, input.json);
  })
).pipe(
  Command.withDescription(
    "Upload a file to the workspace's media: it goes straight to the media store, then Peal checks and probes it. Its id is what posts attach."
  )
);

const importMedia = Command.make(
  "import",
  {
    address: Argument.String("url").pipe(
      Argument.withDescription(
        "An https address anyone can fetch, without credentials: the server fetches it itself, within 90 seconds."
      )
    ),
    altText: altFlag,
    json: jsonFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("media.import")(function* importMedia(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const media = yield* importAddress(
      { client, url, workspaceId: workspace.id },
      input.address,
      input.altText
    );

    yield* stored(media, input.address, workspace.name, input.json);
  })
).pipe(
  Command.withDescription(
    "Have the server fetch an image or a video from a public https address into the workspace's media. Upload larger or slower files instead."
  )
);

const list = Command.make(
  "list",
  {
    cursor: Flag.String("cursor").pipe(
      Flag.withMetavar("<cursor>"),
      Flag.withDescription("Where the page before ended, as it printed."),
      Flag.optional
    ),
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many media a page holds, at most ${String(maxMediaPageSize)}.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("media.list")(function* list(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.media
      .list({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(input.cursor, {
            onNone: () => ({}),
            onSome: (after) => ({ cursor: after }),
          }),
          ...Option.match(input.limit, {
            onNone: () => ({}),
            onSome: (size) => ({
              limit: Math.min(Math.max(size, 1), maxMediaPageSize),
            }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(MediaPageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(`${workspace.name} has no media.`);

      return;
    }

    yield* Console.log(`Media of ${workspace.name}, newest first:`);

    for (const line of columns(
      page.items.map((media) => [
        `  ${media.id}`,
        media.contentType,
        `${String(media.byteSize)} bytes`,
        statusOf(media),
        instant(media.createdAt),
        media.altText === null ? "" : excerpt(media.altText),
      ])
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        `More: peal media list --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's images and videos, newest first, with the ids posts attach and whether each is ready."
  )
);

export const media = Command.make("media").pipe(
  Command.withDescription(
    "A workspace's images and videos: uploading files, importing them from an address, and listing them."
  ),
  Command.withSubcommands([upload, importMedia, list])
);
