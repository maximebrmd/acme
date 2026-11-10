import { Duration, Match, Option } from "effect";
import type {
  Media as MediaView,
  MediaStatus as MediaStatusView,
} from "peal-contract";

import type { MediaItem } from "#media/application/use-cases/view-media.ts";
import type { MediaAsset } from "#media/domain/media-asset.ts";
import type { MediaStatus } from "#media/domain/media-status.ts";

// Clients see the status without the store's upload ids.
const statusView = (status: MediaStatus): MediaStatusView =>
  Match.valueTags(status, {
    pending: (): MediaStatusView => ({ _tag: "pending" }),
    ready: (): MediaStatusView => ({ _tag: "ready" }),
    rejected: ({ reason }): MediaStatusView => ({ _tag: "rejected", reason }),
    uploaded: ({ probe }): MediaStatusView => ({ _tag: "uploaded", probe }),
  });

/** What clients see of an asset, with where its file can be read. */
export const toView = (
  asset: MediaAsset,
  url: Option.Option<string>
): MediaView => ({
  altText: Option.getOrNull(asset.altText),
  byteSize: asset.byteSize,
  codec: Option.getOrNull(asset.metadata.codec),
  contentType: asset.contentType,
  createdAt: asset.createdAt,
  dimensions: Option.getOrNull(asset.metadata.dimensions),
  durationMs: asset.metadata.duration.pipe(
    Option.map((duration) => Math.round(Duration.toMillis(duration))),
    Option.getOrNull
  ),
  id: asset.id,
  kind: asset.kind,
  pageCount: Option.getOrNull(asset.metadata.pages),
  status: statusView(asset.status),
  updatedAt: asset.updatedAt,
  url: Option.getOrNull(url),
});

/** What clients see of an asset as the library answers it. */
export const itemView = ({ asset, url }: MediaItem): MediaView =>
  toView(asset, url);
