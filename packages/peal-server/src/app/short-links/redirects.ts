import { Effect, Layer, Match, Metric } from "effect";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { RateLimiter } from "effect/persistence";

import {
  addressHeadersConfig,
  addressOf,
} from "#shared/infrastructure/client-address.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import type { Followed } from "#shortlinks/application/short-links.ts";

/** Where short links are followed: the code follows. */
export const shortLinkPath = "/api/l/:code";

/** How many requests each address may send to short links in a minute. */
export const redirectsPerMinute = 300;

/**
 * Short links followed, by outcome: `found`, `unknown`, `disabled`,
 * `limited`. Never a code, a destination or anything of the visitor.
 */
export const shortLinkRedirects = Metric.counter("peal.shortlinks.redirects", {
  description: "Requests to follow a short link, by outcome",
  incremental: true,
});

const counted = (outcome: Followed["_tag"] | "limited") =>
  Metric.update(Metric.withAttributes(shortLinkRedirects, { outcome }), 1);

// A redirect's headers: never cached (RFC 9110, section 15.4.3: a 302 is
// stored only when a header allows it, where a 301 may be stored by
// default, which would hide later visits), never indexed.
const kept = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

const answerOf = (followed: Followed): HttpServerResponse.HttpServerResponse =>
  Match.valueTags(followed, {
    // Its body is the general error of 410, which the answers write.
    disabled: () => HttpServerResponse.empty({ headers: kept, status: 410 }),
    found: ({ destination }) =>
      HttpServerResponse.empty({
        headers: { ...kept, location: destination },
        status: 302,
      }),
    unknown: () => HttpServerResponse.empty({ headers: kept, status: 404 }),
  });

/**
 * `GET /api/l/:code` (and `HEAD`, which counts nothing): a short link's
 * redirect, with no credentials. Found, a 302 to its destination; turned
 * off, 410; unknown, 404, each in the general error envelope.
 * `redirectsPerMinute` per address, counted in this process, bound the
 * guessing of codes (429). The path, with its code, is logged as any
 * path; the destination never is.
 */
export const ShortLinkRedirectsLive = HttpRouter.use(
  Effect.fn(function* redirects(router) {
    const links = yield* ShortLinks;
    const limiter = yield* RateLimiter.make;
    const headers = yield* addressHeadersConfig;

    const follow = Effect.gen(function* follow() {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const { code } = yield* HttpRouter.params;

      const allowed = yield* limiter
        .consume({
          algorithm: "fixed-window",
          key: `short-links:${addressOf(request, headers)}`,
          limit: redirectsPerMinute,
          onExceeded: "fail",
          window: "1 minute",
        })
        .pipe(
          Effect.as(true),
          Effect.catchTag("RateLimiterError", (error) =>
            error.reason._tag === "RateLimitExceeded"
              ? Effect.succeed(false)
              : Effect.die(error)
          )
        );

      if (!allowed) {
        yield* counted("limited");

        return HttpServerResponse.jsonUnsafe(
          { _tag: "TooManyRequests" },
          { headers: { ...kept, "retry-after": "60" }, status: 429 }
        );
      }

      const followed = yield* links
        .follow(code ?? "", {
          method: request.method,
          purpose: request.headers["sec-purpose"] ?? request.headers["purpose"],
          userAgent: request.headers["user-agent"],
        })
        .pipe(Effect.orDie);

      yield* counted(followed._tag);

      return answerOf(followed);
    });

    // The router answers HEAD with this GET route, and a HEAD counts
    // nothing (`isCountedVisit`).
    yield* router.add("GET", shortLinkPath, follow);
  })
).pipe(Layer.provide(RateLimiter.layerStoreMemory));

/**
 * No server span for a short link followed: the HTTP tracer would record
 * the visitor's browser (`user_agent.original`) and address
 * (`client.address`), which the privacy register says Peal never keeps.
 * The redirects are counted in `peal.shortlinks.redirects` instead.
 */
export const ShortLinkRedirectsUntraced = Layer.succeed(
  HttpMiddleware.TracerDisabledWhen
)((request) => request.url.startsWith("/api/l/"));
