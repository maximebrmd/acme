import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { MediaAssetId, WorkspaceId } from "#shared/domain/ids.ts";

/** An image or a video, as a page shows it. */
export interface MediaPreview {
  readonly contentType: string;
  readonly kind: "image" | "video";
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
