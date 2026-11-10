import { Effect, Option } from "effect";
import type { Schema } from "effect";
import { HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";

import { ChannelUnreadable } from "#analytics/application/channel-unreadable.ts";
import type { MetricsReadFailure } from "#analytics/application/metrics-reader.ts";
import type { AccountReading } from "#analytics/domain/account-metrics.ts";
import { maxCount } from "#analytics/domain/post-metrics.ts";
import {
  databaseDown,
  needsReconnect,
  unusable,
} from "#analytics/infrastructure/platforms/channel-refusals.ts";
import type { PlatformHttp } from "#analytics/infrastructure/platforms/platform-http.ts";
import type {
  ChannelAccess,
  ChannelAccount,
  ChannelToken,
} from "#channels/application/channel-access.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

// What the platforms' account readers share: one GET and what its answer
// means, and the channel's token around a read.

/** What reads an account: its platform's reader. */
export type AccountReader = (
  account: ChannelAccount
) => Effect.Effect<AccountReading, MetricsReadFailure>;

/** Nothing is read on this kind of account. */
export const unsupported = new ChannelUnreadable({ reason: "unsupported" });

/** The account cannot be read for now: it waits a day. */
export const paused = new ChannelUnreadable({ reason: "paused" });

/**
 * A count as Peal keeps it: whole, never negative, within what a column
 * holds. A platform counts some totals past it (a channel's views), which
 * are not kept.
 */
export const countOf = (value: number | undefined): Option.Option<number> =>
  Option.fromUndefinedOr(value).pipe(
    Option.map((count) => Math.trunc(count)),
    Option.filter((count) => count >= 0 && count <= maxCount)
  );

/**
 * What a GET answered: the body Peal asked for, or the status of a
 * refusal. No answer, an error of the platform's (5xx), a request to slow
 * down (429) or a body Peal cannot read puts the read off:
 * `PlatformUnavailable`.
 */
export type Answer<A> =
  | { readonly _tag: "found"; readonly body: A }
  | {
      readonly _tag: "refused";
      readonly response: HttpClientResponse.HttpClientResponse;
    };

/** Sends `request`, and reads a 200's JSON body with `schema`. */
export const ask = <A, I>(
  http: PlatformHttp,
  request: HttpClientRequest.HttpClientRequest,
  schema: Schema.Codec<A, I>
): Effect.Effect<Answer<A>, PlatformUnavailable> =>
  Effect.gen(function* asking() {
    const sent = yield* http.execute(request).pipe(Effect.result);

    if (sent._tag === "Failure") {
      return yield* new PlatformUnavailable();
    }

    const response = sent.success;

    if (response.status >= 500 || response.status === 429) {
      return yield* new PlatformUnavailable();
    }

    if (response.status !== 200) {
      const refused: Answer<A> = { _tag: "refused", response };

      return refused;
    }

    const body = yield* HttpClientResponse.schemaBodyJson(schema)(
      response
    ).pipe(Effect.option);

    if (Option.isNone(body)) {
      return yield* new PlatformUnavailable();
    }

    const found: Answer<A> = { _tag: "found", body: body.value };

    return found;
  });

/**
 * Runs a read with the channel's token, which the channels context renews
 * once when the read fails with TokenRejected.
 */
export const withChannelToken = (
  access: ChannelAccess["Service"],
  account: ChannelAccount,
  read: (
    token: ChannelToken
  ) => Effect.Effect<AccountReading, MetricsReadFailure | TokenRejected>
): Effect.Effect<AccountReading, MetricsReadFailure> =>
  access.withToken(account.channelId, read).pipe(
    Effect.catchTags({
      ChannelUnusable: unusable,
      DatabaseError: databaseDown,
      TokenExpired: needsReconnect,
    })
  );
