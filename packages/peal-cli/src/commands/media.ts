import { Console, Effect, Option, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  ImageAspectSchema,
  imageRequestCost,
  maxImagePromptLength,
  maxMediaPageSize,
  maxMediaQueryLength,
  MediaKindSchema,
  MediaPageSchema,
  MediaQuerySchema,
  MediaSchema,
} from "peal-contract";
import type { Media, MediaKind } from "peal-contract";

import { confirmed, neverAsksInJson, yesFlagName } from "#confirm.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { importAddress, statusOf, uploadFile } from "#media-files.ts";
import { columns, excerpt, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const isMediaQuery = Schema.is(MediaQuerySchema);

// A filter the command was given, as the query names it; nothing otherwise.
const given = <A, B extends object>(
  value: Option.Option<A>,
  named: (value: A) => B
) =>
  Option.match(value, {
    onNone: () => ({}),
    onSome: named,
  });

// What the list was narrowed to, as its heading says it.
const matching = (
  kind: Option.Option<MediaKind>,
  text: Option.Option<string>
) =>
  [
    ...Option.toArray(kind).map((only) => ` (${only}s)`),
    ...Option.toArray(text).map((asked) => ` matching "${asked}"`),
  ].join("");

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

const generate = Command.make(
  "generate",
  {
    aspect: Flag.Literals("aspect", ImageAspectSchema.literals).pipe(
      Flag.withDescription(
        "The image's aspect: square, landscape (wider than tall) or portrait (taller than wide)."
      ),
      Flag.withDefault("square" as const)
    ),
    json: jsonFlag,
    prompt: Flag.String("prompt").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        `What the image should show, 1 to ${String(maxImagePromptLength)} characters: it is sent as it is to the workspace's own image provider, or else to the one the server's operator chose.`
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("media.generate")(function* generate(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const made = yield* client.assistant
      .generateImage({
        params: { workspaceId: workspace.id },
        payload: { aspect: input.aspect, prompt: input.prompt },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(MediaSchema, made);

      return;
    }

    yield* Console.log(
      `Made an image as media ${made.id} in ${workspace.name} (${made.contentType}, ${String(made.byteSize)} bytes): ${statusOf(made)}. It is marked as made by AI: set the platform's AI label in the post's options where it has one, and describe it with --alt when you attach it.`
    );
  })
).pipe(
  Command.withDescription(
    `Have the workspace's own image provider, or else the server's image model, make an image into the workspace's media, marked as made by AI. With the server's model it costs ${String(imageRequestCost)} of the workspace's daily assistant requests, with the workspace's own provider none; without either it is refused.`
  )
);

const show = Command.make(
  "show",
  {
    json: jsonFlag,
    mediaId: Argument.String("media-id").pipe(
      Argument.withDescription("The media, as peal media list shows its id.")
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("media.show")(function* show({ json, mediaId, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const found = yield* client.media
      .get({ params: { mediaId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (json) {
      yield* printJson(MediaSchema, found);

      return;
    }

    yield* Console.log(
      `Media ${found.id} of ${workspace.name} (${found.contentType}, ${String(found.byteSize)} bytes), stored ${instant(found.createdAt)}: ${statusOf(found)}.`
    );

    if (found.altText !== null) {
      yield* Console.log(`  ${excerpt(found.altText)}`);
    }
  })
).pipe(
  Command.withDescription(
    "Show one image or video: its type, its size, and whether it is ready to attach, which a video is once Peal probed it."
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
    kind: Flag.Literals("kind", MediaKindSchema.literals).pipe(
      Flag.withDescription(
        "Only the media of this kind: image, video or document."
      ),
      Flag.optional
    ),
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many media a page holds, at most ${String(maxMediaPageSize)}.`
      ),
      Flag.optional
    ),
    search: Flag.String("search").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        `Only the media whose file name or description holds this text, whatever its case: ${String(maxMediaQueryLength)} characters at most. A file added before Peal kept names is found by its description only.`
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("media.list")(function* list(input) {
    const text = input.search.pipe(Option.map((written) => written.trim()));

    // Text the search would not take is refused before a request leaves.
    yield* Option.exists(text, (written) => !isMediaQuery(written))
      ? Effect.fail(
          new Refused({
            reason: `--search takes 1 to ${String(maxMediaQueryLength)} characters, without a NUL.`,
          })
        )
      : Effect.void;

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.media
      .list({
        params: { workspaceId: workspace.id },
        query: {
          ...given(input.cursor, (cursor) => ({ cursor })),
          ...given(input.kind, (kind) => ({ kind })),
          ...given(input.limit, (size) => ({
            limit: Math.min(Math.max(size, 1), maxMediaPageSize),
          })),
          ...given(text, (q) => ({ q })),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(MediaPageSchema, page);

      return;
    }

    const filtered = Option.isSome(text) || Option.isSome(input.kind);

    if (page.items.length === 0) {
      yield* Console.log(
        filtered
          ? `${workspace.name} has no media that match.`
          : `${workspace.name} has no media.`
      );

      return;
    }

    yield* Console.log(
      `Media of ${workspace.name}${matching(input.kind, text)}, newest first:`
    );

    for (const line of columns(
      page.items.map((media) => [
        `  ${media.id}`,
        media.contentType,
        `${String(media.byteSize)} bytes`,
        statusOf(media),
        instant(media.createdAt),
        media.fileName ?? "",
        media.altText === null ? "" : excerpt(media.altText),
      ])
    )) {
      yield* Console.log(line);
    }

    if (page.nextCursor !== null) {
      yield* Console.log(
        filtered
          ? `More: the same command with --cursor ${page.nextCursor}`
          : `More: peal media list --workspace ${workspace.slug} --cursor ${page.nextCursor}`
      );
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's images, videos and documents, newest first, with the ids posts attach, whether each is ready, its file name and its description. --search and --kind narrow the list, every filter holding."
  )
);

const mediaArgument = Argument.String("media-id").pipe(
  Argument.withDescription("The media, as peal media list shows its id.")
);

const describe = Command.make(
  "describe",
  {
    clear: Flag.Boolean("clear").pipe(
      Flag.withDescription("Remove the description instead."),
      Flag.withDefault(false)
    ),
    json: jsonFlag,
    mediaId: mediaArgument,
    text: Flag.String("text").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        "What it shows, for people who cannot see it: platforms show it with the post, and each post that attaches the file starts from it."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("media.describe")(function* describe(input) {
    if (input.clear === Option.isSome(input.text)) {
      return yield* new Refused({
        reason:
          "Give the description with --text, or --clear to remove it: one of them.",
      });
    }

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const described = yield* client.media
      .describe({
        params: { mediaId: input.mediaId, workspaceId: workspace.id },
        payload: { altText: Option.getOrNull(input.text) },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      return yield* printJson(MediaSchema, described);
    }

    return yield* Console.log(
      described.altText === null
        ? `Media ${described.id} has no description now.`
        : `Described media ${described.id}: ${excerpt(described.altText)}. Posts that already attached it keep the alt text they have.`
    );
  })
).pipe(
  Command.withDescription(
    "Set or remove a media's description, its alt text, which platforms show to people who cannot see the file."
  )
);

const remove = Command.make(
  "delete",
  {
    json: jsonFlag,
    mediaId: mediaArgument,
    workspace: workspaceFlag,
    yes: Flag.Boolean(yesFlagName).pipe(
      Flag.withDescription(
        "The person who decides agreed to delete the file for good: do not ask again."
      ),
      Flag.withDefault(false)
    ),
  },
  Effect.fn("media.delete")(function* remove(input) {
    yield* neverAsksInJson({
      json: input.json,
      why: "it deletes the file for good, and drafts that show it lose it",
      yes: input.yes,
    });

    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const params = { mediaId: input.mediaId, workspaceId: workspace.id };

    const usage = yield* client.media
      .usage({ params })
      .pipe(Effect.mapError(explain(url)));

    if (!input.json) {
      yield* Console.log(
        `This deletes media ${input.mediaId} of ${workspace.name} for good.${usage.drafts.length === 0 ? "" : ` ${String(usage.drafts.length)} ${usage.drafts.length === 1 ? "draft shows it and loses it" : "drafts show it and lose it"}: ${usage.drafts.join(", ")}.`}`
      );
    }

    yield* confirmed({ question: "Delete it?", yes: input.yes });

    yield* client.media.delete({ params }).pipe(Effect.mapError(explain(url)));

    yield* input.json
      ? printNothing
      : Console.log(`Deleted media ${input.mediaId}.`);
  })
).pipe(
  Command.withDescription(
    "Delete a media for good: drafts that show it lose it, and a post that is scheduled or being published keeps it from going. Asks first; --yes otherwise."
  )
);

export const media = Command.make("media").pipe(
  Command.withDescription(
    "A workspace's images and videos: uploading files, importing them from an address, having the assistant make an image, listing them, showing, describing and deleting one."
  ),
  Command.withSubcommands([
    upload,
    importMedia,
    generate,
    list,
    show,
    describe,
    remove,
  ])
);
