import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * One attempt at a time sends an article to a site, across every process:
 * an attempt whose answer was lost looks for its post among the site's,
 * and would take another article's for its own were that one's attempt
 * still on its way. Each attempt records the post it made before its turn
 * ends. `inTurn` never waits: it answers none when the turn is taken,
 * when the process holds as many as it may, or when the database cannot
 * be asked, and the attempt asks again a few seconds later, holding
 * nothing meanwhile (`articleAttemptRun`).
 */
export class ArticleSendTurns extends Context.Service<
  ArticleSendTurns,
  {
    readonly inTurn: <A, E, R>(
      channelId: ChannelId,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<Option.Option<A>, DatabaseError | E, R>;
  }
>()("peal-server/publishing/application/ArticleSendTurns") {}
