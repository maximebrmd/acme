import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  CurrentMember,
  maxMediaPageSize,
  maxMediaUrlLength,
  mediaImportSeconds,
  MediaPageSchema,
  MediaSchema,
} from "peal-contract";

import { changing, reading } from "#app/mcp/annotations.ts";
import { ToolRefused } from "#app/mcp/tool-refused.ts";

export const ListMedia = Tool.make("list_media", {
  dependencies: [CurrentMember],
  description: `Lists the workspace's images and videos, newest first, with their type, size, dimensions, duration and description, and where each can be viewed for an hour (\`url\`). Only media whose status is \`ready\` can be attached to a post, by its \`id\`. Answers 30 a page unless \`limit\` (at most ${String(maxMediaPageSize)}) says otherwise; pass \`nextCursor\` as \`cursor\` for the next page.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    cursor: Schema.optionalKey(Schema.String),
    limit: Schema.optionalKey(
      Schema.Int.check(
        Schema.isBetween({ maximum: maxMediaPageSize, minimum: 1 })
      )
    ),
  }),
  success: MediaPageSchema,
})
  .annotateMerge(reading)
  .annotate(Tool.Title, "List media");

export const ImportMedia = Tool.make("import_media", {
  dependencies: [CurrentMember],
  description: `Fetches an image or a video from a public HTTPS address and adds it to the workspace's media: the Peal server downloads it itself, without credentials (an address that needs a sign-in, a cookie or a private network is refused), follows at most three redirects, and takes JPEG, PNG, GIF and WebP images up to 16 MiB and MP4 and QuickTime videos up to 1 GiB, read from the file itself whatever its name. It must arrive within ${String(mediaImportSeconds)} seconds. The answer is the media: attach it to a post by its \`id\` once its status is \`ready\`. Give \`altText\`, what it shows, for people who cannot see it. It adds a file to the workspace's storage, which counts against its plan, and publishes nothing; each call adds a new file, so do not call it again for the same address unless the first call failed.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    altText: Schema.optionalKey(Schema.String),
    url: Schema.String.check(Schema.isBetweenLength(1, maxMediaUrlLength)),
  }),
  success: MediaSchema,
})
  // It reads an address outside Peal, and adds to the workspace.
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Import media from a URL");

/** The tools that read and add to the workspace's media. */
export const MediaTools = Toolkit.make(ListMedia, ImportMedia);
