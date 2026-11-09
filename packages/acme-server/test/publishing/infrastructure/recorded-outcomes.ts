import { Context, Effect, Layer, Ref } from "effect";

import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";

/** The settled targets publishing told PublicationOutcomes about, in order. */
export class Outcomes extends Context.Service<
  Outcomes,
  { readonly told: Effect.Effect<readonly PostTarget[]> }
>()("test/publishing/Outcomes") {}

/** PublicationOutcomes recording what it is told, which Outcomes reads. */
export const RecordingPublicationOutcomes = Layer.effectContext(
  Effect.gen(function* RecordingPublicationOutcomes() {
    const told = yield* Ref.make<readonly PostTarget[]>([]);

    return Context.make(
      PublicationOutcomes,
      PublicationOutcomes.of({
        settled: (target) =>
          Ref.update(told, (targets) => [...targets, target]),
      })
    ).pipe(Context.add(Outcomes, { told: Ref.get(told) }));
  })
);
