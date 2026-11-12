import { Effect, Layer, Option } from "effect";

import { RecyclingActors } from "#publishing/application/recycling-actors.ts";
import type { RuleStarter } from "#publishing/application/recycling-actors.ts";
import { ActorsNow } from "#workspace/application/actors-now.ts";
import type { ActorStanding } from "#workspace/application/actors-now.ts";

const gone: RuleStarter = { _tag: "gone" };

const starterOf = (standing: ActorStanding): RuleStarter => standing;

/**
 * RecyclingActors from the workspace context, which resolves a rule's
 * starter as a request of theirs would be resolved now (`ActorsNow`): a
 * member by the id the rule kept, an application by its client id and the
 * member it acts for, a key, the workspace's or its partner's, by its id.
 * A member forgotten since (their account closed) is gone.
 */
export const WorkspaceRecyclingActors = Layer.effect(
  RecyclingActors,
  Effect.gen(function* WorkspaceRecyclingActors() {
    const actors = yield* ActorsNow;

    return RecyclingActors.of({
      of: ({ startedBy, startedVia, workspaceId }) => {
        if (startedVia._tag === "apiKey") {
          return actors
            .ofKey(startedVia.apiKeyId, workspaceId)
            .pipe(Effect.map(starterOf));
        }

        return Option.match(startedBy, {
          onNone: () => Effect.succeed(gone),
          onSome: (userId) =>
            (startedVia._tag === "application"
              ? actors.ofApplication(userId, startedVia.clientId, workspaceId)
              : actors.ofMember(userId, workspaceId)
            ).pipe(Effect.map(starterOf)),
        });
      },
    });
  })
);
