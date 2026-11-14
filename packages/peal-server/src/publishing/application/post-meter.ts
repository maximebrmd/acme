import type { Option } from "effect";
import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { MeterClaim } from "#shared/application/metered-usage.ts";
import type { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

/** A part about to be sent: what a platform that bills per post prices. */
export interface MeteredPart {
  readonly platform: Platform;
  /** The part's text as the channel receives it. */
  readonly text: string;
  readonly workspaceId: WorkspaceId;
}

/**
 * What a part costs the workspace's billing account on a platform that
 * bills the server per post, claimed before it is sent: X, at X's rate
 * for a post, or a post with a link. None on any other platform, and
 * nothing counted on a server that does not bill. A part that never went
 * out is given back.
 */
export class PostMeter extends Context.Service<
  PostMeter,
  {
    readonly claim: (
      part: MeteredPart
    ) => Effect.Effect<
      Option.Option<MeterClaim>,
      AllowanceReached | DatabaseError
    >;
    readonly giveBack: (
      claim: MeterClaim
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/publishing/application/PostMeter") {
  /** Claims nothing: for tests of other things. */
  static readonly unmetered = Layer.succeed(
    PostMeter,
    PostMeter.of({
      claim: () => Effect.succeedNone,
      giveBack: () => Effect.void,
    })
  );
}
