import { Effect, Layer, Option } from "effect";

import { RuleStarters } from "#engagement/application/ports/rule-starters.ts";
import type { CommentRuleStarter } from "#engagement/application/ports/rule-starters.ts";
import { ActorsNow } from "#workspace/application/actors-now.ts";

const gone: CommentRuleStarter = { _tag: "gone" };

/**
 * RuleStarters from the workspace context, which resolves a rule's
 * starter as a request of theirs would be resolved now (`ActorsNow`): a
 * member by the id the rule kept, an application by its client id and the
 * member it acts for, a key by its id. A member forgotten since is gone.
 */
export const WorkspaceRuleStarters = Layer.effect(
  RuleStarters,
  Effect.gen(function* WorkspaceRuleStarters() {
    const actors = yield* ActorsNow;

    return RuleStarters.of({
      of: ({ startedBy, startedVia, workspaceId }) => {
        if (startedVia._tag === "apiKey") {
          return actors.ofKey(startedVia.apiKeyId, workspaceId);
        }

        return Option.match(startedBy, {
          onNone: () => Effect.succeed(gone),
          onSome: (userId) =>
            startedVia._tag === "application"
              ? actors.ofApplication(userId, startedVia.clientId, workspaceId)
              : actors.ofMember(userId, workspaceId),
        });
      },
    });
  })
);
