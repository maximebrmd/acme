import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { ImageFailed } from "#assistant/application/image-failed.ts";
import type { ImageNotStored } from "#assistant/application/image-not-stored.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

/**
 * An image the assistant made, as the media library keeps it: ready to
 * attach to a post, marked as made by AI, without a description (the
 * prompt says what was asked, not what the picture shows).
 */
export interface GeneratedImage {
  readonly aiGenerated: true;
  readonly altText: null;
  readonly byteSize: number;
  readonly codec: null;
  readonly contentType: "image/gif" | "image/jpeg" | "image/png" | "image/webp";
  readonly createdAt: DateTime.Utc;
  readonly dimensions: {
    readonly height: number;
    readonly width: number;
  } | null;
  readonly durationMs: null;
  /** A file the assistant made was never called anything. */
  readonly fileName: null;
  readonly id: string;
  readonly kind: "image";
  readonly pageCount: null;
  readonly status: { readonly _tag: "ready" };
  readonly updatedAt: DateTime.Utc;
  /** Where the file can be read for a while. */
  readonly url: string | null;
}

/**
 * Where the images the assistant makes are kept: the media library of the
 * actor's workspace, which checks its own permission (media:upload).
 */
export class GeneratedImages extends Context.Service<
  GeneratedImages,
  {
    /**
     * Fails when the workspace's storage has no room for the largest
     * image the library takes: asked before an image is made.
     */
    readonly roomFor: (
      actor: Actor
    ) => Effect.Effect<void, MissingPermission | PlanLimitReached>;
    /**
     * Keeps the bytes as they came. Bytes that are not an image the
     * library takes fail with `ImageFailed` `unusableAnswer`, and nothing
     * of them is kept.
     */
    readonly store: (
      actor: Actor,
      bytes: Uint8Array
    ) => Effect.Effect<
      GeneratedImage,
      ImageFailed | ImageNotStored | MissingPermission | PlanLimitReached
    >;
  }
>()("peal-server/assistant/application/GeneratedImages") {}
