import { DateTime, Effect, Option } from "effect";

import { MediaAssets } from "#media/application/ports/media-assets.ts";
import { altTextOf } from "#media/domain/alt-text.ts";
import type { MediaAssetId } from "#media/domain/media-asset-id.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/** The description to give an asset. */
export interface DescribeMediaRequest {
  /** As the person typed it; none or blank removes it. */
  readonly altText: Option.Option<string>;
  readonly assetId: MediaAssetId;
  readonly workspaceId: WorkspaceId;
}

/**
 * Saves an asset's description, whatever its status, so it can be written
 * while the file uploads.
 */
export const describeMedia = Effect.fn("Media.describeMedia")(
  function* describeMedia({
    altText,
    assetId,
    workspaceId,
  }: DescribeMediaRequest) {
    const description = yield* Effect.fromResult(
      altTextOf(Option.getOrElse(altText, () => ""))
    );

    const now = yield* DateTime.now;

    return yield* MediaAssets.use((assets) =>
      assets.describe(workspaceId, assetId, description, now)
    );
  }
);
