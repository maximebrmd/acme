import { Effect } from "effect";

import { mayAct } from "#publishing/domain/follow-up-rule.ts";
import type { FollowUpRule } from "#publishing/domain/follow-up-rule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";

import type { RuleStarter, StartedIn } from "./recycling-actors.ts";

/** Who a rule's starter is now (`RecyclingActors.of`), and whether the policy holds them (`ApprovalGate.holds`). */
export interface StarterNow {
  readonly holds: (actor: Actor) => Effect.Effect<boolean, DatabaseError>;
  readonly of: (
    started: StartedIn
  ) => Effect.Effect<RuleStarter, DatabaseError>;
}

/**
 * Whether what the rule sends may go out now, as its starter is now: the
 * rule going (neither paused nor ended), its starter still acting, and
 * the rule approved or the starter's posts needing no approval
 * (`mayAct`). Judged again just before each call.
 */
export const actsNow = (rule: FollowUpRule, starters: StarterNow) =>
  Effect.gen(function* judged() {
    if (rule.status._tag !== "active") {
      return false;
    }

    const starter = yield* starters.of(rule);

    return (
      starter._tag === "acting" &&
      mayAct(rule, yield* starters.holds(starter.actor))
    );
  });
