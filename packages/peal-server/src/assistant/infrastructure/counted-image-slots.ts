import { Effect, Layer } from "effect";

import { ImageSlots } from "#assistant/application/ports/image-slots.ts";
import { imagesAtOnce } from "#assistant/domain/image-limits.ts";
import { countedSlots } from "#shared/infrastructure/counted-slots.ts";

/**
 * ImageSlots counted in this process: an image is made where its request
 * came, so each server bounds its own memory and connections. The server's
 * model and workspaces' own providers count apart, so neither starves the
 * other.
 */
export const CountedImageSlots = Layer.effect(
  ImageSlots,
  Effect.all({
    server: countedSlots(imagesAtOnce),
    workspace: countedSlots(imagesAtOnce),
  }).pipe(
    Effect.map((pools) =>
      ImageSlots.of({
        take: (workspaceId, source) => pools[source](workspaceId),
      })
    )
  )
);
