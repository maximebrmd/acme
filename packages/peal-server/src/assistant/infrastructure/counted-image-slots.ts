import { Effect, Layer } from "effect";

import { ImageSlots } from "#assistant/application/ports/image-slots.ts";
import { imagesAtOnce } from "#assistant/domain/image-limits.ts";
import { countedSlots } from "#shared/infrastructure/counted-slots.ts";

/**
 * ImageSlots counted in this process: an image is made where its request
 * came, so each server bounds its own memory and connections.
 */
export const CountedImageSlots = Layer.effect(
  ImageSlots,
  countedSlots(imagesAtOnce).pipe(Effect.map((take) => ImageSlots.of({ take })))
);
