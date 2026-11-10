import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { MediaAssetId, WorkspaceId } from "#shared/domain/ids.ts";

/** What kind of file a post shows: a PDF is the one document. */
export type MediaPreviewKind = "document" | "image" | "video";

/** An image, a video or a document, as a page shows or links it. */
export interface MediaPreview {
  readonly contentType: string;
  readonly kind: MediaPreviewKind;
  /** Where the file is read from, for a while. Never logged. */
  readonly url: string;
}

/**
 * The files a post under review shows, from the media context: ready media
 * of the post's workspace only, each behind a link that works for two
 * hours. None for a file that is gone, or that the store cannot hand out.
 */
export class MediaPreviews extends Context.Service<
  MediaPreviews,
  {
    readonly of: (
      workspaceId: WorkspaceId,
      mediaId: MediaAssetId
    ) => Effect.Effect<Option.Option<MediaPreview>>;
  }
>()("peal-server/review/application/MediaPreviews") {}
