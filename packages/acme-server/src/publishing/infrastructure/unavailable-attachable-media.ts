import { Effect, Layer } from "effect";

import { AttachableMedia } from "#publishing/application/attachable-media.ts";

/**
 * The media posts may show, until the media context offers a use case that
 * looks assets up by workspace: none, so a post never refers to an asset
 * nobody checked. Swap it for an adapter over that use case.
 */
export const UnavailableAttachableMedia = Layer.succeed(
  AttachableMedia,
  AttachableMedia.of({ lookUp: () => Effect.succeed([]) })
);
