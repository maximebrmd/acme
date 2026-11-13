import { Effect, Layer } from "effect";

import { TextSlots } from "#assistant/application/ports/text-slots.ts";
import { ownTextAtOnce } from "#assistant/domain/text-provider.ts";
import { countedSlots } from "#shared/infrastructure/counted-slots.ts";

/**
 * TextSlots counted in this process: a request runs where it came, so each
 * server bounds its own connections and memory.
 */
export const CountedTextSlots = Layer.effect(
  TextSlots,
  countedSlots(ownTextAtOnce).pipe(Effect.map((take) => TextSlots.of({ take })))
);
