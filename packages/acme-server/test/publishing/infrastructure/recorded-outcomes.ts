import { Context, Effect, Layer, Ref } from "effect";

import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";

/**
 * The settled targets publishing told PublicationOutcomes about, in order,
 * and the rounds members resolved.
 */
export class Outcomes extends Context.Service<
  Outcomes,
  {
    readonly resolved: Effect.Effect<readonly PostTarget[]>;
    readonly told: Effect.Effect<readonly PostTarget[]>;
  }
>()("test/publishing/Outcomes") {}

/** PublicationOutcomes recording what it is told, which Outcomes reads. */
export const RecordingPublicationOutcomes = Layer.effectContext(
  Effect.gen(function* RecordingPublicationOutcomes() {
    const told = yield* Ref.make<readonly PostTarget[]>([]);
    const resolved = yield* Ref.make<readonly PostTarget[]>([]);

    return Context.make(
      PublicationOutcomes,
      PublicationOutcomes.of({
        resolved: (target) =>
          Ref.update(resolved, (targets) => [...targets, target]),
        settled: (target) =>
          Ref.update(told, (targets) => [...targets, target]),
      })
    ).pipe(
      Context.add(Outcomes, {
        resolved: Ref.get(resolved),
        told: Ref.get(told),
      })
    );
  })
);
