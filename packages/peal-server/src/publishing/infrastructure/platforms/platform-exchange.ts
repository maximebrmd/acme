import { Effect, Match, Option } from "effect";
import type { Schema } from "effect";
import type { HttpClientError } from "effect/http";

import { OutcomeUnknown } from "#publishing/application/outcome-unknown.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

/** What can go wrong in an exchange with a platform, short of an answer. */
export type ExchangeError =
  | HttpClientError.HttpClientError
  | OutboundRequestRefused
  | Schema.SchemaError;

// The outbound guard refused the host before anything was sent: for now if
// its name did not resolve, for good if it is not a public HTTPS server.
const refusedHost = (refused: OutboundRequestRefused) =>
  refused.reason === "lookupFailed"
    ? new PlatformUnavailable()
    : new BadRequest({ code: "hostNotAllowed" });

// Peal could not build the request: a bug, never the platform's doing.
const unbuildable = (error: HttpClientError.HttpClientError) =>
  Effect.die(error);

/**
 * A call that changes nothing anyone sees (an upload, a read) got no usable
 * answer: whatever it did does not matter, and it may be made again later.
 */
export const unanswered = (
  error: ExchangeError
): Effect.Effect<never, BadRequest | PlatformUnavailable> =>
  Match.valueTags(error, {
    HttpClientError: (failed) =>
      failed.reason._tag === "EncodeError" ||
      failed.reason._tag === "InvalidUrlError"
        ? unbuildable(failed)
        : Effect.fail(new PlatformUnavailable()),
    OutboundRequestRefused: (refused) => Effect.fail(refusedHost(refused)),
    SchemaError: () => Effect.fail(new PlatformUnavailable()),
  });

/**
 * The call that makes a post live got no usable answer: the request may
 * have reached the platform, which may have made the post. Only a request
 * refused before it was sent is known not to.
 */
export const commitUnanswered = (
  error: ExchangeError
): Effect.Effect<never, BadRequest | OutcomeUnknown | PlatformUnavailable> =>
  Match.valueTags(error, {
    HttpClientError: (failed) => {
      const { reason } = failed;

      if (reason._tag === "EncodeError" || reason._tag === "InvalidUrlError") {
        return unbuildable(failed);
      }

      return Effect.fail(
        new OutcomeUnknown({
          reason:
            reason._tag === "TransportError"
              ? "noResponse"
              : "unreadableResponse",
        })
      );
    },
    OutboundRequestRefused: (refused) => Effect.fail(refusedHost(refused)),
    SchemaError: () =>
      Effect.fail(new OutcomeUnknown({ reason: "unreadableResponse" })),
  });

// A name such as `InvalidRequest` or `validation_failure`.
const identifier = /^[A-Za-z][\w.:-]{0,63}$/u;

/** A reason a platform gave, kept as a code if it is a plain identifier. */
export const codeOf = (reason: Option.Option<string>, fallback: string) =>
  reason.pipe(
    Option.filter((name) => identifier.test(name)),
    Option.getOrElse(() => fallback)
  );
