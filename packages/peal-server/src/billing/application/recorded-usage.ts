import { Context, Effect, Layer } from "effect";
import type { DateTime } from "effect";

import { usageDayOf } from "#billing/domain/usage-meter.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { UsageLedger } from "./ports/usage-ledger.ts";

/** A post that went out on one of a workspace's channels. */
export interface PostWentOut {
  readonly platform: Platform;
  /** When it went out: its first part, for a thread. */
  readonly publishedAt: DateTime.Utc;
  readonly workspaceId: WorkspaceId;
}

/**
 * Counts what the other contexts tell billing of as it happens, in the
 * usage ledger (see `usage-meter.ts`): each post that went out, on any
 * platform, one per channel, on the day (UTC) it went out. Called in the
 * transaction of the fact it counts, so both commit or neither. On a
 * server that does not bill too: counts limit and price nothing.
 */
export class RecordedUsage extends Context.Service<
  RecordedUsage,
  {
    readonly postWentOut: (
      post: PostWentOut
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/RecordedUsage") {
  static readonly layer = Layer.effect(
    RecordedUsage,
    Effect.gen(function* RecordedUsageLive() {
      const ledger = yield* UsageLedger;

      return RecordedUsage.of({
        postWentOut: ({ platform, publishedAt, workspaceId }) =>
          ledger
            .add({
              record: {
                day: usageDayOf(publishedAt),
                dimension: platform,
                meter: "publishedPosts",
                quantity: 1,
              },
              workspaceId,
            })
            .pipe(Effect.withSpan("RecordedUsage.postWentOut")),
      });
    })
  );
}
