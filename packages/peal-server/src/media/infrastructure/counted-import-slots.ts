import { Effect, Layer } from "effect";

import { ImportSlots } from "#media/application/ports/import-slots.ts";
import { importsAtOnce } from "#media/domain/import-limits.ts";
import { countedSlots } from "#shared/infrastructure/counted-slots.ts";

/**
 * ImportSlots counted in this process: the imports run where their request
 * came, so each server bounds its own memory and connections.
 */
export const CountedImportSlots = Layer.effect(
  ImportSlots,
  countedSlots(importsAtOnce).pipe(
    Effect.map((take) => ImportSlots.of({ take }))
  )
);
