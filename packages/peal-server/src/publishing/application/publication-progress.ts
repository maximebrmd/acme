import { Context } from "effect";
import type { Effect, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * What the journal holds of how far an attempt's call got:
 *
 * - `unknownCall`: no call was begun under this key. A run resuming an
 *   attempt whose call an earlier run began under another key (as after a
 *   change to how keys are made) cannot tell how far that one got.
 * - `begun`: the call was begun under this key, with what its adapter last
 *   recorded, none if nothing yet.
 */
export type CallProgress =
  | { readonly _tag: "unknownCall" }
  | {
      readonly _tag: "begun";
      readonly recorded: Option.Option<Schema.Json>;
    };

/**
 * Where an adapter whose publish takes several calls notes how far it got,
 * on the journal row of the attempt's call (`idempotencyKey`), so a run
 * that resumes it carries on instead of sending again: TikTok's
 * `publish_id`, or that the request that makes the post live is about to
 * go. Ids and states the platform gave only, never content.
 *
 * `record` commits before it returns: an adapter records a step before the
 * request it stands for, and a resumed run trusts that a step not recorded
 * was never sent.
 */
export class PublicationProgress extends Context.Service<
  PublicationProgress,
  {
    /**
     * Replaces what the call recorded. The journal began the call before
     * the adapter ran, so a key it does not know is a defect.
     */
    readonly record: (
      idempotencyKey: string,
      progress: Schema.Json
    ) => Effect.Effect<void, DatabaseError>;
    readonly read: (
      idempotencyKey: string
    ) => Effect.Effect<CallProgress, DatabaseError>;
  }
>()("acme-server/publishing/application/PublicationProgress") {}
