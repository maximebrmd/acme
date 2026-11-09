import { Context, Effect, Layer, Ref } from "effect";

import { Uuid7Schema } from "#shared/domain/ids.ts";
import type { Uuid7 } from "#shared/domain/ids.ts";

/** A kind of id built on `Uuid7`, such as `PostIdSchema`. */
export interface IdKind<Id> {
  readonly make: (uuid: Uuid7) => Id;
}

// The test implementation's ids: valid UUIDv7s whose last group counts up
// from 1, so tests can predict and read them.
const sequentialUuid = (count: number): Uuid7 =>
  Uuid7Schema.make(
    `00000000-0000-7000-8000-${count.toString(16).padStart(12, "0")}`
  );

/** Issues new entity ids, so use cases never call `crypto` or `Bun`. */
export class Ids extends Context.Service<
  Ids,
  {
    /** A new UUIDv7, ordered after every id this service issued before. */
    readonly next: Effect.Effect<Uuid7>;
  }
>()("peal-server/shared/application/Ids") {
  /**
   * Deterministic ids for tests: `00000000-0000-7000-8000-000000000001`, then
   * `…002`, and so on, counting from each build of the layer.
   */
  static readonly layerTest = Layer.effect(
    Ids,
    Ref.make(0).pipe(
      Effect.map((counter) =>
        Ids.of({
          next: Ref.updateAndGet(counter, (count) => count + 1).pipe(
            Effect.map(sequentialUuid)
          ),
        })
      )
    )
  );
}

/** Issues a new id of the given kind: `yield* newId(PostIdSchema)`. */
export const newId = <Id>(kind: IdKind<Id>): Effect.Effect<Id, never, Ids> =>
  Ids.use((ids) => ids.next.pipe(Effect.map((uuid) => kind.make(uuid))));
