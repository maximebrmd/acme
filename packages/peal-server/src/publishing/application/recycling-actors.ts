import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { Started } from "./started-by.ts";

/**
 * Who a rule's starter is now: acting, with the permissions they hold
 * now; gone (a member removed or banned, a key revoked or expired, an
 * application whose grant was withdrawn, or whoever it was forgotten when
 * they closed their account); or locked out for now by something they can
 * put right, which the rule waits on.
 */
export type RuleStarter =
  | { readonly _tag: "acting"; readonly actor: Actor }
  | { readonly _tag: "gone" }
  | { readonly _tag: "lockedOut" };

/** What acts later as whoever started it, in its workspace. */
export interface StartedIn extends Started {
  readonly workspaceId: WorkspaceId;
}

/**
 * The actor what someone started acts as (a recycling rule's occurrences,
 * a feed's posts): whoever started it, as they are when the post is made,
 * never as they were.
 */
export class RecyclingActors extends Context.Service<
  RecyclingActors,
  {
    readonly of: (
      started: StartedIn
    ) => Effect.Effect<RuleStarter, DatabaseError>;
  }
>()("peal-server/publishing/application/RecyclingActors") {
  /** For tests that make no occurrence: every starter is gone. */
  static readonly none = Layer.succeed(
    RecyclingActors,
    RecyclingActors.of({ of: () => Effect.succeed({ _tag: "gone" }) })
  );
}
