import { Schema } from "effect";
import { Tool, Toolkit } from "effect/ai";
import {
  CurrentMember,
  ImageAspectSchema,
  imageRequestCost,
  maxImagePromptLength,
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
  description: `Lists the workspace's images and videos, newest first, with their type, size, dimensions, duration and description, whether the assistant made the file (\`aiGenerated\`), and where each can be viewed for an hour (\`url\`). Only media whose status is \`ready\` can be attached to a post, by its \`id\`. Before attaching a file made by AI, set the platform's AI label in the post's options where it has one (YouTube \`containsSyntheticMedia\`, TikTok \`aiGenerated\`, X \`madeWithAi\`): Peal sets none on its own. Answers 30 a page unless \`limit\` (at most ${String(maxMediaPageSize)}) says otherwise; pass \`nextCursor\` as \`cursor\` for the next page.`,
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
  description: `Fetches an image, a video or a PDF document from a public HTTPS address and adds it to the workspace's media: the Peal server downloads it itself, without credentials (an address that needs a sign-in, a cookie or a private network is refused), follows at most three redirects, and takes JPEG, PNG, GIF and WebP images up to 16 MiB, MP4 and QuickTime videos up to 1 GiB, and PDF documents up to 100 MiB and 300 pages (which only LinkedIn shows), read from the file itself whatever its name. It must arrive within ${String(mediaImportSeconds)} seconds. The answer is the media: attach it to a post by its \`id\` once its status is \`ready\`. Give \`altText\`, what it shows, for people who cannot see it. It adds a file to the workspace's storage, which counts against its plan, and publishes nothing; each call adds a new file, so do not call it again for the same address unless the first call failed.`,
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

export const GenerateImage = Tool.make("generate_image", {
  dependencies: [CurrentMember],
  description: `Makes one image from a description and adds it to the workspace's media, ready to attach to a post by its \`id\`. The \`prompt\` (1 to ${String(maxImagePromptLength)} characters, what the image should show) is sent as it is to the image provider the workspace set up for itself, when it has one, and otherwise to the one this Peal server's operator chose: put nothing in it the user would not send there. With the workspace's own provider, a call spends none of the workspace's daily assistant requests; with the server's, it spends ${String(imageRequestCost)} of them (given back only when the provider could not be reached). Either way it adds a file to the workspace's storage, which counts against its plan, and makes a new image, so call it once per image the user asked for. The file is stored as the provider made it and marked \`aiGenerated\`, without a description: when attaching it, say what it shows in the attachment's \`altText\`, and set the platform's AI label in the post's options (YouTube \`containsSyntheticMedia\`, TikTok \`aiGenerated\`, X \`madeWithAi\`). \`aspect\` is \`square\` (the default), \`landscape\` or \`portrait\`. It publishes nothing. A workspace without its own provider, on a server without an image model, is refused.`,
  failure: ToolRefused,
  parameters: Schema.Struct({
    aspect: Schema.optionalKey(ImageAspectSchema),
    prompt: Schema.String.check(
      Schema.isBetweenLength(1, maxImagePromptLength)
    ),
  }),
  success: MediaSchema,
})
  // It asks a provider outside Peal, and adds to the workspace.
  .annotateMerge(
    changing({ destructive: false, idempotent: false, openWorld: true })
  )
  .annotate(Tool.Title, "Generate an image");

/** The tools that read and add to the workspace's media. */
export const MediaTools = Toolkit.make(ListMedia, ImportMedia, GenerateImage);
