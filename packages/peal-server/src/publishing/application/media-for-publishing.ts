import { Context } from "effect";
import type { Duration, Effect, Option, Stream } from "effect";

import type { MediaAssetId, WorkspaceId } from "#shared/domain/ids.ts";
import type { MediaRejected } from "#shared/domain/media-rejected.ts";
import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

/** An image or a video of a post, as it goes out. */
export interface PublishableMedia {
  readonly byteSize: number;
  /** Its MIME type, such as `image/png`. */
  readonly contentType: string;
  /** Width and height as displayed, when known. */
  readonly dimensions: Option.Option<{
    readonly height: number;
    readonly width: number;
  }>;
  readonly duration: Option.Option<Duration.Duration>;
  /** A file name with the extension of its format. */
  readonly fileName: string;
  readonly kind: "image" | "video";
  readonly mediaId: MediaAssetId;
}

/**
 * Why media cannot go out: it is gone, or no longer ready (`MediaRejected`
 * with the code `ownRefusalCodes.mediaRemoved`), or the media store did not answer
 * (`PlatformUnavailable`, worth trying again). Either way, nothing was sent.
 */
export type MediaFailure = MediaRejected | PlatformUnavailable;

/**
 * The media a post shows, from the media context: only ready assets of the
 * post's workspace. Platforms that take uploads read the bytes; those that
 * fetch media themselves get a URL that works for a while.
 */
export class MediaForPublishing extends Context.Service<
  MediaForPublishing,
  {
    readonly describe: (
      workspaceId: WorkspaceId,
      mediaId: MediaAssetId
    ) => Effect.Effect<PublishableMedia, MediaFailure>;
    /** The bytes, as the store sends them. */
    readonly open: (
      workspaceId: WorkspaceId,
      mediaId: MediaAssetId
    ) => Stream.Stream<Uint8Array, MediaFailure>;
    /** A URL anyone can GET the media from for at least `expiresIn`. */
    readonly publicUrl: (
      workspaceId: WorkspaceId,
      mediaId: MediaAssetId,
      expiresIn: Duration.Duration
    ) => Effect.Effect<string, MediaFailure>;
  }
>()("acme-server/publishing/application/MediaForPublishing") {}
