import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";

/**
 * How many requests each workspace sent its own text provider each UTC
 * day: a bound, not a price, which nobody reads but the assistant and the
 * workspace's export. A database failure is a defect.
 */
export class OwnTextCounts extends Context.Service<
  OwnTextCounts,
  {
    /**
     * Counts one request for the day, in one conditional upsert, unless
     * the day already holds `dailyLimit`: the day's count, or none.
     */
    readonly claim: (
      workspaceId: WorkspaceId,
      day: LocalDate,
      dailyLimit: number
    ) => Effect.Effect<Option.Option<number>>;
  }
>()("peal-server/assistant/application/OwnTextCounts") {}
